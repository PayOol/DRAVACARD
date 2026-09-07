import assert from "node:assert/strict";
import { it } from "node:test";
import { buildSoleasPayCheckoutRequest } from "../src/soleaspay-checkout.ts";
import { providerAvailable, verifyProviderPayment } from "../src/providers.ts";
import worker from "../src/index.ts";
import { setup, CUSTOMER, ORIGIN } from "./payment-fixtures.mjs";

const env = { SOLEASPAY_API_KEY: "test-only-key" };
const intent = {
  amount: 25000, currency: "XAF", orderId: "DRAVA-TT-test",
  description: "Pièces TikTok", customer: { name: "Client", email: "test@example.com", whatsapp: "+237699000000" },
  returnUrl: "https://drava.click/tiktok-success#order=test",
  cancelUrl: "https://drava.click/tiktok-failure#order=test", metadata: { service: "tiktok" },
};
function request(path, body) {
  return new Request(`https://worker.example${path}`, { method: "POST", headers: {
    Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.24", "Content-Type": "application/json",
  }, body: JSON.stringify(body) });
}

for (const service of ["cards", "tiktok"]) {
  it(`${service}: automatic Checkout return, matching, persistence and replay without a gateway call`, async (t) => {
    const state = setup(t);
    const created = await worker.fetch(request("/api/checkout", {
      service, productId: service === "cards" ? "visa-basic" : "boost",
      provider: "soleaspay", consent: true,
      customer: service === "cards" ? { email: CUSTOMER.email, whatsapp: CUSTOMER.whatsapp } : CUSTOMER,
    }), state.env);
    assert.equal(created.status, 201);
    const checkout = await created.json();
    assert.equal(checkout.checkoutUrl, undefined);
    assert.equal(checkout.checkoutForm.action, "https://pay.soleaspay.com");
    const fields = checkout.checkoutForm.fields;
    assert.equal(fields.apiKey, state.env.SOLEASPAY_API_KEY);
    assert.equal(fields.currency, service === "cards" ? "XOF" : "XAF");
    assert.equal(fields.amount, String(checkout.amount));
    assert.equal(new URL(fields.successUrl).hash, `#order=${checkout.orderToken}`);
    assert.equal(state.calls.length, 0);
    const check = async (providerReturn) => worker.fetch(request("/api/orders/status", {
      orderToken: checkout.orderToken, ...(providerReturn === undefined ? {} : { providerReturn }),
    }), state.env);
    assert.equal((await (await check()).json()).verified, false);
    const result = { transaction_reference: "TRX-test", reference: "TRX-test", invoice_reference: fields.orderId,
      status: "SUCCESS", success: true, operation: "COLLECTION", amount: checkout.amount, currency: fields.currency };
    for (const change of [{ amount: 1 }, { currency: "USD" }, { invoice_reference: "another" }, { success: false }, { operation: "DISBURSEMENT" }, { reference: "other" }]) {
      assert.equal((await check({ ...result, ...change })).status, 400);
    }
    const paid = await (await check(result)).json();
    assert.equal(paid.status, "paid");
    assert.equal(paid.verified, true);
    assert.equal(paid.transactionReference, "TRX-test");
    for (const data of [result, undefined]) assert.equal((await (await check(data)).json()).status, "paid");
    assert.equal((await check({ ...result, transaction_reference: "TRX-other", reference: "TRX-other" })).status, 409);
    assert.ok(state.calls.every(({ url }) => url === "https://api.emailjs.com/api/v1.0/email/send"));
    assert.equal(state.calls.length, 1, "sequential replay must not resend fulfillment");
    const records = [...state.values.values()].join(" ");
    assert.ok(!records.includes(state.env.SOLEASPAY_API_KEY));
    const key = [...state.values.keys()].find(key => /order:[a-f0-9]{64}$/.test(key));
    const stored = JSON.parse(state.values.get(key));
    stored.createdAt -= 8 * 86400000; stored.expiresAt -= 8 * 86400000;
    state.values.set(key, JSON.stringify(stored));
    assert.equal((await check(result)).status, 404);
  });
}

it("the adapter accepts COMPLETED, keeps absent returns pending and does not call an invented status API", async () => {
  assert.equal(providerAvailable(env, "soleaspay"), true);
  assert.equal(providerAvailable({}, "soleaspay"), false);
  const order = { provider: "soleaspay", providerId: intent.orderId, orderId: intent.orderId, providerAmount: 25000, providerCurrency: "XAF" };
  assert.equal(await verifyProviderPayment(env, order), "pending");
  const checkoutReturn = { transaction_reference: "TRX-test", invoice_reference: intent.orderId, amount: 25000, currency: "XAF", status: "COMPLETED" };
  assert.equal(await verifyProviderPayment(env, { ...order, checkoutReturn }), "paid");
  assert.equal(await verifyProviderPayment(env, { ...order, checkoutReturn: { ...checkoutReturn, status: "FAILED", success: false } }), "failed");
});

it("builds the documented server POST for both product currencies without leaking extra customer fields", () => {
  for (const currency of ["XAF", "XOF"]) {
    const request = buildSoleasPayCheckoutRequest(env, { ...intent, currency });
    assert.equal(request.url, "https://pay.soleaspay.com");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.redirect, "manual");
    assert.equal(request.init.cache, "no-store");
    assert.deepEqual(JSON.parse(request.init.body), {
      apiKey: env.SOLEASPAY_API_KEY, amount: 25000, currency,
      orderId: intent.orderId, description: intent.description, shopName: "DRAVA",
      successUrl: intent.returnUrl, failureUrl: intent.cancelUrl,
      customer: { name: "Client", email: "test@example.com" },
    });
  }
});

it("supports only canonical fee bearers and rejects invalid server amounts or missing credentials", () => {
  for (const feeBearer of ["CUSTOMER", "MERCHANT"])
    assert.equal(JSON.parse(buildSoleasPayCheckoutRequest(env, intent, feeBearer).init.body).feeBearer, feeBearer);
  assert.throws(() => buildSoleasPayCheckoutRequest(env, intent, true));
  for (const amount of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => buildSoleasPayCheckoutRequest(env, { ...intent, amount }));
  assert.throws(() => buildSoleasPayCheckoutRequest({}, intent));
});


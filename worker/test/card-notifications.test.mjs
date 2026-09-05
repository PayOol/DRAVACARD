import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../src/index.ts";
import { ORIGIN, setup } from "./payment-fixtures.mjs";

const RAW_CUSTOMER = {
  email: " Buyer.Card+order@Example.org ",
  whatsapp: "+237 (699) 123-456",
};
const NORMALIZED_CUSTOMER = {
  email: "Buyer.Card+order@Example.org",
  whatsapp: "+237699123456",
};
const PRODUCTS = {
  "visa-basic": { amount: 100, name: "VISA BASIQUE" },
  "mastercard-basic": { amount: 6000, name: "MASTERCARD BASIQUE" },
  "mastercard-premium": { amount: 8500, name: "MASTERCARD PREMIUM" },
  "mastercard-platinum": { amount: 15000, name: "MASTERCARD PLATINIUM" },
};

function request(path, body) {
  return new Request(`https://worker.example${path}`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "CF-Connecting-IP": "203.0.113.44",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function create(state, productId, customer = RAW_CUSTOMER, legacy = false) {
  const body = legacy
    ? { productId, customer }
    : { service: "cards", productId, provider: "leekpay", consent: true, customer };
  const response = await worker.fetch(request("/api/checkout", body), state.env);
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}

async function status(state, orderToken) {
  const response = await worker.fetch(
    request("/api/orders/status", { orderToken }),
    state.env,
  );
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}

function emailCalls(state) {
  return state.calls.filter((call) => call.url.includes("emailjs"));
}

function orderEntry(state) {
  return Array.from(state.values.entries()).find(([key]) =>
    /^order:[a-f0-9]{64}$/.test(key),
  );
}

describe("card merchant notifications (all external calls mocked)", () => {
  it("maps every canonical card and normalized contact into the shared EmailJS template", async (t) => {
    const state = setup(t);
    for (const [productId, product] of Object.entries(PRODUCTS)) {
      const created = await create(state, productId);
      const [storageKey, serializedOrder] = Array.from(state.values.entries())
        .filter(([key]) => /^order:[a-f0-9]{64}$/.test(key))
        .at(-1);
      const storedOrder = JSON.parse(serializedOrder);
      const customerEnvelope = state.values.get(`${storageKey}:customer`);
      assert.match(customerEnvelope, /^[a-f0-9]{24}:[a-f0-9]+$/);
      assert.ok(!customerEnvelope.includes(NORMALIZED_CUSTOMER.email));
      assert.ok(!customerEnvelope.includes(NORMALIZED_CUSTOMER.whatsapp));

      const paid = await status(state, created.orderToken);
      assert.equal(paid.verified, true);
      assert.equal(paid.notification, "sent");
      const payload = JSON.parse(emailCalls(state).at(-1).init.body);
      assert.deepEqual(payload.template_params, {
        service_type: "Carte virtuelle",
        order_id: storedOrder.orderId,
        client_email: NORMALIZED_CUSTOMER.email,
        client_whatsapp: NORMALIZED_CUSTOMER.whatsapp,
        price: new Intl.NumberFormat("fr-FR").format(product.amount),
        date: new Date(storedOrder.createdAt).toISOString(),
        card_name: product.name,
      });
      for (const field of ["coins_amount", "tiktok_username", "tiktok_password"])
        assert.ok(!Object.hasOwn(payload.template_params, field));
      assert.equal(state.values.has(`${storageKey}:customer`), false);
      assert.equal(state.values.get(`${storageKey}:notified`), "sent");
    }
    assert.equal(emailCalls(state).length, 4);
  });

  it("mails only verified paid orders and erases contacts after terminal failure", async (t) => {
    const state = setup(t);
    const pendingOrder = await create(state, "visa-basic");
    const pendingId = Array.from(state.transactions.keys()).at(-1);
    state.transactions.get(pendingId).status = "pending";
    const pending = await status(state, pendingOrder.orderToken);
    assert.equal(pending.verified, false);
    assert.ok(!Object.hasOwn(pending, "notification"));
    assert.equal(emailCalls(state).length, 0);

    const failedOrder = await create(state, "mastercard-basic");
    const [failedKey] = Array.from(state.values.entries())
      .filter(([key]) => /^order:[a-f0-9]{64}$/.test(key))
      .at(-1);
    state.transactions.get(Array.from(state.transactions.keys()).at(-1)).status = "failed";
    const failed = await status(state, failedOrder.orderToken);
    assert.equal(failed.verified, false);
    assert.equal(failed.status, "failed");
    assert.ok(!Object.hasOwn(failed, "notification"));
    assert.equal(state.values.has(`${failedKey}:customer`), false);
    assert.equal(emailCalls(state).length, 0);
  });

  it("preserves paid truth through an EmailJS outage, retries, then avoids a sequential duplicate", async (t) => {
    let rejectMail = true;
    const state = setup(t, (url) =>
      url.includes("emailjs") && rejectMail
        ? new Response("temporarily unavailable", { status: 503 })
        : undefined,
    );
    const created = await create(state, "mastercard-premium");
    const [storageKey] = orderEntry(state);
    const first = await status(state, created.orderToken);
    assert.equal(first.status, "paid");
    assert.equal(first.verified, true);
    assert.equal(first.notification, "pending");
    assert.equal(state.values.has(`${storageKey}:customer`), true);
    assert.equal(emailCalls(state).length, 1);

    rejectMail = false;
    const retried = await status(state, created.orderToken);
    assert.equal(retried.verified, true);
    assert.equal(retried.notification, "sent");
    assert.equal(state.values.has(`${storageKey}:customer`), false);
    assert.equal(emailCalls(state).length, 2);

    const reopened = await status(state, created.orderToken);
    assert.equal(reopened.notification, "sent");
    assert.equal(emailCalls(state).length, 2);
  });

  it("authenticates each card envelope to its stable order key and supports legacy creation", async (t) => {
    t.mock.method(console, "error", () => {});
    const state = setup(t);
    const first = await create(state, "visa-basic");
    const [firstKey] = orderEntry(state);
    const firstEnvelope = state.values.get(`${firstKey}:customer`);
    const second = await create(state, "mastercard-basic", {
      email: "second@example.com",
      whatsapp: "+33698765432",
    });
    const [secondKey] = Array.from(state.values.entries())
      .filter(([key]) => /^order:[a-f0-9]{64}$/.test(key))
      .at(-1);
    const secondEnvelope = state.values.get(`${secondKey}:customer`);
    state.values.set(`${firstKey}:customer`, secondEnvelope);
    state.values.set(`${secondKey}:customer`, firstEnvelope);
    for (const created of [first, second]) {
      const paid = await status(state, created.orderToken);
      assert.equal(paid.verified, true);
      assert.equal(paid.notification, "pending");
    }
    assert.equal(emailCalls(state).length, 0);

    const legacyState = setup(t);
    const legacy = await create(legacyState, "mastercard-platinum", RAW_CUSTOMER, true);
    const [legacyKey] = orderEntry(legacyState);
    const paidLegacy = await status(legacyState, legacy.orderToken);
    assert.equal(paidLegacy.orderId, "checkout_1");
    assert.equal(paidLegacy.notification, "sent");
    assert.equal(
      JSON.parse(emailCalls(legacyState)[0].init.body).template_params.order_id,
      "checkout_1",
    );
    assert.equal(legacyState.values.has(`${legacyKey}:customer`), false);
  });

  it("does not invent notification data for historical paid cards without contacts", async (t) => {
    const state = setup(t);
    const createdAt = Date.now();
    const orderToken = "b".repeat(64);
    const hash = Buffer.from(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(orderToken)),
    ).toString("hex");
    state.values.set(
      `order:${hash}`,
      JSON.stringify({
        version: 1,
        productId: "visa-basic",
        amount: 5000,
        currency: "XOF",
        checkoutId: "checkout_legacy",
        createdAt,
        expiresAt: createdAt + 604800000,
      }),
    );
    state.transactions.set("checkout_legacy", {
      id: "checkout_legacy",
      amount: 5000,
      currency: "XOF",
      status: "paid",
    });
    const result = await status(state, orderToken);
    assert.equal(result.verified, true);
    assert.ok(!Object.hasOwn(result, "notification"));
    assert.equal(emailCalls(state).length, 0);
  });
});

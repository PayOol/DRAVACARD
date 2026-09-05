import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../src/index.ts";

import { ORIGIN, CUSTOMER, SELECTION, COUNTRY, request, setup } from "./payment-fixtures.mjs";

async function create(state, payload = SELECTION) {
  const response = await worker.fetch(request("checkout", payload), state.env);
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}

async function readStatus(state, orderToken) {
  return worker.fetch(request("orders/status", { orderToken }), state.env);
}

function storedRecord(state) {
  const entry = Array.from(state.values).find(([key]) => /^tiktok:order:[a-f0-9]{64}$/.test(key));
  assert.ok(entry);
  return { storageKey: entry[0], order: JSON.parse(entry[1]) };
}

async function decryptReceipt(state, storageKey, orderId) {
  const envelope = state.values.get(`${storageKey}:receipt`);
  assert.match(envelope, /^[a-f0-9]{24}:[a-f0-9]+$/);
  const [iv, ciphertext] = envelope.split(":").map((value) => Buffer.from(value, "hex"));
  const key = await crypto.subtle.importKey("raw", Buffer.from(state.env.TIKTOK_DATA_KEY, "hex"), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`receipt:${orderId}`) }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

describe("TikTok orders (isolated KV namespace; all external calls mocked)", () => {
  it("uses all six canonical packs and custom formula; stores only encrypted customer data", async (t) => {
    const state = setup(t);
    const packs = [
      ["mini", 100, 0, 1124], ["starter", 350, 0, 3900], ["boost", 700, 70, 7900],
      ["live", 1400, 140, 15700], ["creator", 3500, 350, 39300], ["max", 7000, 700, 78700],
      ["custom", 71, 0, Math.round(71 * 11.24)], ["custom", 1_000_000, 0, 11_240_000],
    ];
    for (const [packId, coins, bonus, amount] of packs) {
      const result = await create(state, { ...SELECTION, packId, ...(packId === "custom" ? { customCoins: coins } : {}) });
      assert.match(result.orderToken, /^[a-f0-9]{64}$/);
      assert.ok(!Object.hasOwn(result, "username"));
      assert.ok(!Object.hasOwn(result, "transactionReference"));
      assert.deepEqual([result.coins, result.bonus, result.amount], [coins, bonus, amount]);
      const call = state.calls.at(-1);
      const body = JSON.parse(call.init.body);
      assert.equal(body.amount, amount);
      assert.equal(body.currency, "XOF");
      assert.equal(body.return_url, `${ORIGIN}/tiktok-payment/#order=${result.orderToken}`);
      assert.equal(body.customer_name, "test.creator");
      assert.ok(!call.init.body.includes(CUSTOMER.password));
      for (const [key, value] of state.values) {
        assert.ok(key.startsWith("tiktok:order:"));
        assert.ok(!key.includes(result.orderToken));
        for (const secret of [CUSTOMER.password, CUSTOMER.email, CUSTOMER.whatsapp, CUSTOMER.username, state.env.TIKTOK_DATA_KEY]) assert.ok(!value.includes(secret));
      }
    }
  });

  it("rejects price tampering, arbitrary URLs, consent bypass, invalid quantities and credentials before any provider call", async (t) => {
    const state = setup(t);
    const invalid = [
      { ...SELECTION, amount: 1 }, { ...SELECTION, returnUrl: "https://evil.example" },
      { ...SELECTION, packId: "constructor" }, { ...SELECTION, customCoins: 10 },
      { ...SELECTION, packId: "custom", customCoins: 69 }, { ...SELECTION, packId: "custom", customCoins: 1_000_001 },
      { ...SELECTION, packId: "custom", customCoins: 70.1 }, { ...SELECTION, consent: false },
      { ...SELECTION, customer: { ...CUSTOMER, password: "abc" } },
      { ...SELECTION, customer: { ...CUSTOMER, username: "a" } },
      { ...SELECTION, customer: { ...CUSTOMER, email: "foo\r\nbcc@evil.example" } },
      { ...SELECTION, customer: { ...CUSTOMER, whatsapp: "699000000" } },
      { ...SELECTION, customer: { ...CUSTOMER, extra: "not allowed" } },
    ];
    for (const payload of invalid) assert.equal((await worker.fetch(request("checkout", payload), state.env)).status, 400);
    assert.equal(state.calls.length, 0);
    assert.equal(state.values.size, 0);
  });

  it("reveals only availability, fails closed without delivery configuration and keeps card checkout working", async (t) => {
    const state = setup(t);
    delete state.env.TIKTOK_DATA_KEY;
    const response = await worker.fetch(request("providers"), state.env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { providers: ["leekpay", "soleaspay", "sebpay"].map((id) => ({ id, available: id !== "soleaspay" })) });
    assert.equal((await worker.fetch(request("checkout", SELECTION), state.env)).status, 503);
    const card = new Request("https://worker.example/api/checkout", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.24" }, body: JSON.stringify({ productId: "visa-basic", customer: { email: CUSTOMER.email, whatsapp: CUSTOMER.whatsapp } }) });
    assert.equal((await worker.fetch(card, state.env)).status, 201);
  });

  it("checks server status before sending the source notification, then erases encrypted credentials", async (t) => {
    const state = setup(t);
    const order = await create(state);
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    const response = await readStatus(state, order.orderToken);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.verified, true);
    assert.equal(result.status, "paid");
    assert.equal(result.notification, "sent");
    assert.equal(result.username, "test.creator");
    assert.equal(result.transactionReference, "checkout_1");
    const email = state.calls.find((call) => call.url.includes("emailjs"));
    const body = JSON.parse(email.init.body);
    assert.equal(body.template_params.tiktok_password, CUSTOMER.password);
    assert.equal(body.template_params.coins_amount, "770");
    assert.equal(body.template_params.client_email, CUSTOMER.email);
    assert.ok(!JSON.stringify(result).includes(CUSTOMER.password));
    assert.ok(!JSON.stringify(result).includes(CUSTOMER.email));
    assert.ok(!Array.from(state.values.keys()).some((key) => key.endsWith(":customer")));
    await readStatus(state, order.orderToken);
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 1);
  });

  it("keeps only an authenticated encrypted account label after notification, with the original seven-day expiry", async (t) => {
    const state = setup(t);
    const created = await create(state);
    const { storageKey, order } = storedRecord(state);
    const receiptKey = `${storageKey}:receipt`;
    const encryptedReceipt = state.values.get(receiptKey);
    assert.notEqual(encryptedReceipt, state.values.get(`${storageKey}:customer`));
    assert.deepEqual(await decryptReceipt(state, storageKey, order.orderId), { username: "test.creator" });
    assert.equal(state.writes.find((write) => write.key === receiptKey).options.expiration, Math.floor(order.expiresAt / 1000));
    assert.equal(order.expiresAt - order.createdAt, 7 * 24 * 60 * 60 * 1000);
    await readStatus(state, created.orderToken);
    assert.ok(!state.values.has(`${storageKey}:customer`));
    assert.equal(state.values.get(receiptKey), encryptedReceipt);
    const reopened = await (await readStatus(state, created.orderToken)).json();
    assert.equal(reopened.username, "test.creator");
    assert.equal(reopened.transactionReference, order.providerId);
    assert.deepEqual(await decryptReceipt(state, storageKey, order.orderId), { username: "test.creator" });
    for (const sensitive of ["test.creator", CUSTOMER.password, CUSTOMER.email, CUSTOMER.whatsapp]) {
      assert.ok(!Array.from(state.values.values()).join().includes(sensitive));
    }
  });

  it("backfills old receipts before deleting credentials and still accepts old orders without any remaining account label", async (t) => {
    const state = setup(t);
    const created = await create(state);
    const { storageKey, order } = storedRecord(state);
    state.values.delete(`${storageKey}:receipt`);
    const result = await (await readStatus(state, created.orderToken)).json();
    assert.equal(result.username, "test.creator");
    assert.equal(result.notification, "sent");
    assert.deepEqual(await decryptReceipt(state, storageKey, order.orderId), { username: "test.creator" });
    const receiptWrites = state.writes.filter((write) => write.key === `${storageKey}:receipt`);
    assert.equal(receiptWrites.length, 2);
    assert.equal(receiptWrites[0].options.expiration, receiptWrites[1].options.expiration);
    state.values.delete(`${storageKey}:receipt`);
    const oldCompleted = await (await readStatus(state, created.orderToken)).json();
    assert.equal(oldCompleted.verified, true);
    assert.equal(oldCompleted.notification, "sent");
    assert.equal(oldCompleted.transactionReference, order.providerId);
    assert.ok(!Object.hasOwn(oldCompleted, "username"));
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 1);
  });

  it("does not reveal or mail an account from another order or from a fulfillment envelope substituted for a receipt", async (t) => {
    const state = setup(t);
    const logs = t.mock.method(console, "error", () => {});
    const first = await create(state);
    const { storageKey } = storedRecord(state);
    await create(state, { ...SELECTION, customer: { ...CUSTOMER, username: "other.creator" } });
    const otherReceipt = Array.from(state.values).find(([key]) => key.endsWith(":receipt") && key !== `${storageKey}:receipt`)[1];
    for (const substituted of [otherReceipt, state.values.get(`${storageKey}:customer`)]) {
      state.values.set(`${storageKey}:receipt`, substituted);
      const result = await (await readStatus(state, first.orderToken)).json();
      assert.equal(result.verified, true);
      assert.equal(result.notification, "pending");
      assert.ok(!Object.hasOwn(result, "username"));
      assert.equal(result.transactionReference, "checkout_1");
    }
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    assert.ok(!JSON.stringify(logs.mock.calls).includes(CUSTOMER.password));
  });

  it("preserves verified payment through each auxiliary KV read failure and recovers on the next status request", async (t) => {
    t.mock.method(console, "error", () => {});
    for (const suffix of [":receipt", ":notified", ":customer"]) {
      const state = setup(t);
      const created = await create(state);
      const originalGet = state.env.ORDERS.get;
      let fail = true;
      state.env.ORDERS.get = async (key, format) => {
        if (fail && key.endsWith(suffix)) { fail = false; throw new Error("Simulated KV outage"); }
        return originalGet(key, format);
      };
      const first = await (await readStatus(state, created.orderToken)).json();
      assert.equal(first.status, "paid");
      assert.equal(first.verified, true);
      assert.equal(first.notification, "pending");
      assert.equal(first.transactionReference, "checkout_1");
      assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
      assert.equal((await (await readStatus(state, created.orderToken)).json()).notification, "sent");
    }
  });

  it("retries cleanup after an accepted notification without sending a second email", async (t) => {
    const state = setup(t);
    t.mock.method(console, "error", () => {});
    const created = await create(state);
    const { storageKey } = storedRecord(state);
    const originalDelete = state.env.ORDERS.delete;
    let fail = true;
    state.env.ORDERS.delete = async (key) => {
      if (fail && key.endsWith(":customer")) { fail = false; throw new Error("Simulated cleanup outage"); }
      return originalDelete(key);
    };
    const first = await (await readStatus(state, created.orderToken)).json();
    assert.equal(first.verified, true);
    assert.equal(first.notification, "pending");
    assert.equal(state.values.get(`${storageKey}:notified`), "sent");
    assert.ok(state.values.has(`${storageKey}:customer`));
    const retried = await (await readStatus(state, created.orderToken)).json();
    assert.equal(retried.notification, "sent");
    assert.equal(retried.username, "test.creator");
    assert.ok(!state.values.has(`${storageKey}:customer`));
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 1);
  });

  it("defers notification if a legacy receipt cannot be saved, preserving the credentials for a later retry", async (t) => {
    const state = setup(t);
    t.mock.method(console, "error", () => {});
    const created = await create(state);
    const { storageKey } = storedRecord(state);
    state.values.delete(`${storageKey}:receipt`);
    const originalPut = state.env.ORDERS.put;
    let fail = true;
    state.env.ORDERS.put = async (key, value, options) => {
      if (fail && key.endsWith(":receipt")) { fail = false; throw new Error("Simulated write outage"); }
      return originalPut(key, value, options);
    };
    const first = await (await readStatus(state, created.orderToken)).json();
    assert.equal(first.verified, true);
    assert.equal(first.notification, "pending");
    assert.ok(state.values.has(`${storageKey}:customer`));
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    assert.equal((await (await readStatus(state, created.orderToken)).json()).notification, "sent");
  });

  it("keeps old payment verification available when mail or encryption configuration is missing", async (t) => {
    t.mock.method(console, "error", () => {});
    for (const name of ["EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY", "TIKTOK_DATA_KEY"]) {
      const state = setup(t);
      const created = await create(state);
      delete state.env[name];
      assert.equal((await worker.fetch(request("checkout", SELECTION), state.env)).status, 503);
      const result = await (await readStatus(state, created.orderToken)).json();
      assert.equal(result.status, "paid");
      assert.equal(result.verified, true);
      assert.equal(result.notification, "pending");
      assert.equal(result.transactionReference, "checkout_1");
      assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    }
  });

  it("accepts the source's public EmailJS configuration without a private key, but rejects a malformed supplied private key", async (t) => {
    const state = setup(t);
    delete state.env.EMAILJS_PRIVATE_KEY;
    const created = await create(state);
    assert.equal((await (await readStatus(state, created.orderToken)).json()).notification, "sent");
    const payload = JSON.parse(state.calls.find((call) => call.url.includes("emailjs")).init.body);
    assert.ok(!Object.hasOwn(payload, "accessToken"));
    assert.equal(payload.service_id, state.env.EMAILJS_SERVICE_ID);
    assert.equal(payload.template_id, state.env.EMAILJS_TEMPLATE_ID);
    assert.equal(payload.user_id, state.env.EMAILJS_PUBLIC_KEY);
    for (const invalid of ["", "short", "invalid key", 12]) {
      state.env.EMAILJS_PRIVATE_KEY = invalid;
      assert.equal((await worker.fetch(request("checkout", SELECTION), state.env)).status, 503);
    }
  });

  it("never trusts return data or mismatched upstream payment identity, amount, currency or status", async (t) => {
    const state = setup(t);
    for (const change of [{ id: "checkout_other" }, { amount: 1 }, { currency: "USD" }, { status: "success" }]) {
      const order = await create(state);
      const id = Array.from(state.transactions.keys()).at(-1);
      Object.assign(state.transactions.get(id), change);
      assert.equal((await readStatus(state, order.orderToken)).status, 502);
    }
    const order = await create(state);
    assert.equal((await worker.fetch(request("orders/status", { orderToken: order.orderToken, status: "paid" }), state.env)).status, 400);
    assert.equal((await worker.fetch(request(`orders/status?orderToken=${order.orderToken}`), state.env)).status, 404);
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
  });

  it("retains payment truth and encrypted delivery data after mail outage; retry succeeds", async (t) => {
    let fail = true;
    const state = setup(t, (url) => url.includes("emailjs") && fail ? new Response("Service down", { status: 503 }) : undefined);
    const order = await create(state);
    const first = await (await readStatus(state, order.orderToken)).json();
    assert.equal(first.verified, true);
    assert.equal(first.notification, "pending");
    assert.ok(Array.from(state.values.keys()).some((key) => key.endsWith(":customer")));
    fail = false;
    assert.equal((await (await readStatus(state, order.orderToken)).json()).notification, "sent");
  });

  it("exposes only active SebPay countries/operators and quotes exact OTP/non-OTP fee handling", async (t) => {
    const state = setup(t);
    const list = await (await worker.fetch(request("sebpay/countries"), state.env)).json();
    assert.equal(list.countries[0].operators.length, 2);
    const regular = await (await worker.fetch(request("sebpay/quote", { packId: "boost", country: "CM", operator: "mtn" }), state.env)).json();
    assert.deepEqual(regular, { amount: 7900, fee: 201, total: 8101, currency: "XAF", collectionAmount: 7900, otpRequired: false, ussdCode: null });
    const otp = await (await worker.fetch(request("sebpay/quote", { packId: "boost", country: "CM", operator: "orange" }), state.env)).json();
    assert.equal(otp.collectionAmount, 8101);
    assert.equal(otp.ussdCode, "#144*8101#");
    const requestPayload = { ...SELECTION, provider: "sebpay", payment: { country: "CM", operator: "orange", phone: "237699000000" } };
    assert.equal((await worker.fetch(request("checkout", requestPayload), state.env)).status, 400);
    assert.equal(state.values.size, 0);
    const order = await create(state, { ...requestPayload, payment: { ...requestPayload.payment, otpCode: "123456" } });
    assert.equal(order.providerLink, "https://wave.example/validate");
    const call = state.calls.find((call) => call.url.endsWith("/collections"));
    assert.equal(JSON.parse(call.init.body).amount, 8101);
    assert.equal(JSON.parse(call.init.body).otp_code, "123456");
    assert.equal(call.init.headers["X-Secret-Key"], state.env.SEBPAY_SECRET_KEY);
    assert.ok(!Array.from(state.values.values()).join().includes("123456"));
    assert.equal((await (await readStatus(state, order.orderToken)).json()).verified, true);
  });

  it("matches source currency conversion and 5.5% fallback without accepting client exchange rates", async (t) => {
    const state = setup(t, (url) => {
      if (url.endsWith("/p/countries")) return Response.json({ data: [{ ...COUNTRY, currency: { code: "USD", exchange_rate: 600, is_active: true } }] });
      if (url.includes("calculate-fee")) return new Response("down", { status: 502 });
    });
    const result = await (await worker.fetch(request("sebpay/quote", { packId: "boost", country: "CM", operator: "mtn" }), state.env)).json();
    assert.deepEqual(result, { amount: 14, fee: 1, total: 15, currency: "USD", collectionAmount: 14, otpRequired: false, ussdCode: null });
    assert.equal((await worker.fetch(request("sebpay/quote", { packId: "boost", country: "CM", operator: "mtn", exchangeRate: 9999 }), state.env)).status, 400);
  });

  it("keeps pending, failed, cancelled and expired distinct from verified payment and erases failed credentials", async (t) => {
    const state = setup(t);
    for (const status of ["pending", "processing", "failed", "cancelled", "expired"]) {
      const order = await create(state);
      state.transactions.get(Array.from(state.transactions.keys()).at(-1)).status = status;
      const result = await (await readStatus(state, order.orderToken)).json();
      assert.equal(result.status, status);
      assert.equal(result.verified, false);
      assert.ok(!Object.hasOwn(result, "username"));
      assert.ok(!Object.hasOwn(result, "transactionReference"));
      for (const sensitive of ["test.creator", CUSTOMER.password, CUSTOMER.email, CUSTOMER.whatsapp]) {
        assert.ok(!JSON.stringify(result).includes(sensitive));
      }
    }
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
  });

  it("rejects mismatched SebPay external reference and collection amounts", async (t) => {
    const state = setup(t);
    for (const change of [{ external_reference: "some-other-order" }, { amount: 1 }, { currency: "USD" }, { transaction_id: "other" }]) {
      const order = await create(state, { ...SELECTION, provider: "sebpay", payment: { country: "CM", operator: "mtn", phone: "237699000000" } });
      Object.assign(state.transactions.get(Array.from(state.transactions.keys()).at(-1)), change);
      assert.equal((await readStatus(state, order.orderToken)).status, 502);
    }
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
  });

  it("enforces origins, request limits and no-store on every new route", async (t) => {
    const state = setup(t);
    const response = await worker.fetch(request("providers"), state.env);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal((await worker.fetch(request("providers", undefined, { Origin: "https://evil.example" }), state.env)).status, 403);
    assert.equal((await worker.fetch(request("checkout", { ...SELECTION, customer: { ...CUSTOMER, password: "x".repeat(5000) } }), state.env)).status, 400);
    state.env.CREATE_LIMITER.limit = async () => ({ success: false });
    assert.equal((await worker.fetch(request("checkout", SELECTION), state.env)).status, 429);
    assert.equal(state.calls.length, 0);
  });

  it("accepts source email login identifiers, numeric catalog IDs and configured base paths", async (t) => {
    const state = setup(t, (url) => url.endsWith("/p/countries") ? Response.json({ data: [{ ...COUNTRY, id: 1, operators: [{ ...COUNTRY.operators[0], id: 2 }] }] }) : undefined);
    state.env.TIKTOK_BASE_PATH = "/DRAVACARD";
    const order = await create(state, { ...SELECTION, customer: { ...CUSTOMER, username: "creator@example.com" } });
    const payload = JSON.parse(state.calls.at(-1).init.body);
    assert.equal(payload.customer_name, "creator@example.com");
    assert.equal(payload.return_url, `${ORIGIN}/DRAVACARD/tiktok-payment/#order=${order.orderToken}`);
    const catalog = await (await worker.fetch(request("sebpay/countries"), state.env)).json();
    assert.equal(catalog.countries[0].id, "1");
    assert.equal(catalog.countries[0].operators[0].id, "2");
  });

  it("authenticates encrypted fulfillment data and never mails a tampered envelope", async (t) => {
    const state = setup(t);
    const logs = t.mock.method(console, "error", () => {});
    const order = await create(state);
    const customerKey = Array.from(state.values.keys()).find((key) => key.endsWith(":customer"));
    const encrypted = state.values.get(customerKey);
    state.values.set(customerKey, `${encrypted.slice(0, -2)}${encrypted.endsWith("00") ? "ff" : "00"}`);
    const result = await (await readStatus(state, order.orderToken)).json();
    assert.equal(result.verified, true);
    assert.equal(result.notification, "pending");
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    assert.ok(!JSON.stringify(logs.mock.calls).includes(CUSTOMER.password));
  });

  it("rejects expired or malformed server records and verifies an immutable historical price", async (t) => {
    const state = setup(t);
    const order = await create(state);
    const { storageKey: recordKey } = storedRecord(state);
    const saved = JSON.parse(state.values.get(recordKey));
    state.values.set(recordKey, JSON.stringify({ ...saved, amount: 7500, providerAmount: 7500 }));
    state.transactions.get(saved.providerId).amount = 7500;
    assert.equal((await (await readStatus(state, order.orderToken)).json()).amount, 7500);
    state.values.set(recordKey, JSON.stringify({ ...saved, expiresAt: 1 }));
    assert.equal((await readStatus(state, order.orderToken)).status, 503);
    const createdAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    state.values.set(recordKey, JSON.stringify({ ...saved, createdAt, expiresAt: createdAt + 604800000 }));
    assert.equal((await readStatus(state, order.orderToken)).status, 404);
  });
});

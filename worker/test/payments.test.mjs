import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../src/index.ts";
import { CUSTOMER, ORIGIN, SELECTION, setup } from "./payment-fixtures.mjs";

function request(path, body, headers = {}) {
  return new Request(`https://worker.example${path}`, { method: body === undefined ? "GET" : "POST",
    headers: { Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.24", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function selection(service, provider = "leekpay") {
  return { service, productId: service === "cards" ? "visa-basic" : "boost", provider, consent: true,
    customer: service === "cards" ? { email: CUSTOMER.email, whatsapp: CUSTOMER.whatsapp } : CUSTOMER,
    ...(provider === "sebpay" ? { payment: { country: "CM", operator: "mtn", phone: "237699000000" } } : {}) };
}
async function create(state, body) {
  const response = await worker.fetch(request("/api/checkout", body), state.env);
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}
async function status(state, orderToken) {
  const response = await worker.fetch(request("/api/orders/status", { orderToken }), state.env);
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
function record(state, token, service) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)).then((hash) => {
    const key = `${service === "tiktok" ? "tiktok:" : ""}order:${Buffer.from(hash).toString("hex")}`;
    return { key, order: JSON.parse(state.values.get(key)) };
  });
}

describe("one platform payment engine (all external calls mocked)", () => {
  it("reports readiness with SebPay alone and fails closed without any provider or a required binding", async (t) => {
    const state = setup(t);
    delete state.env.LEEKPAY_SECRET_KEY;
    const health = () => worker.fetch(new Request("https://worker.example/health"), state.env);
    const ready = await health();
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: "ready" });
    for (const [binding, method] of [["ORDERS", "get"], ["ORDERS", "put"], ["CREATE_LIMITER", "limit"], ["STATUS_LIMITER", "limit"]]) {
      const saved = state.env[binding][method];
      delete state.env[binding][method];
      const unavailable = await health();
      assert.equal(unavailable.status, 503);
      assert.deepEqual(await unavailable.json(), { status: "unavailable" });
      state.env[binding][method] = saved;
    }
    delete state.env.SEBPAY_SECRET_KEY;
    const unavailable = await health();
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { status: "unavailable" });
    assert.equal(state.calls.length, 0);
    assert.equal(state.values.size, 0);
  });

  for (const service of ["cards", "tiktok"]) for (const provider of ["leekpay", "sebpay"]) {
    it(`creates and verifies ${service} through the shared ${provider} adapter`, async (t) => {
      const state = setup(t);
      const order = await create(state, selection(service, provider));
      assert.equal(order.service, service);
      assert.equal(order.productId, service === "cards" ? "visa-basic" : "boost");
      assert.equal(order.provider, provider);
      assert.equal(order.status, "pending");
      assert.equal(order.amount, service === "cards" ? 5000 : 7900);
      assert.equal(order.currency, service === "cards" ? "XOF" : "XAF");
      assert.equal(Object.hasOwn(order, "checkoutUrl"), provider === "leekpay");
      assert.equal(Object.hasOwn(order, "providerLink"), provider === "sebpay");
      const stored = await record(state, order.orderToken, service);
      assert.equal(stored.order.version, 2);
      assert.equal(stored.order.service, service);
      assert.equal(stored.order.provider, provider);
      for (const field of ["customer", "email", "whatsapp", "password", "username", "orderToken", "description"]) assert.ok(!Object.hasOwn(stored.order, field));
      assert.ok(!JSON.stringify(stored.order).includes(CUSTOMER.email));
      const remote = state.transactions.get(stored.order.providerId);
      remote.status = "pending";
      const pending = await status(state, order.orderToken);
      assert.equal(pending.verified, false);
      for (const field of ["username", "transactionReference", "password", "email", "whatsapp"]) assert.ok(!Object.hasOwn(pending, field));
      assert.equal(pending.notification, service === "tiktok" ? "pending" : undefined);
      remote.status = provider === "sebpay" ? "approved" : "paid";
      const paid = await status(state, order.orderToken);
      assert.equal(paid.service, service);
      assert.equal(paid.provider, provider);
      assert.equal(paid.verified, true);
      assert.equal(paid.transactionReference, stored.order.providerId);
      assert.equal(paid.notification, service === "tiktok" ? "sent" : undefined);
      assert.equal(paid.username, service === "tiktok" ? "test.creator" : undefined);
      assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, service === "tiktok" ? 1 : 0);
      const upstream = state.calls.find((call) => call.init.method === "POST" && !call.url.includes("emailjs"));
      assert.ok(!upstream.init.body.includes(CUSTOMER.password));
      assert.equal(JSON.parse(upstream.init.body).amount, order.amount);
      assert.match(pending.orderId, /^DRAVA-(PAY|TT)-/);
      remote.amount = 1;
      const mismatch = await worker.fetch(request("/api/orders/status", { orderToken: order.orderToken }), state.env);
      assert.equal(mismatch.status, 502);
      assert.deepEqual(await mismatch.json(), { error: { code: "provider_invalid_response" } });
    });
  }

  it("shares the same provider catalog and quotes without coupling availability to TikTok fulfillment", async (t) => {
    const state = setup(t);
    delete state.env.TIKTOK_DATA_KEY;
    delete state.env.EMAILJS_PUBLIC_KEY;
    const common = await worker.fetch(request("/api/providers"), state.env);
    const aliases = await worker.fetch(request("/api/tiktok/providers"), state.env);
    assert.deepEqual(await common.json(), await aliases.json());
    assert.equal(state.calls.length, 0);
    const countries = await worker.fetch(request("/api/providers/sebpay/countries"), state.env);
    assert.equal(countries.status, 200);
    for (const [service, productId, amount] of [["cards", "visa-basic", 5000], ["tiktok", "boost", 7900]]) {
      const quote = await worker.fetch(request("/api/providers/sebpay/quote", { service, productId, country: "CM", operator: "mtn" }), state.env);
      assert.equal(quote.status, 200);
      assert.equal((await quote.json()).amount, amount);
    }
    const before = state.calls.length;
    for (const provider of ["leekpay", "sebpay"]) {
      const blocked = await worker.fetch(request("/api/checkout", selection("tiktok", provider)), state.env);
      assert.equal(blocked.status, 503);
      assert.deepEqual(await blocked.json(), { error: { code: "fulfillment_unavailable" } });
    }
    assert.equal(state.calls.length, before);
    assert.equal(state.values.size, 0);
    // Card payments do not depend on an unrelated service's fulfillment secrets.
    await create(state, selection("cards", "leekpay"));
    await create(state, selection("cards", "sebpay"));
    delete state.env.LEEKPAY_SECRET_KEY;
    const catalog = await (await worker.fetch(request("/api/providers"), state.env)).json();
    assert.deepEqual(catalog.providers.map(({ available }) => available), [false, false, true]);
    await create(state, selection("cards", "sebpay"));
  });

  it("rejects price, service, consent, customer and provider-input substitutions before creating an order", async (t) => {
    const state = setup(t);
    const base = selection("cards");
    const variants = [{ ...base, service: "other" }, { ...base, consent: false }, { ...base, consent: undefined }, { ...base, productId: "boost" },
      { ...base, amount: 1 }, { ...base, returnUrl: "https://evil.example" }, { ...base, currency: "USD" }, { ...base, provider: "constructor" },
      { ...base, customCoins: 70 }, { ...base, customer: CUSTOMER }, { ...base, payment: { country: "CM" } },
      { ...selection("tiktok"), customer: base.customer }, { ...selection("tiktok"), productId: "visa-basic" },
      { ...selection("cards", "sebpay"), payment: { country: "CM", operator: "mtn", phone: "237699000000", amount: 1 } }];
    for (const body of variants) assert.equal((await worker.fetch(request("/api/checkout", body), state.env)).status, 400, JSON.stringify(body));
    assert.equal(state.calls.length, 0);
    assert.equal(state.values.size, 0);
    const disabled = await worker.fetch(request("/api/checkout", { ...base, provider: "soleaspay" }), state.env);
    assert.equal(disabled.status, 503);
    assert.equal(state.calls.length, 0);
  });

  it("reads old card and TikTok v1 orders through the common status route without rewriting encrypted identities", async (t) => {
    const state = setup(t);
    const legacyResponse = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: { email: CUSTOMER.email, whatsapp: CUSTOMER.whatsapp } }), state.env);
    const legacyCard = await legacyResponse.json();
    const cardRecord = await record(state, legacyCard.orderToken, "cards");
    assert.equal(cardRecord.order.version, 1);
    assert.equal((await status(state, legacyCard.orderToken)).service, "cards");
    const aliasResponse = await worker.fetch(request("/api/tiktok/checkout", SELECTION), state.env);
    const aliasOrder = await aliasResponse.json();
    const stored = await record(state, aliasOrder.orderToken, "tiktok");
    delete stored.order.service; delete stored.order.productId; stored.order.version = 1;
    state.values.set(stored.key, JSON.stringify(stored.order));
    const ciphertext = state.values.get(`${stored.key}:receipt`);
    const verified = await status(state, aliasOrder.orderToken);
    assert.equal(verified.service, "tiktok");
    assert.equal(verified.username, "test.creator");
    assert.equal(state.values.get(`${stored.key}:receipt`), ciphertext);
    assert.equal(JSON.parse(state.values.get(stored.key)).version, 1);
    assert.equal((await worker.fetch(request("/api/tiktok/orders/status", { orderToken: legacyCard.orderToken }), state.env)).status, 404);
  });

  it("retains immutable provider snapshots for new records and rejects corrupted service discriminators", async (t) => {
    const state = setup(t);
    const created = await create(state, selection("cards", "sebpay"));
    const { key, order } = await record(state, created.orderToken, "cards");
    order.amount = 5500; order.providerAmount = 5500;
    state.values.set(key, JSON.stringify(order));
    state.transactions.get(order.providerId).amount = 5500;
    assert.equal((await status(state, created.orderToken)).amount, 5500);
    for (const mutation of [{ service: "tiktok" }, { version: 3 }, { provider: "unknown" }, { providerId: "../../bad" }, { providerAmount: -1 }, { expiresAt: order.expiresAt + 1 }]) {
      const count = state.calls.length;
      state.values.set(key, JSON.stringify({ ...order, ...mutation }));
      assert.equal((await worker.fetch(request("/api/orders/status", { orderToken: created.orderToken }), state.env)).status, 503);
      assert.equal(state.calls.length, count);
    }
  });

  it("applies common route protections to provider catalogs and quotes without leaking customer or token data", async (t) => {
    const state = setup(t);
    const routes = [["/api/providers", undefined], ["/api/providers/sebpay/countries", undefined], ["/api/providers/sebpay/quote", { service: "cards", productId: "visa-basic", country: "CM", operator: "mtn" }]];
    for (const [path, body] of routes) {
      assert.equal((await worker.fetch(request(path, body, { Origin: "https://evil.example" }), state.env)).status, 403);
      assert.equal((await worker.fetch(request(`${path}?token=private`, body), state.env)).status, 404);
      const response = await worker.fetch(request(path, body), state.env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
      const text = await response.text();
      for (const value of Object.values(CUSTOMER)) assert.ok(!text.includes(value));
      assert.ok(!text.includes(state.env.SEBPAY_SECRET_KEY));
    }
  });

  it("retains encrypted fulfillment after an ambiguous provider creation response, without returning a payable link or mailing", async (t) => {
    const state = setup(t, (url, init) => {
      if (init.method === "POST" && (url.endsWith("/checkout") || url.endsWith("/collections"))) {
        // The remote server may have accepted this request before truncating its response.
        return new Response("{", { headers: { "Content-Type": "application/json" } });
      }
    });
    for (const provider of ["leekpay", "sebpay"]) {
      const response = await worker.fetch(request("/api/checkout", selection("tiktok", provider)), state.env);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { error: { code: "provider_invalid_response" } });
    }
    assert.equal(state.calls.filter((call) => call.url.includes("emailjs")).length, 0);
    assert.equal(state.values.size, 4);
    for (const [key, value] of state.values) {
      assert.match(key, /^tiktok:order:[a-f0-9]{64}:(customer|receipt)$/);
      assert.match(value, /^[a-f0-9]{24}:[a-f0-9]+$/);
      for (const secret of Object.values(CUSTOMER)) assert.ok(!value.includes(secret));
      const write = state.writes.find((entry) => entry.key === key);
      assert.ok(write.options.expiration || write.options.expirationTtl === 604800);
    }
  });

  it("uses an explicitly allowed local TikTok return only in development and never accepts a client return URL", async (t) => {
    const state = setup(t);
    const origin = "http://localhost:3000";
    state.env.LOCAL_ORIGINS = [origin];
    state.env.TIKTOK_BASE_PATH = "/preview";
    for (const environment of ["development", "production"]) {
      state.env.ENVIRONMENT = environment;
      const response = await worker.fetch(request("/api/checkout", selection("tiktok"), { Origin: origin }), state.env);
      assert.equal(response.status, 201);
      const created = await response.json();
      const payload = JSON.parse(state.calls.at(-1).init.body);
      assert.equal(payload.return_url, `${environment === "development" ? origin : ORIGIN}/preview/tiktok-payment/#order=${created.orderToken}`);
      assert.equal(payload.cancel_url, payload.return_url);
    }
    state.env.ENVIRONMENT = "development";
    assert.equal((await worker.fetch(request("/api/checkout", selection("tiktok"), { Origin: "http://localhost:4444" }), state.env)).status, 403);
  });
});

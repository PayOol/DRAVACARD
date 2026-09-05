import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../src/index.ts";

const ORIGIN = "https://drava.click";
const API = "https://leekpay.fr/api/v1/checkout";
const MOCK_CREDENTIAL = "test-only-provider-credential";
const TEST_CUSTOMER = { email: "client@example.com", whatsapp: "+237699000000" };

function setup(t, upstream) {
  const values = new Map();
  const puts = [];
  const calls = [];
  const limits = [];
  const env = {
    ENVIRONMENT: "production",
    LOCAL_ORIGINS: [],
    LEEKPAY_SECRET_KEY: MOCK_CREDENTIAL,
    ORDERS: {
      async put(key, value, options) { values.set(key, value); puts.push({ key, value, options }); },
      async get(key) { return values.has(key) ? JSON.parse(values.get(key)) : null; },
    },
    CREATE_LIMITER: { async limit(value) { limits.push({ kind: "create", ...value }); return { success: true }; } },
    STATUS_LIMITER: { async limit(value) { limits.push({ kind: "status", ...value }); return { success: true }; } },
  };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    if (upstream) return upstream(url, init);
    if (init.method === "POST") {
      const payload = JSON.parse(init.body);
      return Response.json({ success: true, data: {
        id: "checkout_42", payment_url: "https://leekpay.me/pay_test",
        amount: payload.amount, currency: payload.currency, status: "pending", return_url: payload.return_url,
      } }, { status: 201 });
    }
    return Response.json({ success: true, data: { id: "checkout_42", amount: 5000, currency: "XOF", status: "paid" } });
  });
  return { env, values, puts, calls, limits };
}

function request(path, body, headers = {}) {
  return new Request(`https://drava-leekpay.sebpay-proxy.workers.dev${path}`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.24", ...headers },
    body: JSON.stringify(body),
  });
}

async function create(env, productId = "visa-basic") {
  const response = await worker.fetch(request("/api/checkout", { productId, customer: TEST_CUSTOMER }), env);
  assert.equal(response.status, 201);
  return response.json();
}

async function errorCode(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error: { code } });
}

describe("LeekPay REST proxy (all provider calls mocked; no real payment)", () => {
  it("creates each catalogue checkout at the server price and hashes its token in KV", async (t) => {
    const state = setup(t);
    for (const [productId, amount] of Object.entries({ "visa-basic": 5000, "mastercard-basic": 6000, "mastercard-premium": 8500, "mastercard-platinum": 15000 })) {
      const result = await create(state.env, productId);
      assert.match(result.orderToken, /^[a-f0-9]{64}$/);
      assert.equal(result.checkoutUrl, "https://leekpay.me/pay_test");
      const { url, init } = state.calls.at(-1);
      assert.equal(url, API);
      assert.equal(init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
      assert.equal(init.redirect, "manual");
      assert.ok(init.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(init.body), {
        amount, currency: "XOF", description: JSON.parse(init.body).description,
        return_url: `${ORIGIN}/payment-success/#order=${result.orderToken}`,
        cancel_url: `${ORIGIN}/payment-failure/#order=${result.orderToken}`,
        customer_email: TEST_CUSTOMER.email,
        customer_phone: TEST_CUSTOMER.whatsapp,
        metadata: { productId },
      });
      const record = state.puts.at(-1);
      const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(result.orderToken))).toString("hex");
      assert.equal(record.key, `order:${hash}`);
      assert.ok(!record.value.includes(result.orderToken));
      assert.ok(!record.value.includes(MOCK_CREDENTIAL));
      assert.ok(!record.value.includes(TEST_CUSTOMER.email));
      assert.ok(!record.value.includes(TEST_CUSTOMER.whatsapp));
      assert.equal(record.options.expirationTtl, 604800);
      assert.equal(JSON.parse(record.value).amount, amount);
    }
    assert.equal(new Set(state.puts.map((put) => put.key)).size, 4);
  });

  it("rejects unknown products, prototype names and undeclared client fields", async (t) => {
    const { env, calls } = setup(t);
    for (const payload of [{ productId: "missing" }, { productId: "__proto__" }, { productId: "constructor" },
      { productId: "visa-basic", amount: 1 }, { productId: "visa-basic", currency: "USD" },
      { productId: "visa-basic", return_url: "https://attacker.example" }, { productId: "visa-basic", customer_email: "person@example.com" }, {}]) {
      await errorCode(await worker.fetch(request("/api/checkout", payload), env), 400, "invalid_product");
    }
    assert.equal(calls.length, 0);
  });

  it("requires exactly productId and customer before reaching the provider", async (t) => {
    const { env, calls, puts } = setup(t);
    for (const payload of [
      { productId: "visa-basic" },
      { customer: TEST_CUSTOMER },
      { productId: "visa-basic", email: TEST_CUSTOMER.email },
      { productId: "visa-basic", customer: TEST_CUSTOMER, amount: 1 },
      { productId: "visa-basic", customer: TEST_CUSTOMER, currency: "USD" },
      { productId: "visa-basic", customer: TEST_CUSTOMER, return_url: "https://attacker.example" },
      { productId: "visa-basic", customer: TEST_CUSTOMER, metadata: { email: TEST_CUSTOMER.email } },
      { productId: "visa-basic", customer: TEST_CUSTOMER, customer_name: "Unexpected" },
    ]) {
      await errorCode(await worker.fetch(request("/api/checkout", payload), env), 400, "invalid_product");
    }
    assert.equal(calls.length, 0);
    assert.equal(puts.length, 0);
  });

  it("rejects missing, malformed, extra or excessive customer fields without storing or logging them", async (t) => {
    const { env, calls, puts } = setup(t);
    const log = t.mock.method(console, "error", () => {});
    const invalidCustomers = [
      undefined, null, [], "client@example.com", {},
      { email: TEST_CUSTOMER.email }, { whatsapp: TEST_CUSTOMER.whatsapp },
      { ...TEST_CUSTOMER, name: "Unexpected" }, { ...TEST_CUSTOMER, phone: TEST_CUSTOMER.whatsapp },
      { ...TEST_CUSTOMER, email: "" }, { ...TEST_CUSTOMER, email: "  " },
      { ...TEST_CUSTOMER, email: "invalid" }, { ...TEST_CUSTOMER, email: "a@localhost" },
      { ...TEST_CUSTOMER, email: "a b@example.com" }, { ...TEST_CUSTOMER, email: "a\r\nBcc:other@example.com" },
      { ...TEST_CUSTOMER, email: "<a>@example.com" }, { ...TEST_CUSTOMER, email: "é@example.com" },
      { ...TEST_CUSTOMER, email: `${"a".repeat(65)}@example.com` },
      { ...TEST_CUSTOMER, email: `${"a".repeat(321)}@example.com` },
      { ...TEST_CUSTOMER, email: 123 },
      { ...TEST_CUSTOMER, whatsapp: "" }, { ...TEST_CUSTOMER, whatsapp: 237699000000 },
      { ...TEST_CUSTOMER, whatsapp: "699000000" }, { ...TEST_CUSTOMER, whatsapp: "00237699000000" },
      { ...TEST_CUSTOMER, whatsapp: "+0237699000000" }, { ...TEST_CUSTOMER, whatsapp: "+1234567" },
      { ...TEST_CUSTOMER, whatsapp: "+1234567890123456" }, { ...TEST_CUSTOMER, whatsapp: "+237CALLME" },
      { ...TEST_CUSTOMER, whatsapp: "+237699000000 ext 1" }, { ...TEST_CUSTOMER, whatsapp: "+237699000000#1" },
      { ...TEST_CUSTOMER, whatsapp: "+237.699.000.000" }, { ...TEST_CUSTOMER, whatsapp: "+237\r\n699000000" },
      { ...TEST_CUSTOMER, whatsapp: "+237699000000\t" }, { ...TEST_CUSTOMER, whatsapp: "+" + " ".repeat(40) + "237699000000" },
    ];
    for (const customer of invalidCustomers) {
      // undefined is deliberately represented as a present null customer in JSON.
      const payload = { productId: "visa-basic", customer: customer === undefined ? null : customer };
      await errorCode(await worker.fetch(request("/api/checkout", payload), env), 400, "invalid_customer");
    }
    assert.equal(calls.length, 0);
    assert.equal(puts.length, 0);
    assert.equal(log.mock.callCount(), 0);
  });

  it("normalizes contact details and forwards them only in explicit LeekPay customer fields", async (t) => {
    const { env, calls, values } = setup(t);
    const log = t.mock.method(console, "error", () => {});
    const customer = { email: "  Client+test@Example.COM  ", whatsapp: " +237 (699) 000-000 " };
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer }), env);
    assert.equal(response.status, 201);
    const result = await response.json();
    const payload = JSON.parse(calls[0].init.body);
    assert.equal(payload.customer_email, "Client+test@Example.COM");
    assert.equal(payload.customer_phone, "+237699000000");
    assert.deepEqual(payload.metadata, { productId: "visa-basic" });
    assert.deepEqual(Object.keys(payload).sort(), ["amount", "currency", "description", "return_url", "cancel_url", "metadata", "customer_email", "customer_phone"].sort());
    assert.equal(payload.amount, 5000);
    assert.equal(payload.currency, "XOF");
    assert.equal(payload.return_url, `${ORIGIN}/payment-success/#order=${result.orderToken}`);
    assert.equal(payload.cancel_url, `${ORIGIN}/payment-failure/#order=${result.orderToken}`);
    const checked = await worker.fetch(request("/api/orders/status", { orderToken: result.orderToken }), env);
    const checkedPayload = await checked.json();
    assert.equal(checkedPayload.verified, true);
    for (const exposed of [JSON.stringify(result), JSON.stringify(checkedPayload), ...values.values(), JSON.stringify(log.mock.calls)]) {
      assert.ok(!exposed.includes("Client+test@Example.COM"));
      assert.ok(!exposed.includes("237699000000"));
    }
    assert.equal(calls[1].init.body, undefined);
    assert.equal(calls[1].init.headers.customer_email, undefined);
    assert.equal(calls[1].init.headers.customer_phone, undefined);
  });

  it("never reflects provider customer data or errors into API responses, KV or logs", async (t) => {
    let failProvider = false;
    const { env, values } = setup(t, async (_url, init) => {
      if (failProvider) throw new Error(`Provider rejected ${TEST_CUSTOMER.email} ${TEST_CUSTOMER.whatsapp}`);
      return Response.json({ success: true, data: {
        id: "checkout_42", amount: 5000, currency: "XOF", status: init.method === "POST" ? "pending" : "paid",
        payment_url: "https://leekpay.me/pay_test", customer: TEST_CUSTOMER,
        customer_email: TEST_CUSTOMER.email, customer_phone: TEST_CUSTOMER.whatsapp,
        ...(init.method === "POST" ? { return_url: JSON.parse(init.body).return_url } : {}),
      } });
    });
    const log = t.mock.method(console, "error", () => {});
    const result = await create(env);
    const checked = await worker.fetch(request("/api/orders/status", { orderToken: result.orderToken }), env);
    const checkedBody = await checked.text();
    failProvider = true;
    const failed = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env);
    const failedBody = await failed.text();
    assert.equal(failed.status, 502);
    for (const exposed of [JSON.stringify(result), checkedBody, failedBody, ...values.values(), JSON.stringify(log.mock.calls)]) {
      assert.ok(!exposed.includes(TEST_CUSTOMER.email));
      assert.ok(!exposed.includes(TEST_CUSTOMER.whatsapp));
    }
  });

  it("accepts only exact production origin and preflight POST+Content-Type", async (t) => {
    const { env, calls } = setup(t);
    for (const origin of ["https://drava.click.attacker.example", "http://drava.click", "null", "http://127.0.0.1:3000", ""]) {
      const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Origin: origin }), env);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      await errorCode(response, 403, "origin_forbidden");
    }
    const response = await worker.fetch(new Request(`${ORIGIN}/api/checkout`, { method: "OPTIONS", headers: {
      Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
    } }), env);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
    assert.equal(calls.length, 0);
  });

  it("allows exactly configured loopback origins in production for preflight, checkout and status", async (t) => {
    const { env, calls, limits } = setup(t);
    env.LOCAL_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"];
    for (const origin of env.LOCAL_ORIGINS) {
      for (const path of ["/api/checkout", "/api/orders/status"]) {
        const preflight = await worker.fetch(new Request(`${ORIGIN}${path}`, { method: "OPTIONS", headers: {
          Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
        } }), env);
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
        assert.equal(preflight.headers.get("Access-Control-Allow-Credentials"), null);
      }
      const created = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Origin: origin }), env);
      assert.equal(created.status, 201);
      assert.equal(created.headers.get("Access-Control-Allow-Origin"), origin);
      const result = await created.json();
      assert.ok(!JSON.stringify(result).includes(MOCK_CREDENTIAL));
      const payload = JSON.parse(calls.at(-1).init.body);
      assert.equal(payload.amount, 5000);
      assert.equal(payload.currency, "XOF");
      assert.equal(payload.return_url, `${ORIGIN}/payment-success/#order=${result.orderToken}`);
      assert.equal(payload.cancel_url, `${ORIGIN}/payment-failure/#order=${result.orderToken}`);
      assert.equal(calls.at(-1).init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
      const checked = await worker.fetch(request("/api/orders/status", { orderToken: result.orderToken }, { Origin: origin }), env);
      assert.equal(checked.headers.get("Access-Control-Allow-Origin"), origin);
      assert.deepEqual(await checked.json(), { status: "paid", verified: true, productId: "visa-basic", amount: 5000, currency: "XOF" });
      assert.equal(calls.at(-1).init.method, "GET");
      assert.equal(calls.at(-1).init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
      assert.deepEqual(limits.slice(-2), [
        { kind: "create", key: "drava:203.0.113.24" }, { kind: "status", key: "drava:203.0.113.24" },
      ]);
    }
    assert.equal(env.ENVIRONMENT, "production");
    assert.equal(calls.length, 4);
  });

  it("requires an opt-in JSON array and keeps unconfigured local ports and hosts blocked", async (t) => {
    const { env, calls } = setup(t);
    const local = "http://127.0.0.1:3000";
    for (const configuration of [undefined, null, [], local, { origin: local }, [null, 3000]]) {
      env.LOCAL_ORIGINS = configuration;
      const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Origin: local }), env);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      await errorCode(response, 403, "origin_forbidden");
      const production = await worker.fetch(new Request(`${ORIGIN}/api/checkout`, { method: "OPTIONS", headers: {
        Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
      } }), env);
      assert.equal(production.status, 204);
    }
    env.LOCAL_ORIGINS = [local, "http://localhost:3000"];
    for (const origin of ["http://127.0.0.1:3012", "http://localhost:3012", "http://127.0.0.1:3001", "http://localhost", "http://127.0.0.2:3000", "http://[::1]:3000"]) {
      await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Origin: origin }), env), 403, "origin_forbidden");
    }
    assert.equal(calls.length, 0);
  });

  it("rejects malformed and non-loopback origins even if added to local configuration", async (t) => {
    const { env, calls } = setup(t);
    for (const origin of [
      "https://localhost:3000", "ftp://localhost:3000", "https://attacker.example", "http://attacker.example:3000",
      "http://localhost.attacker.example:3000", "http://127.0.0.1.attacker.example:3000", "http://localhost.:3000",
      "http://localhost:3000/", "http://127.0.0.1:3000/path", "http://localhost:3000?next=x", "http://localhost:3000#section",
      "http://user:password@localhost:3000", "http://localhost:99999", "http://localhost:03000", "http://localhost:word",
      "http://LOCALHOST:3000", "http://127.1:3000", "http://2130706433:3000", "null", "*", "",
    ]) {
      env.LOCAL_ORIGINS = [origin];
      const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Origin: origin }), env);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      await errorCode(response, 403, "origin_forbidden");
    }
    assert.equal(calls.length, 0);
  });

  it("does not relax IP requirements, rate limits or server-price validation for local origins", async (t) => {
    const { env, calls } = setup(t);
    const origin = "http://localhost:3000";
    env.LOCAL_ORIGINS = [origin];
    for (const path of ["/api/checkout", "/api/orders/status"]) {
      await errorCode(await worker.fetch(request(path, {}, { Origin: origin, "CF-Connecting-IP": "" }), env), 403, "request_forbidden");
    }
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", amount: 1 }, { Origin: origin }), env), 400, "invalid_product");
    env.CREATE_LIMITER.limit = async () => ({ success: false });
    env.STATUS_LIMITER.limit = async () => ({ success: false });
    for (const path of ["/api/checkout", "/api/orders/status"]) {
      const response = await worker.fetch(request(path, {}, { Origin: origin }), env);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
      assert.equal(response.headers.get("Retry-After"), "60");
      assert.equal(response.headers.get("Access-Control-Expose-Headers"), "Retry-After");
      await errorCode(response, 429, "rate_limited");
    }
    assert.equal(calls.length, 0);
  });

  it("has a minimal non-provider health check and fails closed with missing configuration", async (t) => {
    const { env, calls } = setup(t);
    const health = () => worker.fetch(new Request(`${ORIGIN}/health`), env);
    assert.deepEqual(await (await health()).json(), { status: "ready" });
    env.LEEKPAY_SECRET_KEY = "";
    assert.equal((await health()).status, 503);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 503, "service_unavailable");
    assert.equal(calls.length, 0);
  });

  it("enforces trusted-IP rate limits and never forwards arbitrary headers", async (t) => {
    const { env, calls, limits } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { "CF-Connecting-IP": "" }), env), 403, "request_forbidden");
    env.CREATE_LIMITER.limit = async () => ({ success: false });
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal(response.headers.get("Access-Control-Expose-Headers"), "Retry-After");
    await errorCode(response, 429, "rate_limited");
    assert.equal(calls.length, 0);
    env.CREATE_LIMITER.limit = async (value) => { limits.push(value); return { success: true }; };
    const created = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { Authorization: "Bearer untrusted-client", "X-Forwarded-For": "1.1.1.1" }), env);
    assert.equal(created.status, 201);
    assert.equal(limits.at(-1).key, "drava:203.0.113.24");
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
    assert.equal(calls[0].init.headers["X-Forwarded-For"], undefined);
  });

  it("rejects oversized, malformed and non-JSON request bodies", async (t) => {
    const { env, calls } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "x".repeat(2000) }), env), 400, "invalid_request");
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }, { "Content-Type": "text/plain" }), env), 415, "unsupported_media_type");
    const malformed = new Request(`${ORIGIN}/api/checkout`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.24" }, body: "{" });
    await errorCode(await worker.fetch(malformed, env), 400, "invalid_request");
    assert.equal(calls.length, 0);
  });

  it("rejects unsafe provider payment URLs and mismatched creation amount/currency/id", async (t) => {
    const variants = [
      { payment_url: "https://attacker.example/pay" }, { payment_url: "https://leekpay.me.attacker.example/pay" },
      { payment_url: "http://leekpay.me/pay" }, { payment_url: "https://user:password@leekpay.me/pay" },
      { payment_url: "https://leekpay.me:444/pay" }, { amount: 1 }, { amount: "5000" }, { currency: "USD" },
      { id: "checkout_../../danger" }, { status: "paid" }, { return_url: "https://attacker.example" },
    ];
    let override;
    const { env, puts } = setup(t, async (_url, init) => Response.json({ success: true, data: {
      id: "checkout_42", amount: 5000, currency: "XOF", status: "pending", payment_url: "https://leekpay.me/pay_test",
      return_url: JSON.parse(init.body).return_url, ...override,
    } }));
    for (const variant of variants) {
      override = variant;
      await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 502, "provider_invalid_response");
    }
    assert.equal(puts.length, 0);
  });

  it("returns paid verified only after authenticated GET and exact amount/currency/id checks", async (t) => {
    const { env, calls } = setup(t);
    const { orderToken } = await create(env);
    const response = await worker.fetch(request("/api/orders/status", { orderToken }), env);
    assert.deepEqual(await response.json(), { status: "paid", verified: true, productId: "visa-basic", amount: 5000, currency: "XOF" });
    assert.equal(calls.at(-1).url, `${API}/checkout_42`);
    assert.equal(calls.at(-1).init.method, "GET");
    assert.equal(calls.at(-1).init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
    assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
  });

  it("does not verify pending/processing/failed/cancelled/expired and refuses status mismatches", async (t) => {
    let status = "pending";
    let override = {};
    const state = setup(t, async (_url, init) => Response.json({ success: true, data: {
      id: "checkout_42", amount: 5000, currency: "XOF", status,
      ...(init.method === "POST" ? { payment_url: "https://leekpay.me/pay_test", return_url: JSON.parse(init.body).return_url } : override),
    } }));
    const { orderToken } = await create(state.env);
    for (const value of ["pending", "processing", "failed", "cancelled", "expired"]) {
      status = value;
      const response = await worker.fetch(request("/api/orders/status", { orderToken }), state.env);
      const result = await response.json();
      assert.equal(result.status, value);
      assert.equal(result.verified, false);
    }
    status = "paid";
    for (const variant of [{ id: "checkout_other" }, { amount: 1 }, { amount: "5000" }, { currency: "USD" }, { status: "success" }, { id: undefined }]) {
      override = variant;
      await errorCode(await worker.fetch(request("/api/orders/status", { orderToken }), state.env), 502, "provider_invalid_response");
    }
  });

  it("rejects invalid/unknown tokens and expired/corrupt KV records without provider calls", async (t) => {
    const { env, values, calls } = setup(t);
    await errorCode(await worker.fetch(request("/api/orders/status", { orderToken: "bad" }), env), 400, "invalid_order");
    await errorCode(await worker.fetch(request("/api/orders/status", { orderToken: "a".repeat(64) }), env), 404, "order_not_found");
    const { orderToken } = await create(env);
    const [key, stored] = [...values.entries()][0];
    const order = JSON.parse(stored);
    values.set(key, JSON.stringify({ ...order, amount: 1 }));
    await errorCode(await worker.fetch(request("/api/orders/status", { orderToken }), env), 503, "service_unavailable");
    const createdAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    values.set(key, JSON.stringify({ ...order, createdAt, expiresAt: createdAt + 604800000 }));
    await errorCode(await worker.fetch(request("/api/orders/status", { orderToken }), env), 404, "order_not_found");
    assert.equal(calls.length, 1);
  });

  it("masks provider errors, never forwards their body or headers, and bounds responses", async (t) => {
    let upstream = () => new Response("sensitive-provider-detail", { status: 401 });
    const { env } = setup(t, (...args) => upstream(...args));
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 502, "provider_unavailable");
    upstream = () => Response.json({ success: true, data: { oversized: "x".repeat(40000) } });
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 502, "provider_invalid_response");
    upstream = () => { throw new Error("sensitive-provider-detail"); };
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 502, "provider_unavailable");
  });

  it("rejects unexposed routes, query parameters, GET status and privileged preflights", async (t) => {
    const { env, calls } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout?url=https://attacker.example", { productId: "visa-basic", customer: TEST_CUSTOMER }), env), 404, "not_found");
    await errorCode(await worker.fetch(request("/webhook", {}), env), 404, "not_found");
    await errorCode(await worker.fetch(new Request(`${ORIGIN}/api/orders/status`, { headers: { Origin: ORIGIN } }), env), 405, "method_not_allowed");
    await errorCode(await worker.fetch(new Request(`${ORIGIN}/api/checkout`, { method: "OPTIONS", headers: {
      Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization",
    } }), env), 403, "request_forbidden");
    assert.equal(calls.length, 0);
  });

  it("checks an older order against its immutable stored price, not a newer catalogue price", async (t) => {
    const { env, values } = setup(t, async (_url, init) => Response.json({ success: true, data: {
      id: "checkout_42", amount: init.method === "POST" ? 5000 : 5500, currency: "XOF",
      status: init.method === "POST" ? "pending" : "paid",
      ...(init.method === "POST" ? { payment_url: "https://leekpay.me/pay_test", return_url: JSON.parse(init.body).return_url } : {}),
    } }));
    const { orderToken } = await create(env);
    const [key, stored] = [...values.entries()][0];
    values.set(key, JSON.stringify({ ...JSON.parse(stored), amount: 5500 }));
    const response = await worker.fetch(request("/api/orders/status", { orderToken }), env);
    assert.deepEqual(await response.json(), { status: "paid", verified: true, productId: "visa-basic", amount: 5500, currency: "XOF" });
  });

  it("does not return a payable URL when KV persistence fails and logs no details", async (t) => {
    const { env } = setup(t);
    env.ORDERS.put = async () => { throw new Error("private-storage-error"); };
    const log = t.mock.method(console, "error", () => {});
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env);
    await errorCode(response, 503, "service_unavailable");
    assert.equal(log.mock.callCount(), 1);
    assert.deepEqual(JSON.parse(log.mock.calls[0].arguments[0]), { event: "payment_proxy_error", code: "internal_error" });
  });

  it("aborts a stalled provider request within the configured deadline", { timeout: 3000 }, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let announceFetch;
    const fetched = new Promise((resolve) => { announceFetch = resolve; });
    const { env, puts } = setup(t, async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("private-network-error")), { once: true });
      announceFetch();
    }));
    const response = worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env);
    await fetched;
    t.mock.timers.tick(10_000);
    await errorCode(await response, 502, "provider_unavailable");
    assert.equal(puts.length, 0);
  });

  it("cancels an incomplete streamed body within the configured deadline", { timeout: 3000 }, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let announceFetch;
    const fetched = new Promise((resolve) => { announceFetch = resolve; });
    let cancelled = false;
    const { env } = setup(t, async () => {
      const response = new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode('{"data":')); },
        cancel() { cancelled = true; },
      }), { headers: { "Content-Type": "application/json" } });
      announceFetch();
      return response;
    });
    const response = worker.fetch(request("/api/checkout", { productId: "visa-basic", customer: TEST_CUSTOMER }), env);
    await fetched;
    // setImmediate is not mocked: flush fetch/stream promises before advancing the timer.
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(10_000);
    await errorCode(await response, 502, "provider_invalid_response");
    assert.equal(cancelled, true);
  });
});

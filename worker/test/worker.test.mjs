import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../src/index.ts";

const ORIGIN = "https://drava.click";
const API = "https://leekpay.fr/api/v1/checkout";
const MOCK_CREDENTIAL = "test-only-provider-credential";

function setup(t, upstream) {
  const values = new Map();
  const puts = [];
  const calls = [];
  const limits = [];
  const env = {
    ENVIRONMENT: "production",
    LOCAL_ORIGIN: "",
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
  const response = await worker.fetch(request("/api/checkout", { productId }), env);
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
        metadata: { productId },
      });
      const record = state.puts.at(-1);
      const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(result.orderToken))).toString("hex");
      assert.equal(record.key, `order:${hash}`);
      assert.ok(!record.value.includes(result.orderToken));
      assert.ok(!record.value.includes(MOCK_CREDENTIAL));
      assert.equal(record.options.expirationTtl, 604800);
      assert.equal(JSON.parse(record.value).amount, amount);
    }
    assert.equal(new Set(state.puts.map((put) => put.key)).size, 4);
  });

  it("rejects unknown products, prototype names and any client amount/redirect/PII", async (t) => {
    const { env, calls } = setup(t);
    for (const payload of [{ productId: "missing" }, { productId: "__proto__" }, { productId: "constructor" },
      { productId: "visa-basic", amount: 1 }, { productId: "visa-basic", currency: "USD" },
      { productId: "visa-basic", return_url: "https://attacker.example" }, { productId: "visa-basic", customer_email: "person@example.com" }, {}]) {
      await errorCode(await worker.fetch(request("/api/checkout", payload), env), 400, "invalid_product");
    }
    assert.equal(calls.length, 0);
  });

  it("accepts only exact production origin and preflight POST+Content-Type", async (t) => {
    const { env, calls } = setup(t);
    for (const origin of ["https://drava.click.attacker.example", "http://drava.click", "null", "http://127.0.0.1:3000", ""]) {
      const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic" }, { Origin: origin }), env);
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

  it("allows localhost only in explicit development, never changes return URLs", async (t) => {
    const { env, calls } = setup(t);
    env.ENVIRONMENT = "development";
    env.LOCAL_ORIGIN = "http://127.0.0.1:3000";
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic" }, { Origin: env.LOCAL_ORIGIN }), env);
    assert.equal(response.status, 201);
    assert.ok(JSON.parse(calls[0].init.body).return_url.startsWith(`${ORIGIN}/payment-success/`));
  });

  it("has a minimal non-provider health check and fails closed with missing configuration", async (t) => {
    const { env, calls } = setup(t);
    const health = () => worker.fetch(new Request(`${ORIGIN}/health`), env);
    assert.deepEqual(await (await health()).json(), { status: "ready" });
    env.LEEKPAY_SECRET_KEY = "";
    assert.equal((await health()).status, 503);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env), 503, "service_unavailable");
    assert.equal(calls.length, 0);
  });

  it("enforces trusted-IP rate limits and never forwards arbitrary headers", async (t) => {
    const { env, calls, limits } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }, { "CF-Connecting-IP": "" }), env), 403, "request_forbidden");
    env.CREATE_LIMITER.limit = async () => ({ success: false });
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal(response.headers.get("Access-Control-Expose-Headers"), "Retry-After");
    await errorCode(response, 429, "rate_limited");
    assert.equal(calls.length, 0);
    env.CREATE_LIMITER.limit = async (value) => { limits.push(value); return { success: true }; };
    const created = await worker.fetch(request("/api/checkout", { productId: "visa-basic" }, { Authorization: "Bearer untrusted-client", "X-Forwarded-For": "1.1.1.1" }), env);
    assert.equal(created.status, 201);
    assert.equal(limits.at(-1).key, "drava:203.0.113.24");
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${MOCK_CREDENTIAL}`);
    assert.equal(calls[0].init.headers["X-Forwarded-For"], undefined);
  });

  it("rejects oversized, malformed and non-JSON request bodies", async (t) => {
    const { env, calls } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "x".repeat(2000) }), env), 400, "invalid_request");
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }, { "Content-Type": "text/plain" }), env), 415, "unsupported_media_type");
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
      await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env), 502, "provider_invalid_response");
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
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env), 502, "provider_unavailable");
    upstream = () => Response.json({ success: true, data: { oversized: "x".repeat(40000) } });
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env), 502, "provider_invalid_response");
    upstream = () => { throw new Error("sensitive-provider-detail"); };
    await errorCode(await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env), 502, "provider_unavailable");
  });

  it("rejects unexposed routes, query parameters, GET status and privileged preflights", async (t) => {
    const { env, calls } = setup(t);
    await errorCode(await worker.fetch(request("/api/checkout?url=https://attacker.example", { productId: "visa-basic" }), env), 404, "not_found");
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
    const response = await worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env);
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
    const response = worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env);
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
    const response = worker.fetch(request("/api/checkout", { productId: "visa-basic" }), env);
    await fetched;
    // setImmediate is not mocked: flush fetch/stream promises before advancing the timer.
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(10_000);
    await errorCode(await response, 502, "provider_invalid_response");
    assert.equal(cancelled, true);
  });
});

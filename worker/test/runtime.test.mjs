import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions, Response as RuntimeResponse } from "miniflare";

const TEST_CUSTOMER = { email: " client@example.com ", whatsapp: "+237 (699) 000-000" };

async function storedCreationDate(runtime, orderToken) {
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(orderToken))).toString("hex");
  const orders = await runtime.getKVNamespace("ORDERS");
  const order = await orders.get(`order:${hash}`, "json");
  assert.ok(Number.isSafeInteger(order.createdAt) && order.createdAt > 0);
  return order.createdAt;
}

// Miniflare/workerd ships with our exact pinned Wrangler version. Every outbound
// fetch is intercepted locally; these tests never contact a payment provider.
it("runs the Worker in workerd with actual KV/rate bindings and blocked external network", { timeout: 30_000 }, async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.vars.ENVIRONMENT, "production");
  // Optional TikTok providers must not add mandatory bindings to card-only deploys.
  assert.deepEqual(config.secrets.required, ["LEEKPAY_SECRET_KEY"]);
  assert.deepEqual(config.env.development.secrets.required, ["LEEKPAY_SECRET_KEY"]);
  assert.deepEqual(config.vars.LOCAL_ORIGINS, ["http://127.0.0.1:3000", "http://localhost:3000"]);
  assert.equal(config.ratelimits.find((binding) => binding.name === "CREATE_LIMITER").simple.limit, 10);
  assert.equal(config.ratelimits.find((binding) => binding.name === "STATUS_LIMITER").simple.limit, 30);
  let outboundCalls = 0;
  let allowMockCheckout = false;
  let simulateRedirect = false;
  let paymentUrl = "https://app.zayono.com/checkout/test-only-session";
  let createdBody;
  const runtime = new Miniflare(convertV4MiniflareOptions({
    name: "drava-payment-runtime-test",
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    cf: false,
    telemetry: { enabled: false },
    logRequests: false,
    bindings: { ...config.vars, LEEKPAY_SECRET_KEY: "test-only-provider-credential" },
    kvNamespaces: ["ORDERS"],
    ratelimits: Object.fromEntries(config.ratelimits.map((binding) => [binding.name, {
      namespace_id: binding.namespace_id, simple: binding.simple,
    }])),
    outboundService: async (request) => {
      outboundCalls++;
      if (allowMockCheckout) {
        assert.equal(request.headers.get("Authorization"), "Bearer test-only-provider-credential");
        if (simulateRedirect) return RuntimeResponse.redirect("https://attacker.example/pay", 302);
        if (request.method === "POST") {
          assert.equal(request.url, "https://leekpay.fr/api/v1/checkout");
          createdBody = await request.json();
          assert.equal(createdBody.customer_name, "Client (client@example.com)");
          assert.equal(createdBody.customer_email, "client@example.com");
          assert.equal(createdBody.customer_phone, "+237699000000");
          if (createdBody.metadata.service === undefined) {
            assert.deepEqual(createdBody.metadata, { productId: "visa-basic" });
          } else {
            assert.match(createdBody.metadata.orderId, /^DRAVA-PAY-[a-f0-9-]{36}$/);
            assert.deepEqual(createdBody.metadata, { service: "cards", productId: "visa-basic", orderId: createdBody.metadata.orderId });
          }
          assert.deepEqual(Object.keys(createdBody).sort(), ["amount", "currency", "description", "return_url", "cancel_url", "metadata", "customer_name", "customer_email", "customer_phone"].sort());
          return RuntimeResponse.json({ success: true, data: {
            id: "checkout_runtime", payment_url: paymentUrl, amount: 5000, currency: "XOF",
            status: "pending", return_url: createdBody.return_url,
          } }, { status: 201 });
        }
        assert.equal(request.method, "GET");
        assert.equal(request.url, "https://leekpay.fr/api/v1/checkout/checkout_runtime");
        return RuntimeResponse.json({ success: true, data: {
          id: "checkout_runtime", amount: 5000, currency: "XOF", status: "paid",
          created_at: "2000-01-01T00:00:00Z", createdAt: 123,
        } });
      }
      return RuntimeResponse.json({ error: "outbound-network-blocked-in-test" }, { status: 503 });
    },
  }));
  try {
    const health = await runtime.dispatchFetch("https://runtime.example/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ready" });
    const headers = { Origin: "https://drava.click", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.24" };
    const preflight = await runtime.dispatchFetch("https://runtime.example/api/checkout", { method: "OPTIONS", headers: {
      Origin: headers.Origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), headers.Origin);
    const invalid = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ productId: "visa-basic", amount: 1 }),
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: { code: "invalid_product" } });
    const missingCustomer = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ productId: "visa-basic" }),
    });
    assert.equal(missingCustomer.status, 400);
    assert.deepEqual(await missingCustomer.json(), { error: { code: "invalid_product" } });
    const malformedCustomer = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ productId: "visa-basic", customer: { email: "bad", whatsapp: "699000000" } }),
    });
    assert.equal(malformedCustomer.status, 400);
    assert.deepEqual(await malformedCustomer.json(), { error: { code: "invalid_customer" } });
    for (const [body, code] of [
      [{ productId: "visa-basic", customer: TEST_CUSTOMER, customer_name: "Browser-supplied name" }, "invalid_product"],
      [{ productId: "visa-basic", customer: { ...TEST_CUSTOMER, customer_name: "Browser-supplied name" } }, "invalid_customer"],
    ]) {
      const suppliedName = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
        method: "POST", headers, body: JSON.stringify(body),
      });
      assert.equal(suppliedName.status, 400);
      assert.deepEqual(await suppliedName.json(), { error: { code } });
    }
    const unknown = await runtime.dispatchFetch("https://runtime.example/api/orders/status", {
      method: "POST", headers, body: JSON.stringify({ orderToken: "a".repeat(64) }),
    });
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { error: { code: "order_not_found" } });
    const forbidden = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers: { ...headers, Origin: "https://attacker.example" }, body: JSON.stringify({ productId: "visa-basic", customer: TEST_CUSTOMER }),
    });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
    for (const origin of ["http://127.0.0.1:3012", "http://localhost:3012", "https://localhost:3000", "http://localhost.attacker.example:3000"]) {
      const denied = await runtime.dispatchFetch("https://runtime.example/api/checkout", { method: "OPTIONS", headers: {
        Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
      } });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
    }
    assert.equal(outboundCalls, 0);
    allowMockCheckout = true;
    const created = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ productId: "visa-basic", customer: TEST_CUSTOMER }),
    });
    const createdPayload = await created.json();
    assert.equal(created.status, 201, JSON.stringify(createdPayload));
    assert.equal(createdPayload.checkoutUrl, paymentUrl);
    assert.match(createdPayload.orderToken, /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(createdPayload).sort(), ["checkoutUrl", "orderToken"]);
    assert.ok(!JSON.stringify(createdPayload).includes("Client (client@example.com)"));
    assert.equal(createdBody.amount, 5000);
    assert.equal(createdBody.currency, "XOF");
    const checked = await runtime.dispatchFetch("https://runtime.example/api/orders/status", {
      method: "POST", headers, body: JSON.stringify({ orderToken: createdPayload.orderToken }),
    });
    const checkedPayload = await checked.json();
    assert.equal(checked.status, 200, JSON.stringify(checkedPayload));
    assert.deepEqual(checkedPayload, {
      service: "cards", provider: "leekpay", orderId: "checkout_runtime", transactionReference: "checkout_runtime",
      status: "paid", verified: true, productId: "visa-basic", amount: 5000, currency: "XOF",
      createdAt: await storedCreationDate(runtime, createdPayload.orderToken),
    });
    assert.equal(outboundCalls, 2);
    paymentUrl = "https://future.processor.example/checkout/test-only-session";
    for (const origin of config.vars.LOCAL_ORIGINS) {
      const localHeaders = { ...headers, Origin: origin };
      for (const path of ["/api/checkout", "/api/orders/status"]) {
        const localPreflight = await runtime.dispatchFetch(`https://runtime.example${path}`, { method: "OPTIONS", headers: {
          Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
        } });
        assert.equal(localPreflight.status, 204);
        assert.equal(localPreflight.headers.get("Access-Control-Allow-Origin"), origin);
        assert.equal(localPreflight.headers.get("Access-Control-Allow-Credentials"), null);
      }
      const localCreate = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
        method: "POST", headers: localHeaders, body: JSON.stringify({ service: "cards", provider: "leekpay", consent: true, productId: "visa-basic", customer: TEST_CUSTOMER }),
      });
      assert.equal(localCreate.status, 201);
      assert.equal(localCreate.headers.get("Access-Control-Allow-Origin"), origin);
      const localCheckout = await localCreate.json();
      assert.equal(localCheckout.service, "cards");
      assert.equal(localCheckout.provider, "leekpay");
      assert.equal(localCheckout.checkoutUrl, paymentUrl);
      assert.equal(createdBody.amount, 5000);
      assert.equal(createdBody.currency, "XOF");
      assert.equal(createdBody.return_url, `https://drava.click/payment-success/#order=${localCheckout.orderToken}`);
      assert.equal(createdBody.cancel_url, `https://drava.click/payment-failure/#order=${localCheckout.orderToken}`);
      assert.ok(!JSON.stringify(localCheckout).includes("test-only-provider-credential"));
      const localStatus = await runtime.dispatchFetch("https://runtime.example/api/orders/status", {
        method: "POST", headers: localHeaders, body: JSON.stringify({ orderToken: localCheckout.orderToken }),
      });
      assert.equal(localStatus.status, 200);
      assert.equal(localStatus.headers.get("Access-Control-Allow-Origin"), origin);
      assert.deepEqual(await localStatus.json(), {
        service: "cards", provider: "leekpay", orderId: createdBody.metadata.orderId, transactionReference: "checkout_runtime",
      status: "paid", verified: true, productId: "visa-basic", amount: 5000, currency: "XOF",
        createdAt: await storedCreationDate(runtime, localCheckout.orderToken),
      });
    }
    assert.equal(outboundCalls, 6);
    const orders = await runtime.getKVNamespace("ORDERS");
    const orderKeys = await orders.list();
    assert.equal(orderKeys.keys.length, 3);
    for (const key of orderKeys.keys) {
      const record = await orders.get(key.name);
      assert.ok(!record.includes("client@example.com"));
      assert.ok(!record.includes("Client (client@example.com)"));
      assert.ok(!record.includes("237699000000"));
      assert.ok(!record.includes("customer"));
    }
    simulateRedirect = true;
    const redirected = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ productId: "visa-basic", customer: TEST_CUSTOMER }),
    });
    assert.equal(redirected.status, 502);
    assert.deepEqual(await redirected.json(), { error: { code: "provider_unavailable" } });
    // Exactly one additional provider fetch: never follow Location with Authorization.
    assert.equal(outboundCalls, 7);
  } finally {
    await runtime.dispose();
  }
});

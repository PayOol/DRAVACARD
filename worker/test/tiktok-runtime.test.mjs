import assert from "node:assert/strict";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions, Response as RuntimeResponse } from "miniflare";

it("encrypts and verifies TikTok orders in actual workerd with all outbound requests mocked", { timeout: 30000 }, async () => {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))], bundle: true, format: "esm", platform: "browser", write: false });
  let mails = 0;
  let providerStatus = "pending";
  const password = "test-password";
  const runtime = new Miniflare(convertV4MiniflareOptions({
    name: "drava-tiktok-runtime-test", modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-09-05", compatibilityFlags: ["nodejs_compat"], cf: false,
    telemetry: { enabled: false }, logRequests: false,
    bindings: {
      ENVIRONMENT: "production", LOCAL_ORIGINS: [], TIKTOK_BASE_PATH: "",
      LEEKPAY_SECRET_KEY: "test-only-provider-credential", TIKTOK_DATA_KEY: "34".repeat(32),
      EMAILJS_SERVICE_ID: "test-service", EMAILJS_TEMPLATE_ID: "test-template", EMAILJS_PUBLIC_KEY: "test-public-key",
    },
    kvNamespaces: ["ORDERS"],
    ratelimits: { CREATE_LIMITER: { namespace_id: "2026090511", simple: { limit: 10, period: 60 } }, STATUS_LIMITER: { namespace_id: "2026090512", simple: { limit: 30, period: 60 } } },
    outboundService: async (request) => {
      if (request.url === "https://api.emailjs.com/api/v1.0/email/send") {
        const payload = await request.json();
        assert.equal(providerStatus, "paid");
        assert.equal(payload.template_params.tiktok_password, password);
        assert.equal(payload.template_params.coins_amount, "770");
        assert.ok(!Object.hasOwn(payload, "accessToken"));
        mails++;
        return new RuntimeResponse("OK");
      }
      assert.equal(request.headers.get("Authorization"), "Bearer test-only-provider-credential");
      if (request.method === "POST" && request.url === "https://leekpay.fr/api/v1/checkout") {
        const payload = await request.json();
        assert.equal(payload.amount, 7900);
        assert.ok(!JSON.stringify(payload).includes(password));
        return RuntimeResponse.json({ success: true, data: { id: "checkout_runtime_tiktok", amount: 7900, currency: "XOF", status: "pending", return_url: payload.return_url, payment_url: "https://leekpay.me/test-tiktok" } });
      }
      assert.equal(request.url, "https://leekpay.fr/api/v1/checkout/checkout_runtime_tiktok");
      assert.equal(request.method, "GET");
      return RuntimeResponse.json({ success: true, data: { id: "checkout_runtime_tiktok", amount: 7900, currency: "XOF", status: providerStatus } });
    },
  }));
  try {
    const headers = { Origin: "https://drava.click", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.25" };
    const response = await runtime.dispatchFetch("https://runtime.example/api/checkout", {
      method: "POST", headers, body: JSON.stringify({ service: "tiktok", productId: "boost", provider: "leekpay", consent: true, customer: { username: "creator", password, email: "buyer@example.com", whatsapp: "+237699000000" } }),
    });
    assert.equal(response.status, 201);
    const { orderToken } = await response.json();
    const orders = await runtime.getKVNamespace("ORDERS");
    const keys = await orders.list();
    assert.equal(keys.keys.length, 3);
    for (const entry of keys.keys) {
      const value = await orders.get(entry.name);
      assert.ok(!value.includes(password));
      assert.ok(!value.includes("buyer@example.com"));
      assert.ok(!value.includes("\"creator\""));
      assert.ok(!entry.name.includes(orderToken));
    }
    const check = () => runtime.dispatchFetch("https://runtime.example/api/orders/status", { method: "POST", headers, body: JSON.stringify({ orderToken }) });
    const pending = await (await check()).json();
    assert.equal(pending.verified, false);
    assert.ok(!Object.hasOwn(pending, "username"));
    assert.ok(!Object.hasOwn(pending, "transactionReference"));
    assert.equal(mails, 0);
    providerStatus = "paid";
    const paid = await (await check()).json();
    assert.equal(paid.verified, true);
    assert.equal(paid.notification, "sent");
    assert.equal(paid.username, "creator");
    assert.equal(paid.transactionReference, "checkout_runtime_tiktok");
    assert.equal(mails, 1);
    const credentialKey = keys.keys.find((entry) => entry.name.endsWith(":customer")).name;
    assert.equal(await orders.get(credentialKey), null);
    const receipt = keys.keys.find((entry) => entry.name.endsWith(":receipt"));
    const encryptedReceipt = await orders.get(receipt.name);
    assert.match(encryptedReceipt, /^[a-f0-9]{24}:[a-f0-9]+$/);
    assert.equal(receipt.expiration, Math.floor((paid.createdAt + 7 * 24 * 60 * 60 * 1000) / 1000));
    const reopened = await (await check()).json();
    assert.equal(reopened.username, "creator");
    assert.equal(await orders.get(receipt.name), encryptedReceipt);
    assert.equal(mails, 1);
  } finally { await runtime.dispose(); }
});

import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import {
  LEEKPAY_API_BASE,
  PaymentApiError,
  createLeekPayCheckout,
  getLeekPayOrderStatus,
  readOrderToken,
} from "../src/lib/leekpay.ts";

const orderToken = "a".repeat(64);
const checkoutUrl = "https://leekpay.me/pay_example";
const order = {
  status: "paid",
  verified: true,
  productId: "visa-basic",
  amount: 5000,
  currency: "XOF",
};
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

afterEach(() => mock.restoreAll());

test("checkout sends only a catalogue product ID to the fixed proxy", async () => {
  const request = mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `${LEEKPAY_API_BASE}/api/checkout`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { productId: "visa-basic" });
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.headers.Authorization, undefined);
    return json({ checkoutUrl, orderToken });
  });
  assert.deepEqual(await createLeekPayCheckout("visa-basic"), {
    checkoutUrl,
    orderToken,
  });
  assert.equal(request.mock.callCount(), 1);
});

test("unknown products are rejected before any network request", async () => {
  const request = mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected request");
  });
  await assert.rejects(createLeekPayCheckout("unknown"), PaymentApiError);
  assert.equal(request.mock.callCount(), 0);
});

test("checkout redirects require the exact HTTPS provider hosts", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const unsafeUrl of [
    "http://leekpay.me/pay_example",
    "https://leekpay.me.untrusted.invalid/pay_example",
    "https://leekpay.me@untrusted.invalid/pay_example",
    "https://user:password@leekpay.me/pay_example",
    "https://leekpay.me:8443/pay_example",
    "javascript:alert(1)",
    "/pay_example",
  ]) {
    request.mock.mockImplementation(async () =>
      json({ checkoutUrl: unsafeUrl, orderToken }),
    );
    await assert.rejects(createLeekPayCheckout("visa-basic"), PaymentApiError);
  }
});

test("invalid order tokens cannot launch a checkout or query an order", async () => {
  const request = mock.method(globalThis, "fetch", async () =>
    json({ checkoutUrl, orderToken: "invalid" }),
  );
  await assert.rejects(createLeekPayCheckout("visa-basic"), PaymentApiError);
  assert.equal(request.mock.callCount(), 1);
  await assert.rejects(getLeekPayOrderStatus("invalid"), PaymentApiError);
  assert.equal(request.mock.callCount(), 1);
});

test("only the exact opaque fragment is accepted as an order reference", () => {
  assert.equal(readOrderToken(`#order=${orderToken}`), orderToken);
  for (const fragment of [
    "",
    `?order=${orderToken}`,
    "#status=paid",
    `#order=${orderToken}&status=paid`,
    `#order=${orderToken}&order=${orderToken}`,
    `#order=${"A".repeat(64)}`,
    "#order=invalid",
  ]) {
    assert.equal(readOrderToken(fragment), null);
  }
});

test("order verification sends only the token in an uncached POST body", async () => {
  mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `${LEEKPAY_API_BASE}/api/orders/status`);
    assert.equal(url.includes(orderToken), false);
    assert.deepEqual(JSON.parse(options.body), { orderToken });
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    return json(order);
  });
  assert.deepEqual(await getLeekPayOrderStatus(orderToken), order);
});

test("paid requires verified true, a known product and valid amount/currency", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const invalid of [
    { ...order, verified: false },
    { ...order, verified: "true" },
    { ...order, status: "pending" },
    { ...order, status: "unknown" },
    { ...order, productId: "unknown" },
    { ...order, amount: -1 },
    { ...order, amount: 5000.5 },
    { ...order, amount: "5000" },
    { ...order, currency: "EUR" },
  ]) {
    request.mock.mockImplementation(async () => json(invalid));
    await assert.rejects(getLeekPayOrderStatus(orderToken), PaymentApiError);
  }
});

test("pending and terminal failures are never returned as verified", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const status of ["pending", "processing", "failed", "cancelled", "expired"]) {
    request.mock.mockImplementation(async () =>
      json({ ...order, status, verified: false }),
    );
    const result = await getLeekPayOrderStatus(orderToken);
    assert.equal(result.status, status);
    assert.equal(result.verified, false);
  }
});

test("temporary missing orders and rate limits allow bounded polling retries", async () => {
  const request = mock.method(globalThis, "fetch", async () => json({}, 404));
  await assert.rejects(getLeekPayOrderStatus(orderToken), (error) =>
    error instanceof PaymentApiError && error.retryable,
  );
  request.mock.mockImplementation(async () => json({}, 429, { "Retry-After": "60" }));
  await assert.rejects(getLeekPayOrderStatus(orderToken), (error) =>
    error instanceof PaymentApiError && error.retryable && error.retryAfterMs === 60000,
  );
  request.mock.mockImplementation(async () => json({}, 400));
  await assert.rejects(getLeekPayOrderStatus(orderToken), (error) =>
    error instanceof PaymentApiError && !error.retryable,
  );
});

test("network and malformed responses expose no provider error details", async () => {
  const request = mock.method(globalThis, "fetch", async () => {
    throw new Error("PRIVATE UPSTREAM DETAIL");
  });
  await assert.rejects(getLeekPayOrderStatus(orderToken), (error) =>
    error instanceof PaymentApiError && error.message === "Payment service unavailable",
  );
  request.mock.mockImplementation(async () =>
    new Response("<html>Unexpected page</html>", { headers: { "Content-Type": "text/html" } }),
  );
  await assert.rejects(getLeekPayOrderStatus(orderToken), PaymentApiError);
});

test("cancelling the caller aborts the request without exposing its details", async () => {
  const controller = new AbortController();
  mock.method(globalThis, "fetch", async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("Aborted detail")));
      controller.abort();
    }),
  );
  await assert.rejects(getLeekPayOrderStatus(orderToken, controller.signal), PaymentApiError);
  assert.equal(controller.signal.aborted, true);
});

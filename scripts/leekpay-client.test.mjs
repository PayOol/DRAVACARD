import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import {
  LEEKPAY_API_BASE,
  PaymentApiError,
  createLeekPayCheckout,
  getLeekPayOrderStatus,
  readOrderToken,
} from "../src/lib/leekpay.ts";
import {
  normalizeCustomerEmail,
  normalizePaymentCustomer,
  normalizeWhatsAppNumber,
} from "../src/lib/payment-customer.ts";

const orderToken = "a".repeat(64);
const checkoutUrl = "https://leekpay.me/pay_example";
const customer = { email: "customer@example.com", whatsapp: "+12025550123" };
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

test("customer normalization requires both exact keys and returns a fresh normalized object", () => {
  const input = { email: " Customer+tag@EXAMPLE.com ", whatsapp: " +1 (202) 555-0123 " };
  const normalized = normalizePaymentCustomer(input);
  assert.deepEqual(normalized, { email: "Customer+tag@EXAMPLE.com", whatsapp: customer.whatsapp });
  assert.notEqual(normalized, input);
  assert.equal(input.email, " Customer+tag@EXAMPLE.com ");
  assert.deepEqual(Object.keys(normalized).sort(), ["email", "whatsapp"]);
  for (const invalid of [
    undefined,
    null,
    true,
    42,
    "customer@example.com",
    [],
    {},
    { email: customer.email },
    { whatsapp: customer.whatsapp },
    { ...customer, name: "Unrequested field" },
    { ...customer, customer_email: customer.email },
    { ...customer, toJSON: () => ({ injected: true }) },
    { ...customer, [Symbol("extra")]: true },
    Object.assign(Object.create({ email: customer.email }), { whatsapp: customer.whatsapp }),
  ]) {
    assert.equal(normalizePaymentCustomer(invalid), null);
  }
});

test("email validation preserves aliases and rejects missing, malformed and injected values", () => {
  assert.equal(normalizeCustomerEmail(" Customer+tag@EXAMPLE.com "), "Customer+tag@EXAMPLE.com");
  assert.equal(normalizeCustomerEmail("customer@sub.example.com"), "customer@sub.example.com");
  for (const email of [
    undefined, null, true, 123, {}, [], "", " ",
    "customer", "customer@localhost", "customer@@example.com", "@example.com",
    "customer @example.com", "customer@ example.com", "customer@exam ple.com",
    ".customer@example.com", "customer.@example.com", "cus..tomer@example.com",
    "customer@-example.com", "customer@example-.com", "customer@example..com",
    "customer@example.com.", "customer@127.0.0.1", "customer@example.c",
    "<script>@example.com", "customer@example.com<script>", '"customer"@example.com',
    "customer@example.com\r\nInjected: true", "\r\ncustomer@example.com",
    "customer@example.com\n", "customer\t@example.com", "customer\u0000@example.com",
    "custómér@example.com", "customer@éxample.com",
  ]) {
    assert.equal(normalizeCustomerEmail(email), null);
    assert.equal(normalizePaymentCustomer({ email, whatsapp: customer.whatsapp }), null);
  }
});

test("email validation enforces local, domain label, total and raw input length limits", () => {
  const domain = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(61)}`;
  const maximumEmail = `${"a".repeat(64)}@${domain}`;
  assert.equal(maximumEmail.length, 254);
  assert.equal(normalizeCustomerEmail(maximumEmail), maximumEmail);
  for (const email of [
    `${maximumEmail}c`,
    `${"a".repeat(65)}@example.com`,
    `customer@${"a".repeat(64)}.com`,
    `${" ".repeat(321)}${customer.email}`,
  ]) {
    assert.equal(normalizeCustomerEmail(email), null);
  }
});

test("WhatsApp normalization accepts only an explicit international plus prefix with 8 to 15 digits", () => {
  assert.equal(normalizeWhatsAppNumber(" +1 (202) 555-0123 "), customer.whatsapp);
  assert.equal(normalizeWhatsAppNumber("+12345678"), "+12345678");
  assert.equal(normalizeWhatsAppNumber("+123456789012345"), "+123456789012345");
  for (const whatsapp of [
    undefined, null, true, 12025550123, {}, [], "", " ",
    "12025550123", "2025550123", "0012025550123", "+0123456789",
    "+1234567", "+1234567890123456", "++12025550123", "+1+2025550123",
    "(+1)2025550123", "+1 202 555 0123 ext 2", "+12025550123x2",
    "+12025550123;2", "+12025550123#2", "+12025550123@example.com",
    "tel:+12025550123", "+1202CALLNOW", "+12025550123\r\n", "\n+12025550123",
    "+1\t2025550123", "+1\u00a02025550123", "+１2025550123", "<script>+12025550123</script>",
    `+${" ".repeat(40)}12025550123`,
  ]) {
    assert.equal(normalizeWhatsAppNumber(whatsapp), null);
    assert.equal(normalizePaymentCustomer({ email: customer.email, whatsapp }), null);
  }
});

test("checkout revalidates invalid customer data before any network request", async () => {
  const request = mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected request");
  });
  for (const invalid of [
    undefined,
    null,
    {},
    { email: customer.email },
    { whatsapp: customer.whatsapp },
    { email: "invalid", whatsapp: customer.whatsapp },
    { email: `${"a".repeat(65)}@example.com`, whatsapp: customer.whatsapp },
    { email: customer.email, whatsapp: "+12025550123\r\n" },
    { email: `${customer.email}\r\nInjected: true`, whatsapp: customer.whatsapp },
    { ...customer, amount: 1 },
    { ...customer, currency: "EUR" },
    { ...customer, return_url: "https://example.com/unrequested" },
  ]) {
    await assert.rejects(createLeekPayCheckout("visa-basic", invalid), (error) =>
      error instanceof PaymentApiError && !error.retryable,
    );
  }
  assert.equal(request.mock.callCount(), 0);
});

test("checkout sends only a catalogue product ID and normalized customer to the fixed proxy", async () => {
  const request = mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `${LEEKPAY_API_BASE}/api/checkout`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { productId: "visa-basic", customer });
    assert.equal(url.includes(customer.email), false);
    assert.equal(url.includes(customer.whatsapp), false);
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.headers.Authorization, undefined);
    return json({ checkoutUrl, orderToken });
  });
  assert.deepEqual(await createLeekPayCheckout("visa-basic", {
    email: " customer@example.com ",
    whatsapp: " +1 (202) 555-0123 ",
  }), {
    checkoutUrl,
    orderToken,
  });
  assert.equal(request.mock.callCount(), 1);
});

test("unknown products are rejected before any network request", async () => {
  const request = mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected request");
  });
  await assert.rejects(createLeekPayCheckout("unknown", customer), PaymentApiError);
  assert.equal(request.mock.callCount(), 0);
});

test("checkout accepts any HTTPS payment domain returned by the fixed proxy", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const hostname of [
    "leekpay.fr",
    "www.leekpay.fr",
    "leekpay.me",
    "www.leekpay.me",
    "app.zayono.com",
    "payments.example.com",
    "new-provider.example.net",
    "zayono.com",
    "www.app.zayono.com",
    "payments.zayono.com",
    "app-zayono.com",
    "leekpay.me.untrusted.invalid",
    "app.zayono.com.untrusted.invalid",
  ]) {
    const hostedCheckoutUrl = `https://${hostname}/checkout/example?session=example`;
    request.mock.mockImplementation(async () =>
      json({ checkoutUrl: hostedCheckoutUrl, orderToken }),
    );
    assert.deepEqual(await createLeekPayCheckout("visa-basic", customer), {
      checkoutUrl: hostedCheckoutUrl,
      orderToken,
    });
  }
});

test("checkout redirects still require absolute HTTPS without credentials or custom ports", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const unsafeUrl of [
    "http://leekpay.me/pay_example",
    "https://leekpay.me@untrusted.invalid/pay_example",
    "https://user:password@leekpay.me/pay_example",
    "https://leekpay.me:8443/pay_example",
    "http://app.zayono.com/checkout/example",
    "https://app.zayono.com@untrusted.invalid/checkout/example",
    "https://user:password@app.zayono.com/checkout/example",
    "https://app.zayono.com:8443/checkout/example",
    "http://payments.example.com/checkout/example",
    "https://user:password@payments.example.com/checkout/example",
    "https://payments.example.com:8443/checkout/example",
    "javascript:alert(1)",
    "data:text/html,example",
    "//payments.example.com/checkout/example",
    "/pay_example",
    `https://payments.example.com/${"a".repeat(2048)}`,
  ]) {
    request.mock.mockImplementation(async () =>
      json({ checkoutUrl: unsafeUrl, orderToken }),
    );
    await assert.rejects(createLeekPayCheckout("visa-basic", customer), PaymentApiError);
  }
});

test("an unrestricted hosted domain cannot bypass order-token validation", async () => {
  mock.method(globalThis, "fetch", async () => json({
    checkoutUrl: "https://new-provider.example.net/checkout/example",
    orderToken: "invalid",
  }));
  await assert.rejects(createLeekPayCheckout("visa-basic", customer), PaymentApiError);
});

test("invalid order tokens cannot launch a checkout or query an order", async () => {
  const request = mock.method(globalThis, "fetch", async () =>
    json({ checkoutUrl, orderToken: "invalid" }),
  );
  await assert.rejects(createLeekPayCheckout("visa-basic", customer), PaymentApiError);
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

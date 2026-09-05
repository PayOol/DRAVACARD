import { normalizePaymentCustomer } from "../../src/lib/payment-customer.ts";
import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js";

const SITE_ORIGIN = "https://drava.click";
const CHECKOUT_API = "https://leekpay.fr/api/v1/checkout";
const CURRENCY = "XOF";
const ORDER_TTL_SECONDS = 7 * 24 * 60 * 60;
const REQUEST_LIMIT_BYTES = 1024;
const PROVIDER_LIMIT_BYTES = 32 * 1024;
const PROVIDER_TIMEOUT_MS = 10_000;

// The browser selects a product, never its price, currency or redirect URLs.
const PRODUCTS = Object.freeze({
  "visa-basic": { amount: 5000, name: "VISA BASIQUE" },
  "mastercard-basic": { amount: 6000, name: "MASTERCARD BASIQUE" },
  "mastercard-premium": { amount: 8500, name: "MASTERCARD PREMIUM" },
  "mastercard-platinum": { amount: 15000, name: "MASTERCARD PLATINIUM" },
});

type ProductId = keyof typeof PRODUCTS;
type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired";
type Order = {
  version: 1;
  productId: ProductId;
  amount: number;
  currency: typeof CURRENCY;
  checkoutId: string;
  createdAt: number;
  expiresAt: number;
};

class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && Object.hasOwn(PRODUCTS, value);
}

function isCheckoutId(value: unknown): value is string {
  return typeof value === "string" && /^checkout_[A-Za-z0-9_-]{1,120}$/.test(value);
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === "pending" || value === "processing" || value === "paid" ||
    value === "failed" || value === "cancelled" || value === "expired";
}

function isOrder(value: unknown): value is Order {
  return isObject(value) && value.version === 1 && isProductId(value.productId) &&
    typeof value.amount === "number" && Number.isSafeInteger(value.amount) && value.amount >= 100 &&
    value.currency === CURRENCY && isCheckoutId(value.checkoutId) &&
    typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt) &&
    typeof value.expiresAt === "number" && Number.isSafeInteger(value.expiresAt) &&
    value.expiresAt === value.createdAt + ORDER_TTL_SECONDS * 1000;
}

function serviceReady(env: Env): boolean {
  return typeof env.LEEKPAY_SECRET_KEY === "string" &&
    env.LEEKPAY_SECRET_KEY.length >= 16 && !/\s/.test(env.LEEKPAY_SECRET_KEY) &&
    typeof env.ORDERS?.get === "function" && typeof env.ORDERS?.put === "function" &&
    typeof env.CREATE_LIMITER?.limit === "function" && typeof env.STATUS_LIMITER?.limit === "function";
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (origin === SITE_ORIGIN) return origin;
  // Explicit loopback opt-in; never switch production rate limiting to development.
  if (origin && Array.isArray(env.LOCAL_ORIGINS) && env.LOCAL_ORIGINS.some((allowed) => allowed === origin)) {
    try {
      const local = new URL(origin);
      if (local.origin === origin && local.protocol === "http:" &&
        (local.hostname === "localhost" || local.hostname === "127.0.0.1")) {
        return origin;
      }
    } catch { /* Invalid development configuration must fail closed. */ }
  }
  return null;
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Strict-Transport-Security": "max-age=31536000",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }
  if (status === 429) headers.set("Retry-After", "60");
  return new Response(JSON.stringify(body), { status, headers });
}

function locationResponse(request: Request, origin: string): Response {
  // Cloudflare supplies this metadata. Never infer location from client headers.
  const country: unknown = request.cf?.country;
  if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country) || !isSupportedCountry(country)) {
    return jsonResponse({ countryCode: null, callingCode: null }, 200, origin);
  }
  return jsonResponse({ countryCode: country, callingCode: `+${getCountryCallingCode(country)}` }, 200, origin);
}

async function readBoundedJson(body: ReadableStream<Uint8Array> | null, headers: Headers,
  limit: number, errorStatus: number, errorCode: string): Promise<unknown> {
  const declaredSize = headers.get("Content-Length");
  if (declaredSize && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > limit)) {
    throw new ApiError(errorStatus, errorCode);
  }
  if (!body) throw new ApiError(errorStatus, errorCode);
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let size = 0;
  let text = "";
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, PROVIDER_TIMEOUT_MS);
  try {
    while (true) {
      const chunk = await reader.read();
      if (timedOut) throw new ApiError(errorStatus, errorCode);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new ApiError(errorStatus, errorCode);
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch {
    throw new ApiError(errorStatus, errorCode);
  } finally {
    clearTimeout(timeout);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function requestJson(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") ?? "")) {
    throw new ApiError(415, "unsupported_media_type");
  }
  const result = await readBoundedJson(request.body, request.headers, REQUEST_LIMIT_BYTES, 400, "invalid_request");
  if (!isObject(result)) throw new ApiError(400, "invalid_request");
  return result;
}

async function providerJson(env: Env, checkoutId?: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(checkoutId ? `${CHECKOUT_API}/${checkoutId}` : CHECKOUT_API, {
      method: checkoutId ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${env.LEEKPAY_SECRET_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      console.error(JSON.stringify({
        event: "payment_provider_http_error",
        operation: checkoutId ? "status" : "create",
        status: response.status,
      }));
      throw new ApiError(502, "provider_unavailable");
    }
    if (!(response.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) {
      await response.body?.cancel();
      throw new ApiError(502, "provider_invalid_response");
    }
    const result = await readBoundedJson(response.body, response.headers, PROVIDER_LIMIT_BYTES, 502, "provider_invalid_response");
    if (!isObject(result) || result.success === false || !isObject(result.data)) {
      throw new ApiError(502, "provider_invalid_response");
    }
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(JSON.stringify({
      event: "payment_provider_transport_error",
      operation: checkoutId ? "status" : "create",
      kind: error instanceof TypeError ? "type_error" : controller.signal.aborted ? "timeout" : "network_error",
    }));
    throw new ApiError(502, "provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new ApiError(502, "provider_invalid_response");
  let url: URL;
  try { url = new URL(value); } catch { throw new ApiError(502, "provider_invalid_response"); }
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    !["leekpay.fr", "www.leekpay.fr", "leekpay.me", "www.leekpay.me"].includes(url.hostname)) {
    throw new ApiError(502, "provider_invalid_response");
  }
  return url.href;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function orderKey(token: string): Promise<string> {
  return `order:${hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))))}`;
}

async function enforceRateLimit(request: Request, env: Env, create: boolean): Promise<void> {
  const ip = request.headers.get("CF-Connecting-IP");
  const local = env.ENVIRONMENT === "development" && !ip;
  if (!local && (!ip || ip.length > 45 || !/^[a-f0-9:.]+$/i.test(ip))) {
    throw new ApiError(403, "request_forbidden");
  }
  const limiter = create ? env.CREATE_LIMITER : env.STATUS_LIMITER;
  try {
    const result = await limiter.limit({ key: `drava:${ip ?? "local-development"}` });
    if (!result.success) throw new ApiError(429, "rate_limited");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "service_unavailable");
  }
}

async function createCheckout(request: Request, env: Env, origin: string): Promise<Response> {
  const payload = await requestJson(request);
  if (Object.keys(payload).length !== 2 || !Object.hasOwn(payload, "productId") ||
    !Object.hasOwn(payload, "customer") || !isProductId(payload.productId)) {
    throw new ApiError(400, "invalid_product");
  }
  const customer = normalizePaymentCustomer(payload.customer);
  if (!customer) throw new ApiError(400, "invalid_customer");
  const productId = payload.productId;
  const product = PRODUCTS[productId];
  const orderToken = hex(crypto.getRandomValues(new Uint8Array(32)));
  const returnUrl = `${SITE_ORIGIN}/payment-success/#order=${orderToken}`;
  const data = await providerJson(env, undefined, {
    amount: product.amount,
    currency: CURRENCY,
    description: `DRAVA — ${product.name}`,
    return_url: returnUrl,
    cancel_url: `${SITE_ORIGIN}/payment-failure/#order=${orderToken}`,
    customer_email: customer.email,
    customer_phone: customer.whatsapp,
    metadata: { productId },
  });
  if (!isCheckoutId(data.id) || data.amount !== product.amount || data.currency !== CURRENCY ||
    (data.status !== "pending" && data.status !== "processing") ||
    (data.return_url !== undefined && data.return_url !== returnUrl)) {
    throw new ApiError(502, "provider_invalid_response");
  }
  const checkoutUrl = safeCheckoutUrl(data.payment_url);
  const createdAt = Date.now();
  const order: Order = {
    version: 1, productId, amount: product.amount, currency: CURRENCY,
    checkoutId: data.id, createdAt, expiresAt: createdAt + ORDER_TTL_SECONDS * 1000,
  };
  // Do not return a payable URL until the immutable verification record is saved.
  await env.ORDERS.put(await orderKey(orderToken), JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });
  return jsonResponse({ checkoutUrl, orderToken }, 201, origin);
}

async function orderStatus(request: Request, env: Env, origin: string): Promise<Response> {
  const payload = await requestJson(request);
  if (Object.keys(payload).length !== 1 || typeof payload.orderToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(payload.orderToken)) {
    throw new ApiError(400, "invalid_order");
  }
  // Only the token hash is a KV key. No token, card detail or customer PII is stored.
  const stored: unknown = await env.ORDERS.get(await orderKey(payload.orderToken), "json");
  if (stored === null) throw new ApiError(404, "order_not_found");
  if (!isOrder(stored)) throw new ApiError(503, "service_unavailable");
  if (stored.expiresAt <= Date.now()) throw new ApiError(404, "order_not_found");
  const data = await providerJson(env, stored.checkoutId);
  if (data.id !== stored.checkoutId || data.amount !== stored.amount || data.currency !== stored.currency ||
    !isPaymentStatus(data.status)) {
    throw new ApiError(502, "provider_invalid_response");
  }
  return jsonResponse({
    status: data.status,
    verified: data.status === "paid",
    productId: stored.productId,
    amount: stored.amount,
    currency: stored.currency,
  }, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health" && request.method === "GET" && !url.search) {
        const ready = serviceReady(env);
        return jsonResponse({ status: ready ? "ready" : "unavailable" }, ready ? 200 : 503, origin);
      }
      if (url.pathname === "/api/location") {
        if (url.search) throw new ApiError(404, "not_found");
        if (!origin) throw new ApiError(403, "origin_forbidden");
        if (request.method === "OPTIONS") {
          if (request.headers.get("Access-Control-Request-Method") !== "GET" ||
            (request.headers.get("Access-Control-Request-Headers") ?? "").trim() !== "") {
            throw new ApiError(403, "request_forbidden");
          }
          return new Response(null, { status: 204, headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Max-Age": "600",
            "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
            "Cache-Control": "no-store",
          } });
        }
        if (request.method !== "GET") throw new ApiError(405, "method_not_allowed");
        // Country detection requires no payment secret, provider call or order storage.
        await enforceRateLimit(request, env, false);
        return locationResponse(request, origin);
      }
      const create = url.pathname === "/api/checkout";
      if ((!create && url.pathname !== "/api/orders/status") || url.search) {
        throw new ApiError(404, "not_found");
      }
      if (!origin) throw new ApiError(403, "origin_forbidden");
      if (request.method === "OPTIONS") {
        if (request.headers.get("Access-Control-Request-Method") !== "POST" ||
          (request.headers.get("Access-Control-Request-Headers") ?? "").split(",").some((h) => h.trim().toLowerCase() !== "content-type")) {
          throw new ApiError(403, "request_forbidden");
        }
        return new Response(null, { status: 204, headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
          "Cache-Control": "no-store",
        } });
      }
      if (request.method !== "POST") throw new ApiError(405, "method_not_allowed");
      if (!serviceReady(env)) throw new ApiError(503, "service_unavailable");
      await enforceRateLimit(request, env, create);
      return await (create ? createCheckout(request, env, origin) : orderStatus(request, env, origin));
    } catch (error) {
      if (error instanceof ApiError) return jsonResponse({ error: { code: error.code } }, error.status, origin);
      // Do not log requests, tokens, provider responses or exception messages.
      console.error(JSON.stringify({ event: "payment_proxy_error", code: "internal_error" }));
      return jsonResponse({ error: { code: "service_unavailable" } }, 503, origin);
    }
  },
} satisfies ExportedHandler<Env>;

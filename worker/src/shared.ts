import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js";

export const SITE_ORIGIN = "https://drava.click";
export const ORDER_TTL_SECONDS = 7 * 24 * 60 * 60;
const PROVIDER_TIMEOUT_MS = 10_000;
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

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (origin === SITE_ORIGIN) return origin;
  // Explicit loopback opt-in; never switch production rate limiting to development.
  if (
    origin &&
    Array.isArray(env.LOCAL_ORIGINS) &&
    env.LOCAL_ORIGINS.some((allowed) => allowed === origin)
  ) {
    try {
      const local = new URL(origin);
      if (
        local.origin === origin &&
        local.protocol === "http:" &&
        (local.hostname === "localhost" || local.hostname === "127.0.0.1")
      ) {
        return origin;
      }
    } catch {
      /* Invalid development configuration must fail closed. */
    }
  }
  return null;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Origin",
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
  if (
    typeof country !== "string" ||
    !/^[A-Z]{2}$/.test(country) ||
    !isSupportedCountry(country)
  ) {
    return jsonResponse({ countryCode: null, callingCode: null }, 200, origin);
  }
  return jsonResponse(
    { countryCode: country, callingCode: `+${getCountryCallingCode(country)}` },
    200,
    origin,
  );
}

async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  headers: Headers,
  limit: number,
  errorStatus: number,
  errorCode: string,
): Promise<unknown> {
  const declaredSize = headers.get("Content-Length");
  if (
    declaredSize &&
    (!/^\d+$/.test(declaredSize) || Number(declaredSize) > limit)
  ) {
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

async function requestJson(
  request: Request,
  limit = 4096,
): Promise<Record<string, unknown>> {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("Content-Type") ?? "",
    )
  ) {
    throw new ApiError(415, "unsupported_media_type");
  }
  const result = await readBoundedJson(
    request.body,
    request.headers,
    limit,
    400,
    "invalid_request",
  );
  if (!isObject(result)) throw new ApiError(400, "invalid_request");
  return result;
}

function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048)
    throw new ApiError(502, "provider_invalid_response");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(502, "provider_invalid_response");
  }
  // The authenticated LeekPay response determines its payment processor host.
  // This URL is returned for browser navigation, never fetched by the Worker.
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new ApiError(502, "provider_invalid_response");
  }
  return url.href;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function orderKey(token: string): Promise<string> {
  return `order:${hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))))}`;
}

async function enforceRateLimit(
  request: Request,
  env: Env,
  create: boolean,
): Promise<void> {
  const ip = request.headers.get("CF-Connecting-IP");
  const local = env.ENVIRONMENT === "development" && !ip;
  if (!local && (!ip || ip.length > 45 || !/^[a-f0-9:.]+$/i.test(ip))) {
    throw new ApiError(403, "request_forbidden");
  }
  const limiter = create ? env.CREATE_LIMITER : env.STATUS_LIMITER;
  try {
    const result = await limiter.limit({
      key: `drava:${ip ?? "local-development"}`,
    });
    if (!result.success) throw new ApiError(429, "rate_limited");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "service_unavailable");
  }
}

function nonempty(value: unknown, max = 200): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    Array.from(value).every(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
  );
}

function secret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 512 &&
    !/\s/.test(value)
  );
}

function exactKeys(payload: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(payload).some((key) => !allowed.includes(key)))
    throw new ApiError(400, "invalid_request");
}

export {
  ApiError,
  isObject,
  allowedOrigin,
  jsonResponse,
  locationResponse,
  readBoundedJson,
  requestJson,
  safeCheckoutUrl,
  hex,
  orderKey,
  enforceRateLimit,
  nonempty,
  secret,
  exactKeys,
};

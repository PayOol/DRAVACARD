import type { PaymentEnv } from "./payment-types.ts";
import {
  PAYMENT_ROUTES,
  handlePaymentRequest,
  paymentMethod,
} from "./payments.ts";
import { providerCatalog } from "./providers.ts";
import {
  ApiError,
  allowedOrigin,
  enforceRateLimit,
  jsonResponse,
  locationResponse,
} from "./shared.ts";

function serviceReady(env: PaymentEnv): boolean {
  return (
    providerCatalog(env).some((provider) => provider.available) &&
    typeof env.ORDERS?.get === "function" &&
    typeof env.ORDERS?.put === "function" &&
    typeof env.CREATE_LIMITER?.limit === "function" &&
    typeof env.STATUS_LIMITER?.limit === "function"
  );
}

export default {
  async fetch(request: Request, env: PaymentEnv): Promise<Response> {
    const origin = allowedOrigin(request, env);
    try {
      const url = new URL(request.url);
      if (
        url.pathname === "/health" &&
        request.method === "GET" &&
        !url.search
      ) {
        const ready = serviceReady(env);
        return jsonResponse(
          { status: ready ? "ready" : "unavailable" },
          ready ? 200 : 503,
          origin,
        );
      }
      const location = url.pathname === "/api/location";
      const route = Object.hasOwn(PAYMENT_ROUTES, url.pathname)
        ? PAYMENT_ROUTES[url.pathname as keyof typeof PAYMENT_ROUTES]
        : undefined;
      if ((!location && !route) || url.search)
        throw new ApiError(404, "not_found");
      if (!origin) throw new ApiError(403, "origin_forbidden");
      const method = route ? paymentMethod(route) : "GET";
      if (request.method === "OPTIONS") {
        const requestedHeaders =
          request.headers.get("Access-Control-Request-Headers") ?? "";
        if (
          request.headers.get("Access-Control-Request-Method") !== method ||
          (method === "GET"
            ? requestedHeaders.trim() !== ""
            : requestedHeaders
                .split(",")
                .some(
                  (header) => header.trim().toLowerCase() !== "content-type",
                ))
        ) {
          throw new ApiError(403, "request_forbidden");
        }
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": method,
            ...(method === "POST"
              ? { "Access-Control-Allow-Headers": "Content-Type" }
              : {}),
            "Access-Control-Max-Age": "600",
            Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
            "Cache-Control": "no-store",
          },
        });
      }
      if (request.method !== method)
        throw new ApiError(405, "method_not_allowed");
      await enforceRateLimit(request, env, route === "checkout");
      // Location depends only on Cloudflare metadata, never on a payment provider.
      if (location) return locationResponse(request, origin);
      if (!route) throw new ApiError(404, "not_found");
      return await handlePaymentRequest(request, env, origin, route);
    } catch (error) {
      if (error instanceof ApiError)
        return jsonResponse(
          { error: { code: error.code } },
          error.status,
          origin,
        );
      console.error(
        JSON.stringify({
          event: "payment_proxy_error",
          code: "internal_error",
        }),
      );
      return jsonResponse(
        { error: { code: "service_unavailable" } },
        503,
        origin,
      );
    }
  },
} satisfies ExportedHandler<PaymentEnv>;

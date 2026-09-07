import type { CheckoutReturn, PaymentEnv, ProviderIntent, ProviderTransaction } from "./payment-types.ts";
import { ApiError, isObject, secret } from "./shared.ts";

function soleasPayFailureUrl(intent: ProviderIntent): string {
  if (intent.metadata.service !== "tiktok") return intent.cancelUrl;
  const url = new URL(intent.cancelUrl);
  url.searchParams.set("drava_return", "failure");
  return url.toString();
}

// The documented HTML checkout exposes a plugin-scoped merchant API key.
// Never configure a key with privileges outside the plugin context.
export function buildSoleasPayCheckoutRequest(
  env: PaymentEnv,
  intent: ProviderIntent,
  feeBearer?: "CUSTOMER" | "MERCHANT",
): { url: string; init: RequestInit } {
  if (!secret(env.SOLEASPAY_API_KEY))
    throw new ApiError(503, "provider_unavailable");
  if (
    !Number.isSafeInteger(intent.amount) || intent.amount <= 0 ||
    !["XAF", "XOF"].includes(intent.currency) ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(intent.orderId) ||
    (feeBearer !== undefined && feeBearer !== "CUSTOMER" && feeBearer !== "MERCHANT")
  ) throw new ApiError(400, "invalid_payment");

  return {
    url: "https://pay.soleaspay.com",
    init: {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: env.SOLEASPAY_API_KEY,
        amount: intent.amount,
        currency: intent.currency,
        orderId: intent.orderId,
        description: intent.description,
        shopName: "DRAVA",
        successUrl: intent.returnUrl,
        failureUrl: soleasPayFailureUrl(intent),
        customer: { name: intent.customer.name, email: intent.customer.email },
        ...(feeBearer === undefined ? {} : { feeBearer }),
      }),
    },
  };
}

export function soleasPayCheckoutForm(env: PaymentEnv, intent: ProviderIntent) {
  const request = buildSoleasPayCheckoutRequest(env, intent);
  const payload = JSON.parse(String(request.init.body));
  // Optional customer prefill is omitted: the documented HTML example contains
  // scalar fields only and does not specify an encoding for nested customers.
  const { customer: _customer, ...fields } = payload;
  return {
    action: request.url,
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)])),
  };
}

// Checkout v4 trust contract explicitly requested by the merchant: process
// soleaspay_data automatically, without inventing a gateway/status API. These
// checks bind the reported result to the server order, not to a signed sender.
export function validateSoleasPayReturn(value: unknown, order: ProviderTransaction): CheckoutReturn {
  if (
    !isObject(value) || order.provider !== "soleaspay" ||
    typeof value.transaction_reference !== "string" ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(value.transaction_reference) ||
    value.invoice_reference !== order.orderId ||
    value.amount !== order.providerAmount || value.currency !== order.providerCurrency ||
    typeof value.status !== "string" || !/^[A-Z_]{1,40}$/.test(value.status) ||
    (["SUCCESS", "COMPLETED"].includes(value.status)
      ? value.success !== undefined && value.success !== true
      : value.success !== false) ||
    (value.reference !== undefined && value.reference !== value.transaction_reference) ||
    (value.operation !== undefined && value.operation !== "COLLECTION")
  ) throw new ApiError(400, "invalid_payment_return");
  return {
    transaction_reference: value.transaction_reference,
    invoice_reference: order.orderId,
    status: value.status,
    ...(typeof value.success === "boolean" ? { success: value.success } : {}),
    amount: order.providerAmount,
    currency: order.providerCurrency,
  };
}

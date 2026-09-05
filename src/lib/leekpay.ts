import {
  type PaymentCustomer,
  normalizePaymentCustomer,
} from "./payment-customer.ts";

export const LEEKPAY_API_BASE =
  "https://drava-leekpay.sebpay-proxy.workers.dev";
export const LEEKPAY_CHECKOUT_CURRENCY = "XOF" as const;

export interface PaymentCardSelection {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly displayCurrency: string;
}

export interface LeekPayCheckout {
  readonly checkoutUrl: string;
  readonly orderToken: string;
}

export type LeekPayOrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export interface LeekPayOrder {
  readonly status: LeekPayOrderStatus;
  readonly verified: boolean;
  readonly productId: string;
  readonly amount: number;
  readonly currency: typeof LEEKPAY_CHECKOUT_CURRENCY;
}

export class PaymentApiError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number;

  constructor(retryable = true, retryAfterMs = 0) {
    super("Payment service unavailable");
    this.name = "PaymentApiError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

const productIds = new Set([
  "visa-basic",
  "mastercard-basic",
  "mastercard-premium",
  "mastercard-platinum",
]);
const checkoutHosts = new Set([
  "leekpay.fr",
  "www.leekpay.fr",
  "leekpay.me",
  "www.leekpay.me",
]);
const orderStatuses = new Set<LeekPayOrderStatus>([
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidOrderToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function readOrderToken(fragment: string): string | null {
  const match = /^#order=([a-f0-9]{64})$/.exec(fragment);
  return match?.[1] ?? null;
}

function isSafeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      checkoutHosts.has(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

async function requestPaymentApi(
  path: "/api/checkout" | "/api/orders/status",
  body: { productId: string; customer: PaymentCustomer } | { orderToken: string },
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 20000);

  try {
    const response = await fetch(`${LEEKPAY_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new PaymentApiError(
        response.status === 404 ||
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 60000)
          : 0,
      );
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new PaymentApiError(false);
    }
    const text = await response.text();
    if (text.length > 16384) throw new PaymentApiError(false);
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof PaymentApiError) throw error;
    throw new PaymentApiError();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function createLeekPayCheckout(
  productId: string,
  customer: PaymentCustomer,
  signal?: AbortSignal,
): Promise<LeekPayCheckout> {
  if (!productIds.has(productId)) throw new PaymentApiError(false);
  const normalizedCustomer = normalizePaymentCustomer(customer);
  if (!normalizedCustomer) throw new PaymentApiError(false);
  const data = await requestPaymentApi(
    "/api/checkout",
    {
      productId,
      customer: {
        email: normalizedCustomer.email,
        whatsapp: normalizedCustomer.whatsapp,
      },
    },
    signal,
  );
  if (
    !isRecord(data) ||
    !isSafeCheckoutUrl(data.checkoutUrl) ||
    !isValidOrderToken(data.orderToken)
  ) {
    throw new PaymentApiError(false);
  }
  return { checkoutUrl: data.checkoutUrl, orderToken: data.orderToken };
}

export async function getLeekPayOrderStatus(
  orderToken: string,
  signal?: AbortSignal,
): Promise<LeekPayOrder> {
  if (!isValidOrderToken(orderToken)) throw new PaymentApiError(false);
  const data = await requestPaymentApi(
    "/api/orders/status",
    { orderToken },
    signal,
  );
  if (
    !isRecord(data) ||
    typeof data.status !== "string" ||
    !orderStatuses.has(data.status as LeekPayOrderStatus) ||
    data.verified !== (data.status === "paid") ||
    typeof data.productId !== "string" ||
    !productIds.has(data.productId) ||
    typeof data.amount !== "number" ||
    !Number.isSafeInteger(data.amount) ||
    data.amount <= 0 ||
    data.currency !== LEEKPAY_CHECKOUT_CURRENCY
  ) {
    throw new PaymentApiError(false);
  }
  return {
    status: data.status as LeekPayOrderStatus,
    verified: data.verified,
    productId: data.productId,
    amount: data.amount,
    currency: data.currency,
  };
}

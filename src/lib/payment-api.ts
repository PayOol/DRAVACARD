import {
  normalizePaymentCustomer,
  type PaymentCustomer,
} from "./payment-customer.ts";
import {
  normalizeTikTokCustomer,
  type TikTokCustomer,
} from "./tiktok-customer.ts";
import {
  PAYMENT_PROVIDERS,
  isPaymentProvider,
  type PaymentProvider,
} from "./payment-providers.ts";

export type { PaymentProvider } from "./payment-providers.ts";
export const PAYMENT_API_BASE =
  "https://drava-leekpay.sebpay-proxy.workers.dev";
export type PaymentService = "cards" | "tiktok";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";
export interface PaymentSelection {
  service: PaymentService;
  productId: string;
  customCoins?: number;
}
export interface PaymentInput {
  country: string;
  operator: string;
  phone: string;
  otpCode?: string;
}
export interface PaymentCheckoutInput {
  selection: PaymentSelection;
  provider: PaymentProvider;
  customer: PaymentCustomer | TikTokCustomer;
  consent: boolean;
  payment?: PaymentInput;
}
export interface PaymentCheckout {
  service: PaymentService;
  productId: string;
  provider: PaymentProvider;
  orderToken: string;
  checkoutUrl?: string;
  providerLink?: string;
  status: "pending" | "processing";
  amount: number;
  currency: string;
  coins?: number;
  bonus?: number;
}
export interface PaymentOrder {
  service: PaymentService;
  productId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  verified: boolean;
  amount: number;
  currency: string;
  createdAt?: number;
  orderId?: string;
  coins?: number;
  bonus?: number;
  packId?: string;
  notification?: "pending" | "sent";
  username?: string;
  transactionReference?: string;
}
export interface SebPayCountry {
  id: string | number;
  code: string;
  name: string;
  prefix: string;
  currency: string;
  exchangeRate: number;
  operators: {
    id: string | number;
    code: string;
    name: string;
    otpRequired: boolean;
    ussdCode?: string | null;
  }[];
}
export interface SebPayQuote {
  amount: number;
  fee: number;
  total: number;
  currency: string;
  collectionAmount: number;
  otpRequired: boolean;
  ussdCode: string | null;
}
export class PaymentApiError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number;
  readonly code?: string;
  constructor(retryable = true, retryAfterMs = 0, code?: string) {
    super("Payment service unavailable");
    this.name = "PaymentApiError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.code = code;
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const currency = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value);
const receiptText = (value: unknown, max: number): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  ![...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
const statuses = new Set([
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
]);
const cardIds = new Set([
  "visa-basic",
  "mastercard-basic",
  "mastercard-premium",
  "mastercard-platinum",
]);
const packIds = new Set([
  "mini",
  "starter",
  "boost",
  "live",
  "creator",
  "max",
  "custom",
]);
export const isValidOrderToken = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function readOrderToken(fragment: string): string | null {
  return /^#order=([a-f0-9]{64})$/.exec(fragment)?.[1] ?? null;
}
export function isSafePaymentUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.port && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

function selectionBody(selection: PaymentSelection) {
  const { service, productId, customCoins } = selection;
  if (
    (service !== "cards" && service !== "tiktok") ||
    !(service === "cards" ? cardIds : packIds).has(productId) ||
    (productId === "custom" &&
      (!positive(customCoins) || customCoins < 70 || customCoins > 1000000)) ||
    (productId !== "custom" && customCoins !== undefined)
  )
    throw new PaymentApiError(false);
  return {
    service,
    productId,
    ...(productId === "custom" ? { customCoins } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new PaymentApiError(false);
  const declared = response.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 131072)) {
    await response.body?.cancel();
    throw new PaymentApiError(false);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new PaymentApiError(false);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 131072) throw new PaymentApiError(false);
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
}

// The only payment HTTP transport: all services share its origin and protections.
async function requestPaymentApi(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${PAYMENT_API_BASE}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      const retry = Number(response.headers.get("retry-after"));
      let code: string | undefined;
      try {
        const error = await readJson(response);
        if (
          record(error) &&
          record(error.error) &&
          typeof error.error.code === "string" &&
          [
            "service_unavailable",
            "service_not_ready",
            "fulfillment_unavailable",
            "provider_unavailable",
            "invalid_customer",
            "invalid_payment",
            "consent_required",
          ].includes(error.error.code)
        )
          code = error.error.code;
      } catch {
        /* Provider response details must never escape this adapter. */
      }
      throw new PaymentApiError(
        [404, 408, 429].includes(response.status) || response.status >= 500,
        Number.isFinite(retry) && retry > 0 ? Math.min(60000, retry * 1000) : 0,
        code,
      );
    }
    return await readJson(response);
  } catch (error) {
    if (error instanceof PaymentApiError) throw error;
    throw new PaymentApiError();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function getPaymentProviders(
  signal?: AbortSignal,
): Promise<{ id: PaymentProvider; available: boolean }[]> {
  const data = await requestPaymentApi("/api/providers", undefined, signal);
  if (
    !record(data) ||
    !Array.isArray(data.providers) ||
    data.providers.length !== PAYMENT_PROVIDERS.length ||
    data.providers.some(
      (item) =>
        !record(item) ||
        !isPaymentProvider(item.id) ||
        typeof item.available !== "boolean",
    ) ||
    new Set(data.providers.map((item) => item.id)).size !==
      PAYMENT_PROVIDERS.length
  )
    throw new PaymentApiError(false);
  return data.providers.map((item) => ({
    id: item.id,
    available: item.available,
  }));
}

export async function createPaymentCheckout(
  input: PaymentCheckoutInput,
  signal?: AbortSignal,
): Promise<PaymentCheckout> {
  const selection = selectionBody(input.selection);
  const customer =
    selection.service === "tiktok"
      ? normalizeTikTokCustomer(input.customer as TikTokCustomer)
      : normalizePaymentCustomer(input.customer);
  if (!customer || input.consent !== true || !isPaymentProvider(input.provider))
    throw new PaymentApiError(false);
  const data = await requestPaymentApi(
    "/api/checkout",
    {
      ...selection,
      provider: input.provider,
      customer,
      consent: true,
      ...(input.payment
        ? {
            payment: {
              country: input.payment.country,
              operator: input.payment.operator,
              phone: input.payment.phone,
              ...(input.payment.otpCode
                ? { otpCode: input.payment.otpCode }
                : {}),
            },
          }
        : {}),
    },
    signal,
  );
  if (
    !record(data) ||
    data.service !== selection.service ||
    data.productId !== selection.productId ||
    !isValidOrderToken(data.orderToken) ||
    data.provider !== input.provider ||
    !["pending", "processing"].includes(String(data.status)) ||
    !positive(data.amount) ||
    !currency(data.currency) ||
    data.currency !== (selection.service === "cards" ? "XOF" : "XAF") ||
    (selection.service === "tiktok" &&
      (!positive(data.coins) || !nonnegative(data.bonus))) ||
    (data.checkoutUrl !== undefined && !isSafePaymentUrl(data.checkoutUrl)) ||
    (data.providerLink != null && !isSafePaymentUrl(data.providerLink)) ||
    (PAYMENT_PROVIDERS.find((item) => item.id === input.provider)?.flow ===
      "redirect" &&
      !isSafePaymentUrl(data.checkoutUrl))
  )
    throw new PaymentApiError(false);
  return {
    service: selection.service,
    productId: selection.productId,
    provider: input.provider,
    orderToken: data.orderToken,
    status: data.status as PaymentCheckout["status"],
    amount: data.amount,
    currency: data.currency,
    ...(selection.service === "tiktok"
      ? { coins: data.coins as number, bonus: data.bonus as number }
      : {}),
    ...(isSafePaymentUrl(data.checkoutUrl)
      ? { checkoutUrl: data.checkoutUrl }
      : {}),
    ...(isSafePaymentUrl(data.providerLink)
      ? { providerLink: data.providerLink }
      : {}),
  };
}

export async function getPaymentOrderStatus(
  orderToken: string,
  signal?: AbortSignal,
): Promise<PaymentOrder> {
  if (!isValidOrderToken(orderToken)) throw new PaymentApiError(false);
  const data = await requestPaymentApi(
    "/api/orders/status",
    { orderToken },
    signal,
  );
  if (!record(data)) throw new PaymentApiError(false);
  // Older card receipts have no discriminator; they remain readable during rollout.
  const service =
    data.service ?? (cardIds.has(String(data.productId)) ? "cards" : undefined);
  const provider =
    data.provider ?? (service === "cards" ? "leekpay" : undefined);
  const productId = data.productId;
  if (
    (service !== "cards" && service !== "tiktok") ||
    !isPaymentProvider(provider) ||
    typeof productId !== "string" ||
    !(service === "cards" ? cardIds : packIds).has(productId) ||
    !statuses.has(String(data.status)) ||
    data.verified !== (data.status === "paid") ||
    !positive(data.amount) ||
    !currency(data.currency) ||
    data.currency !== (service === "cards" ? "XOF" : "XAF") ||
    (data.createdAt !== undefined &&
      (!positive(data.createdAt) || data.createdAt > 8640000000000000)) ||
    (data.orderId !== undefined &&
      (typeof data.orderId !== "string" ||
        !/^[A-Za-z0-9_-]{1,150}$/.test(data.orderId))) ||
    (service === "tiktok" &&
      (!positive(data.coins) ||
        !nonnegative(data.bonus) ||
        !positive(data.createdAt) ||
        !data.orderId ||
        !["pending", "sent"].includes(String(data.notification)))) ||
    (data.status === "paid" &&
      ((service === "tiktok" &&
        data.username !== undefined &&
        !receiptText(data.username, 254)) ||
        (data.transactionReference !== undefined &&
          !receiptText(data.transactionReference, 129))))
  )
    throw new PaymentApiError(false);
  return {
    service,
    productId,
    provider,
    status: data.status as PaymentStatus,
    verified: data.verified,
    amount: data.amount,
    currency: data.currency,
    ...(data.createdAt !== undefined
      ? { createdAt: data.createdAt as number }
      : {}),
    ...(data.orderId !== undefined ? { orderId: data.orderId as string } : {}),
    ...(service === "tiktok"
      ? {
          packId: productId,
          coins: data.coins as number,
          bonus: data.bonus as number,
          notification: data.notification as "pending" | "sent",
        }
      : {}),
    ...(service === "tiktok" &&
    data.status === "paid" &&
    typeof data.username === "string"
      ? { username: data.username }
      : {}),
    ...(data.status === "paid" && typeof data.transactionReference === "string"
      ? { transactionReference: data.transactionReference }
      : {}),
  };
}

export async function getSebPayCountries(
  signal?: AbortSignal,
): Promise<SebPayCountry[]> {
  const data = await requestPaymentApi(
    "/api/providers/sebpay/countries",
    undefined,
    signal,
  );
  if (
    !record(data) ||
    !Array.isArray(data.countries) ||
    !data.countries.length ||
    data.countries.length > 250
  )
    throw new PaymentApiError(false);
  return data.countries.map((item) => {
    if (
      !record(item) ||
      !["string", "number"].includes(typeof item.id) ||
      typeof item.code !== "string" ||
      !/^[A-Z]{2}$/.test(item.code) ||
      typeof item.name !== "string" ||
      item.name.length > 100 ||
      typeof item.prefix !== "string" ||
      !/^[1-9][0-9]{0,3}$/.test(item.prefix) ||
      !currency(item.currency) ||
      typeof item.exchangeRate !== "number" ||
      !Number.isFinite(item.exchangeRate) ||
      item.exchangeRate <= 0 ||
      !Array.isArray(item.operators) ||
      item.operators.length > 100
    )
      throw new PaymentApiError(false);
    const operators = item.operators.map((op) => {
      if (
        !record(op) ||
        !["string", "number"].includes(typeof op.id) ||
        typeof op.code !== "string" ||
        op.code.length > 100 ||
        typeof op.name !== "string" ||
        op.name.length > 100 ||
        typeof op.otpRequired !== "boolean" ||
        (op.ussdCode !== undefined &&
          op.ussdCode !== null &&
          (typeof op.ussdCode !== "string" || op.ussdCode.length > 200))
      )
        throw new PaymentApiError(false);
      return {
        id: op.id as string | number,
        code: op.code,
        name: op.name,
        otpRequired: op.otpRequired,
        ussdCode: typeof op.ussdCode === "string" ? op.ussdCode : null,
      };
    });
    return {
      id: item.id as string | number,
      code: item.code,
      name: item.name,
      prefix: item.prefix,
      currency: item.currency,
      exchangeRate: item.exchangeRate,
      operators,
    };
  });
}

export async function getSebPayQuote(
  input: {
    selection: PaymentSelection;
    country: string;
    operator: string;
  },
  signal?: AbortSignal,
): Promise<SebPayQuote> {
  const data = await requestPaymentApi(
    "/api/providers/sebpay/quote",
    {
      ...selectionBody(input.selection),
      country: input.country,
      operator: input.operator,
    },
    signal,
  );
  if (
    !record(data) ||
    !positive(data.amount) ||
    !nonnegative(data.fee) ||
    !positive(data.total) ||
    data.total !== data.amount + data.fee ||
    !positive(data.collectionAmount) ||
    !currency(data.currency) ||
    typeof data.otpRequired !== "boolean" ||
    (data.ussdCode !== null &&
      (typeof data.ussdCode !== "string" || data.ussdCode.length > 200))
  )
    throw new PaymentApiError(false);
  return {
    amount: data.amount,
    fee: data.fee,
    total: data.total,
    collectionAmount: data.collectionAmount,
    currency: data.currency,
    otpRequired: data.otpRequired,
    ussdCode: data.ussdCode,
  };
}

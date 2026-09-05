import {
  createPaymentCheckout,
  getPaymentOrderStatus,
  getPaymentProviders,
  getSebPayCountries,
  getSebPayQuote,
  isSafePaymentUrl,
  PaymentApiError,
  type PaymentInput,
} from "./payment-api.ts";
import {
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_NAMES,
  type PaymentProvider,
} from "./payment-providers.ts";
import type { TikTokCustomer } from "./tiktok-customer.ts";
export {
  normalizeTikTokCustomer,
  type TikTokCustomer,
} from "./tiktok-customer.ts";
export type { SebPayCountry, SebPayQuote } from "./payment-api.ts";
export type TikTokProvider = PaymentProvider;
export type TikTokPaymentInput = PaymentInput;
export const TIKTOK_PROVIDERS: TikTokProvider[] = PAYMENT_PROVIDERS.map(
  ({ id }) => id,
);
export const TIKTOK_PROVIDER_NAMES = PAYMENT_PROVIDER_NAMES;
export const safeTikTokPaymentUrl = isSafePaymentUrl;
export const getTikTokProviders = getPaymentProviders;
export const getTikTokSebPayCountries = getSebPayCountries;
export interface TikTokOrder {
  status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "expired";
  verified: boolean;
  provider: TikTokProvider;
  packId: string;
  coins: number;
  bonus: number;
  amount: number;
  currency: string;
  createdAt: number;
  orderId: string;
  notification: "pending" | "sent";
  // Receipt-only details from a verified response; never persisted in history.
  username?: string;
  transactionReference?: string;
}
export interface TikTokCheckoutResponse {
  orderToken: string;
  checkoutUrl?: string;
  providerLink?: string;
  status: "pending" | "processing";
  provider: TikTokProvider;
  amount: number;
  currency: string;
  coins: number;
  bonus: number;
}

// Service adapters only select products and validate service-specific receipts.
// Provider transport and lifecycle are shared with every other service.
export async function createTikTokCheckout(
  input: {
    packId: string;
    customCoins?: number;
    provider: TikTokProvider;
    customer: TikTokCustomer;
    consent: boolean;
    payment?: PaymentInput;
  },
  signal?: AbortSignal,
): Promise<TikTokCheckoutResponse> {
  const result = await createPaymentCheckout(
    {
      selection: {
        service: "tiktok",
        productId: input.packId,
        ...(input.customCoins === undefined
          ? {}
          : { customCoins: input.customCoins }),
      },
      provider: input.provider,
      customer: input.customer,
      consent: input.consent,
      payment: input.payment,
    },
    signal,
  );
  if (result.coins === undefined || result.bonus === undefined)
    throw new PaymentApiError(false);
  return { ...result, coins: result.coins, bonus: result.bonus };
}
export async function getTikTokOrderStatus(
  orderToken: string,
  signal?: AbortSignal,
): Promise<TikTokOrder> {
  const result = await getPaymentOrderStatus(orderToken, signal);
  if (
    result.service !== "tiktok" ||
    result.coins === undefined ||
    result.bonus === undefined ||
    !result.orderId ||
    !result.createdAt ||
    !result.notification
  )
    throw new PaymentApiError(false);
  return {
    status: result.status,
    verified: result.verified,
    provider: result.provider,
    packId: result.productId,
    coins: result.coins,
    bonus: result.bonus,
    amount: result.amount,
    currency: result.currency,
    createdAt: result.createdAt,
    orderId: result.orderId,
    notification: result.notification,
    ...(result.username === undefined ? {} : { username: result.username }),
    ...(result.transactionReference === undefined
      ? {}
      : { transactionReference: result.transactionReference }),
  };
}
export function getTikTokSebPayQuote(
  input: {
    packId: string;
    customCoins?: number;
    country: string;
    operator: string;
  },
  signal?: AbortSignal,
) {
  return getSebPayQuote(
    {
      selection: {
        service: "tiktok",
        productId: input.packId,
        ...(input.customCoins === undefined
          ? {}
          : { customCoins: input.customCoins }),
      },
      country: input.country,
      operator: input.operator,
    },
    signal,
  );
}

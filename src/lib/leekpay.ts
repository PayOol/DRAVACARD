// Compatibility exports for existing card consumers. The payment implementation
// itself belongs to payment-api.ts and is shared by every provider and service.
import {
  createPaymentCheckout,
  getPaymentOrderStatus,
  PaymentApiError,
  PAYMENT_API_BASE,
  type PaymentStatus,
} from "./payment-api.ts";
import type { PaymentCustomer } from "./payment-customer.ts";
export {
  PaymentApiError,
  isValidOrderToken,
  readOrderToken,
} from "./payment-api.ts";
export const LEEKPAY_API_BASE = PAYMENT_API_BASE;
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
export type LeekPayOrderStatus = PaymentStatus;
export interface LeekPayOrder {
  readonly status: PaymentStatus;
  readonly verified: boolean;
  readonly productId: string;
  readonly amount: number;
  readonly currency: typeof LEEKPAY_CHECKOUT_CURRENCY;
  readonly createdAt?: number;
}
export async function createLeekPayCheckout(
  productId: string,
  customer: PaymentCustomer,
  signal?: AbortSignal,
): Promise<LeekPayCheckout> {
  const result = await createPaymentCheckout(
    {
      selection: { service: "cards", productId },
      provider: "leekpay",
      customer,
      consent: true,
    },
    signal,
  );
  if (!result.checkoutUrl) throw new PaymentApiError(false);
  return { checkoutUrl: result.checkoutUrl, orderToken: result.orderToken };
}
export async function getLeekPayOrderStatus(
  orderToken: string,
  signal?: AbortSignal,
): Promise<LeekPayOrder> {
  const result = await getPaymentOrderStatus(orderToken, signal);
  if (
    result.service !== "cards" ||
    result.currency !== LEEKPAY_CHECKOUT_CURRENCY
  )
    throw new PaymentApiError(false);
  return {
    status: result.status,
    verified: result.verified,
    productId: result.productId,
    amount: result.amount,
    currency: result.currency,
    ...(result.createdAt === undefined ? {} : { createdAt: result.createdAt }),
  };
}

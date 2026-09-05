import type { TikTokSecrets } from "../tiktok-secrets.d.ts";

export type PaymentEnv = Env & Partial<TikTokSecrets>;
export type PaymentService = "cards" | "tiktok";
export type Provider = "leekpay" | "soleaspay" | "sebpay";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";
export type PaymentCustomer = { email: string; whatsapp: string; name: string };
export type PaymentInput = {
  country: string;
  operator: string;
  phone: string;
  otpCode?: string;
};
export type Operator = {
  id: string;
  code: string;
  name: string;
  otpRequired: boolean;
  ussdCode: string | null;
};
export type Country = {
  id: string;
  code: string;
  name: string;
  prefix: string;
  currency: string;
  exchangeRate: number;
  operators: Operator[];
};
export type Quote = {
  amount: number;
  fee: number;
  total: number;
  currency: string;
  collectionAmount: number;
  otpRequired: boolean;
  ussdCode: string | null;
};
export type Selection =
  | {
      service: "cards";
      productId: string;
      amount: number;
      currency: "XOF";
      description: string;
    }
  | {
      service: "tiktok";
      productId: string;
      packId: string;
      amount: number;
      currency: "XAF";
      description: string;
      coins: number;
      bonus: number;
    };
export type ProviderIntent = {
  amount: number;
  currency: string;
  description: string;
  customer: PaymentCustomer;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};
export type ProviderTransaction = {
  provider: Provider;
  providerId: string;
  providerAmount: number;
  providerCurrency: string;
  orderId: string;
};
export type ProviderCheckout = Omit<
  ProviderTransaction,
  "provider" | "orderId"
> & {
  checkoutUrl?: string;
  providerLink?: string;
  status: "pending" | "processing";
};
export type Order = ProviderTransaction & {
  version: 2;
  productId: string;
  amount: number;
  createdAt: number;
  expiresAt: number;
} & (
    | { service: "cards"; currency: "XOF" }
    | {
        service: "tiktok";
        currency: "XAF";
        packId: string;
        coins: number;
        bonus: number;
      }
  );
export type TikTokOrder = Extract<Order, { service: "tiktok" }>;

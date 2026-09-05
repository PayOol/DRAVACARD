// A provider is registered once for every service on the platform.
export const PAYMENT_PROVIDERS = [
  {
    id: "leekpay",
    name: "LeekPay",
    logo: "/images/leekpay.webp",
    logoClassName: "checkout-provider-logo-cropped",
    recommended: true,
    flow: "redirect",
  },
  {
    id: "soleaspay",
    name: "SoleasPay",
    logo: "/images/tiktok/soleaspay-logo.png",
    logoClassName: "",
    recommended: false,
    flow: "redirect",
  },
  {
    id: "sebpay",
    name: "SebPay",
    logo: "/images/tiktok/sebpay-logo.png",
    logoClassName: "",
    recommended: false,
    flow: "mobile-money",
  },
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]["id"];
export const PAYMENT_PROVIDER_NAMES = Object.fromEntries(
  PAYMENT_PROVIDERS.map(({ id, name }) => [id, name]),
) as Record<PaymentProvider, string>;
export const isPaymentProvider = (value: unknown): value is PaymentProvider =>
  PAYMENT_PROVIDERS.some(({ id }) => value === id);

export const LEEKPAY_SCRIPT_URL = "https://leekpay.fr/js/leekpay.js";

export const LEEKPAY_PUBLISHABLE_KEY =
  "pk_live_L1EjmvxLXb4Djtyk0bN78dmQVIPPBYfh";

export const LEEKPAY_CHECKOUT_CURRENCY = "XOF" as const;

export interface PaymentCardSelection {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly displayCurrency: string;
}

export interface LeekPaySuccessData {
  readonly status: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly payment_id: string | null;
}

export type LeekPayFailureCode =
  | "cancelled"
  | "invalid_amount"
  | "invalid_publishable_key"
  | "invalid_return_url"
  | "sdk_unavailable"
  | "checkout_error";

export interface LeekPayFailure {
  readonly code: LeekPayFailureCode;
  readonly providerCode?: string;
}

interface LeekPayCheckoutOptions {
  amount: number;
  currency: typeof LEEKPAY_CHECKOUT_CURRENCY;
  apiKey: string;
  description: string;
  returnUrl: string;
  onSuccess: (data: unknown) => void;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

interface LeekPaySdk {
  checkout: (options: LeekPayCheckoutOptions) => void;
  close?: (triggerCancel?: boolean) => void;
}

declare global {
  interface Window {
    LeekPay?: LeekPaySdk;
  }
}

interface StartLeekPayCheckoutOptions {
  amount: number;
  description: string;
  returnUrl: string;
  onSuccess: (data: LeekPaySuccessData) => void;
  onCancel: () => void;
  onError: (failure: LeekPayFailure) => void;
}

export type StartLeekPayCheckoutResult =
  | { readonly started: true }
  | { readonly started: false; readonly failure: LeekPayFailure };

const safeProviderCodePattern = /^[A-Za-z0-9_.-]{1,64}$/;
const leekPayPublishableKeyPattern = /^pk_live_[A-Za-z0-9]{32}$/;

function toSafeString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

function normalizeSuccessData(data: unknown): LeekPaySuccessData {
  const payload =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};
  const parsedAmount =
    typeof payload.amount === "number"
      ? payload.amount
      : typeof payload.amount === "string"
        ? Number(payload.amount)
        : Number.NaN;

  return {
    status: toSafeString(payload.status, 64),
    amount:
      Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : null,
    currency: toSafeString(payload.currency, 8)?.toUpperCase() ?? null,
    payment_id: toSafeString(payload.payment_id, 128),
  };
}

function normalizeFailure(error: unknown): LeekPayFailure {
  if (typeof error !== "object" || error === null) {
    return { code: "checkout_error" };
  }

  const rawCode = (error as Record<string, unknown>).error;
  const providerCode =
    typeof rawCode === "string" && safeProviderCodePattern.test(rawCode)
      ? rawCode
      : undefined;

  return providerCode
    ? { code: "checkout_error", providerCode }
    : { code: "checkout_error" };
}

export function isLeekPaySdkReady(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.LeekPay?.checkout === "function"
  );
}

export function isLeekPayPublishableKeyValid(): boolean {
  return leekPayPublishableKeyPattern.test(LEEKPAY_PUBLISHABLE_KEY);
}

function isSafeReturnUrl(returnUrl: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const parsedUrl = new URL(returnUrl);
    return (
      parsedUrl.origin === window.location.origin &&
      (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:")
    );
  } catch {
    return false;
  }
}

export function startLeekPayCheckout({
  amount,
  description,
  returnUrl,
  onSuccess,
  onCancel,
  onError,
}: StartLeekPayCheckoutOptions): StartLeekPayCheckoutResult {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return {
      started: false,
      failure: { code: "invalid_amount" },
    };
  }

  if (!isLeekPayPublishableKeyValid()) {
    return {
      started: false,
      failure: { code: "invalid_publishable_key" },
    };
  }

  if (!isSafeReturnUrl(returnUrl)) {
    return {
      started: false,
      failure: { code: "invalid_return_url" },
    };
  }

  if (!isLeekPaySdkReady()) {
    return {
      started: false,
      failure: { code: "sdk_unavailable" },
    };
  }

  try {
    window.LeekPay?.checkout({
      amount,
      currency: LEEKPAY_CHECKOUT_CURRENCY,
      apiKey: LEEKPAY_PUBLISHABLE_KEY,
      description: description.slice(0, 160),
      returnUrl,
      onSuccess: (data) => onSuccess(normalizeSuccessData(data)),
      onCancel,
      onError: (error) => onError(normalizeFailure(error)),
    });
    return { started: true };
  } catch {
    return {
      started: false,
      failure: { code: "checkout_error" },
    };
  }
}

export function closeLeekPayCheckout(): void {
  if (typeof window === "undefined") return;
  window.LeekPay?.close?.(true);
}

import type {
  Country,
  Operator,
  PaymentEnv,
  PaymentInput,
  PaymentStatus,
  Provider,
  ProviderCheckout,
  ProviderIntent,
  ProviderTransaction,
  Quote,
} from "./payment-types.ts";
import {
  ApiError,
  exactKeys,
  isObject,
  nonempty,
  readBoundedJson,
  safeCheckoutUrl,
  secret,
} from "./shared.ts";
const CHECKOUT_API = "https://leekpay.fr/api/v1/checkout";
const PROVIDER_LIMIT_BYTES = 32 * 1024;
const PROVIDER_TIMEOUT_MS = 10_000;
const SEBPAY_API = "https://newapi.sebpay.bj/api/v1";
export const PROVIDER_IDS = ["leekpay", "soleaspay", "sebpay"] as const;

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && PROVIDER_IDS.some((id) => id === value);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    [
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
      "expired",
    ].includes(value)
  );
}

export function isProviderReference(
  selected: Provider,
  value: unknown,
): value is string {
  if (typeof value !== "string") return false;
  return selected === "leekpay"
    ? /^checkout_[A-Za-z0-9_-]{1,120}$/.test(value)
    : /^[A-Za-z0-9_-]{1,120}$/.test(value);
}

export type PreparedPayment = {
  amount: number;
  currency: string;
  payment?: PaymentInput;
  quote?: Quote;
};
type Adapter = {
  available(env: PaymentEnv): boolean;
  prepare(
    env: PaymentEnv,
    intent: ProviderIntent,
    payment: unknown,
  ): Promise<PreparedPayment>;
  create(
    env: PaymentEnv,
    intent: ProviderIntent,
    prepared: PreparedPayment,
  ): Promise<ProviderCheckout>;
  verify(
    env: PaymentEnv,
    transaction: ProviderTransaction,
  ): Promise<PaymentStatus>;
  countries?(env: PaymentEnv): Promise<Country[]>;
  quote?(
    env: PaymentEnv,
    selected: { amount: number },
    payment: Record<string, unknown>,
  ): Promise<Quote>;
};

function unavailable(): never {
  throw new ApiError(503, "provider_unavailable");
}

const registry: Readonly<Record<Provider, Adapter>> = Object.freeze({
  leekpay: {
    available: (env) =>
      secret(env.LEEKPAY_SECRET_KEY) && env.LEEKPAY_SECRET_KEY.length >= 16,
    async prepare(_env, intent, payment) {
      if (payment !== undefined) throw new ApiError(400, "invalid_payment");
      return { amount: intent.amount, currency: "XOF" };
    },
    async create(env, intent, prepared) {
      const data = await providerJson(env, undefined, {
        amount: prepared.amount,
        currency: prepared.currency,
        description: intent.description,
        return_url: intent.returnUrl,
        cancel_url: intent.cancelUrl,
        customer_name: intent.customer.name,
        customer_email: intent.customer.email,
        customer_phone: intent.customer.whatsapp,
        metadata: intent.metadata,
      });
      if (
        !isProviderReference("leekpay", data.id) ||
        data.amount !== prepared.amount ||
        data.currency !== prepared.currency ||
        (data.status !== "pending" && data.status !== "processing") ||
        (data.return_url !== undefined && data.return_url !== intent.returnUrl)
      ) {
        throw new ApiError(502, "provider_invalid_response");
      }
      return {
        providerId: data.id,
        providerAmount: prepared.amount,
        providerCurrency: prepared.currency,
        checkoutUrl: safeCheckoutUrl(data.payment_url),
        status: data.status,
      };
    },
    async verify(env, order) {
      const data = await providerJson(env, order.providerId);
      if (
        data.id !== order.providerId ||
        data.amount !== order.providerAmount ||
        data.currency !== order.providerCurrency ||
        !isPaymentStatus(data.status)
      ) {
        throw new ApiError(502, "provider_invalid_response");
      }
      return data.status;
    },
  },
  soleaspay: {
    available: () => false,
    prepare: async () => unavailable(),
    create: async () => unavailable(),
    verify: async () => unavailable(),
  },
  sebpay: {
    available: (env) =>
      secret(env.SEBPAY_PUBLIC_KEY) && secret(env.SEBPAY_SECRET_KEY),
    async prepare(env, intent, value) {
      if (!isObject(value)) throw new ApiError(400, "invalid_payment");
      exactKeys(value, ["country", "operator", "phone", "otpCode"]);
      if (
        !nonempty(value.country, 2) ||
        !nonempty(value.operator, 60) ||
        typeof value.phone !== "string" ||
        !/^[1-9][0-9]{7,14}$/.test(value.phone)
      ) {
        throw new ApiError(400, "invalid_payment");
      }
      const calculated = await quote(env, intent, value);
      if (
        calculated.otpRequired &&
        (!nonempty(value.otpCode, 64) ||
          !/^[A-Za-z0-9 -]+$/.test(value.otpCode))
      )
        throw new ApiError(400, "invalid_payment");
      return {
        amount: calculated.collectionAmount,
        currency: calculated.currency,
        quote: calculated,
        payment: {
          country: value.country,
          operator: value.operator,
          phone: value.phone,
          ...(calculated.otpRequired && typeof value.otpCode === "string"
            ? { otpCode: value.otpCode }
            : {}),
        },
      };
    },
    async create(env, intent, prepared) {
      const payment = prepared.payment;
      if (!payment) throw new ApiError(400, "invalid_payment");
      const data = await sebpay(env, "/collections", {
        amount: prepared.amount,
        currency: prepared.currency,
        phone: payment.phone,
        operator: payment.operator,
        country: payment.country,
        external_reference: intent.orderId,
        description: intent.description,
        customer_name: intent.customer.name,
        ...(payment.otpCode ? { otp_code: payment.otpCode } : {}),
      });
      if (
        !isObject(data) ||
        !isProviderReference("sebpay", data.transaction_id) ||
        data.external_reference !== intent.orderId ||
        number(data.amount) !== prepared.amount ||
        data.currency !== prepared.currency
      )
        throw new ApiError(502, "provider_invalid_response");
      sebpayStatus(data.status);
      return {
        providerId: data.transaction_id,
        providerAmount: prepared.amount,
        providerCurrency: prepared.currency,
        status: "pending",
        ...(data.provider_link === undefined ||
        data.provider_link === null ||
        data.provider_link === ""
          ? {}
          : { providerLink: safeCheckoutUrl(data.provider_link) }),
      };
    },
    async verify(env, order) {
      const data = await sebpay(
        env,
        `/collections/${encodeURIComponent(order.providerId)}`,
      );
      if (
        !isObject(data) ||
        data.transaction_id !== order.providerId ||
        data.external_reference !== order.orderId ||
        number(data.amount) !== order.providerAmount ||
        data.currency !== order.providerCurrency
      )
        throw new ApiError(502, "provider_invalid_response");
      return sebpayStatus(data.status);
    },
    countries,
    quote,
  },
});

function sebpayStatus(value: unknown): PaymentStatus {
  if (typeof value !== "string")
    throw new ApiError(502, "provider_invalid_response");
  const normalized = value.toLowerCase();
  if (normalized === "approved" || normalized === "success") return "paid";
  if (normalized === "rejected") return "failed";
  if (normalized === "canceled") return "cancelled";
  if (isPaymentStatus(normalized)) return normalized;
  throw new ApiError(502, "provider_invalid_response");
}

export function providerAvailable(
  env: PaymentEnv,
  provider: Provider,
): boolean {
  return registry[provider].available(env);
}
export function providerCatalog(env: PaymentEnv) {
  return PROVIDER_IDS.map((id) => ({
    id,
    available: providerAvailable(env, id),
  }));
}
function configured(env: PaymentEnv, provider: Provider): Adapter {
  if (!providerAvailable(env, provider)) unavailable();
  return registry[provider];
}
export async function prepareProviderPayment(
  env: PaymentEnv,
  provider: Provider,
  intent: ProviderIntent,
  payment: unknown,
) {
  return configured(env, provider).prepare(env, intent, payment);
}
export async function createProviderPayment(
  env: PaymentEnv,
  provider: Provider,
  intent: ProviderIntent,
  prepared: PreparedPayment,
) {
  return configured(env, provider).create(env, intent, prepared);
}
export async function verifyProviderPayment(
  env: PaymentEnv,
  order: ProviderTransaction,
) {
  return configured(env, order.provider).verify(env, order);
}
export async function providerCountries(env: PaymentEnv, provider: Provider) {
  const get = configured(env, provider).countries;
  if (!get) throw new ApiError(400, "invalid_provider");
  return get(env);
}
export async function providerQuote(
  env: PaymentEnv,
  provider: Provider,
  selected: { amount: number },
  payment: Record<string, unknown>,
) {
  const get = configured(env, provider).quote;
  if (!get) throw new ApiError(400, "invalid_provider");
  return get(env, selected, payment);
}
async function providerJson(
  env: Env,
  checkoutId?: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(
      checkoutId ? `${CHECKOUT_API}/${checkoutId}` : CHECKOUT_API,
      {
        method: checkoutId ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${env.LEEKPAY_SECRET_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      console.error(
        JSON.stringify({
          event: "payment_provider_http_error",
          operation: checkoutId ? "status" : "create",
          status: response.status,
        }),
      );
      throw new ApiError(502, "provider_unavailable");
    }
    if (
      !(response.headers.get("Content-Type") ?? "")
        .toLowerCase()
        .startsWith("application/json")
    ) {
      await response.body?.cancel();
      throw new ApiError(502, "provider_invalid_response");
    }
    const result = await readBoundedJson(
      response.body,
      response.headers,
      PROVIDER_LIMIT_BYTES,
      502,
      "provider_invalid_response",
    );
    if (
      !isObject(result) ||
      result.success === false ||
      !isObject(result.data)
    ) {
      throw new ApiError(502, "provider_invalid_response");
    }
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(
      JSON.stringify({
        event: "payment_provider_transport_error",
        operation: checkoutId ? "status" : "create",
        kind:
          error instanceof TypeError
            ? "type_error"
            : controller.signal.aborted
              ? "timeout"
              : "network_error",
      }),
    );
    throw new ApiError(502, "provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function sebpay(
  env: PaymentEnv,
  path: string,
  payload?: Record<string, unknown>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${SEBPAY_API}${path}`, {
      method: payload ? "POST" : "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "X-Public-Key": env.SEBPAY_PUBLIC_KEY ?? "",
        "X-Secret-Key": env.SEBPAY_SECRET_KEY ?? "",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(502, "provider_unavailable");
    }
    const result = await readBoundedJson(
      response.body,
      response.headers,
      256 * 1024,
      502,
      "provider_invalid_response",
    );
    if (
      !isObject(result) ||
      result.success === false ||
      result.data === undefined
    )
      throw new ApiError(502, "provider_invalid_response");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function number(value: unknown): number {
  return typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)
      ? Number(value)
      : Number.NaN;
}

function catalogId(value: unknown): string | null {
  return nonempty(value, 100)
    ? value
    : typeof value === "number" && Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : null;
}

async function countries(env: PaymentEnv): Promise<Country[]> {
  const response = await sebpay(env, "/p/countries");
  const list = Array.isArray(response)
    ? response
    : isObject(response)
      ? [response.data, response.countries, response.items].find(Array.isArray)
      : null;
  if (!Array.isArray(list))
    throw new ApiError(502, "provider_invalid_response");
  const result: Country[] = [];
  for (const value of list) {
    if (
      !isObject(value) ||
      value.is_active !== true ||
      !isObject(value.currency) ||
      value.currency.is_active !== true
    )
      continue;
    const code = value.country_code ?? value.code;
    const name = value.country_name ?? value.name;
    const currency = value.currency.code;
    const exchangeRate = number(
      value.currency.exchange_rate ??
        (currency === "XAF" || currency === "XOF" ? 1 : null),
    );
    const prefix =
      typeof value.prefix === "string" ? value.prefix.replace(/\D/g, "") : "";
    const id = catalogId(value.id);
    if (
      id === null ||
      typeof code !== "string" ||
      !/^[A-Za-z]{2}$/.test(code) ||
      !nonempty(name, 100) ||
      typeof currency !== "string" ||
      !/^[A-Z]{3}$/.test(currency) ||
      !/^[1-9][0-9]{0,3}$/.test(prefix) ||
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0 ||
      !Array.isArray(value.operators)
    )
      continue;
    const operators: Operator[] = [];
    for (const operator of value.operators) {
      if (
        !isObject(operator) ||
        operator.is_active !== true ||
        operator.payin_enabled !== true ||
        catalogId(operator.id) === null ||
        !nonempty(operator.code, 60) ||
        !/^[A-Za-z0-9_-]+$/.test(operator.code) ||
        !nonempty(operator.name, 100)
      )
        continue;
      operators.push({
        id: String(operator.id),
        code: operator.code,
        name: operator.name,
        otpRequired: operator.otp_required === true,
        ussdCode: nonempty(operator.ussd_code, 200) ? operator.ussd_code : null,
      });
    }
    if (operators.length)
      result.push({
        id,
        code: code.toUpperCase(),
        name,
        prefix,
        currency,
        exchangeRate,
        operators: operators.sort((a, b) => a.name.localeCompare(b.name, "fr")),
      });
  }
  if (!result.length) throw new ApiError(502, "provider_unavailable");
  return result.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

async function quote(
  env: PaymentEnv,
  selected: { amount: number },
  payment: Record<string, unknown>,
): Promise<Quote> {
  const available = await countries(env);
  const country = available.find((entry) => entry.code === payment.country);
  const operator = country?.operators.find(
    (entry) => entry.code === payment.operator,
  );
  if (!country || !operator) throw new ApiError(400, "invalid_payment");
  const exchangeFee =
    country.currency === "XAF" || country.currency === "XOF" ? 0 : 30;
  const amount = Math.ceil(
    (selected.amount + exchangeFee) / country.exchangeRate,
  );
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new ApiError(502, "provider_invalid_response");
  let fee = Math.ceil(amount * 0.055);
  try {
    const query = new URLSearchParams({
      amount: String(amount),
      source_country: country.code.toLowerCase(),
      destination_country: country.code.toLowerCase(),
      transaction_type: "collection",
    });
    const response = await sebpay(env, `/c/calculate-fee?${query}`);
    const providerFee = isObject(response)
      ? number(response.fee_amount)
      : Number.NaN;
    if (
      Number.isFinite(providerFee) &&
      providerFee >= 0 &&
      providerFee <= amount
    )
      fee = Math.ceil(providerFee);
  } catch {
    /* Same 5.5% fee fallback as UpCoin; every amount is recomputed server-side. */
  }
  const total = amount + fee;
  return {
    amount,
    fee,
    total,
    currency: country.currency,
    collectionAmount: operator.otpRequired ? total : amount,
    otpRequired: operator.otpRequired,
    ussdCode: operator.otpRequired
      ? (operator.ussdCode?.replace(/montant/gi, String(total)) ?? null)
      : null,
  };
}

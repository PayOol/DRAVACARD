import { normalizePaymentCustomer } from "../../src/lib/payment-customer.ts";
import type {
  Order,
  PaymentCustomer,
  PaymentEnv,
  PaymentService,
  Selection,
} from "./payment-types.ts";
import { ApiError, SITE_ORIGIN } from "./shared.ts";
import * as tiktok from "./tiktok.ts";

const PRODUCTS = Object.freeze({
  "visa-basic": { amount: 5000, name: "VISA BASIQUE" },
  "mastercard-basic": { amount: 6000, name: "MASTERCARD BASIQUE" },
  "mastercard-premium": { amount: 8500, name: "MASTERCARD PREMIUM" },
  "mastercard-platinum": { amount: 15000, name: "MASTERCARD PLATINIUM" },
});
export type ServiceCustomer = PaymentCustomer & {
  fulfillment?: tiktok.Customer;
};

export function isService(value: unknown): value is PaymentService {
  return value === "cards" || value === "tiktok";
}
export function isCardProduct(value: unknown): value is keyof typeof PRODUCTS {
  return typeof value === "string" && Object.hasOwn(PRODUCTS, value);
}
export function selectProduct(
  service: PaymentService,
  productId: unknown,
  customCoins?: unknown,
): Selection {
  if (service === "tiktok") {
    const selected = tiktok.selection({ packId: productId, customCoins });
    return {
      ...selected,
      service,
      productId: selected.packId,
      currency: "XAF",
      description: `DRAVA — ${selected.coins + selected.bonus} pièces TikTok`,
    };
  }
  if (!isCardProduct(productId) || customCoins !== undefined)
    throw new ApiError(400, "invalid_product");
  const product = PRODUCTS[productId];
  return {
    service,
    productId,
    amount: product.amount,
    currency: "XOF",
    description: `DRAVA — ${product.name}`,
  };
}
export function validateCustomer(
  service: PaymentService,
  value: unknown,
): ServiceCustomer {
  if (service === "tiktok") {
    const client = tiktok.customer(value);
    return {
      email: client.email,
      whatsapp: client.whatsapp,
      name: client.username,
      fulfillment: client,
    };
  }
  const client = normalizePaymentCustomer(value);
  if (!client) throw new ApiError(400, "invalid_customer");
  return { ...client, name: `Client (${client.email})` };
}
export function ensureServiceReady(
  env: PaymentEnv,
  service: PaymentService,
): void {
  if (
    typeof env.ORDERS?.get !== "function" ||
    typeof env.ORDERS?.put !== "function"
  )
    throw new ApiError(503, "service_unavailable");
  if (service === "tiktok" && !tiktok.deliveryReady(env))
    throw new ApiError(503, "fulfillment_unavailable");
}
export function returnUrls(
  env: PaymentEnv,
  service: PaymentService,
  token: string,
  origin: string,
) {
  if (service === "cards")
    return {
      returnUrl: `${SITE_ORIGIN}/payment-success/#order=${token}`,
      cancelUrl: `${SITE_ORIGIN}/payment-failure/#order=${token}`,
    };
  const base = env.TIKTOK_BASE_PATH ?? "";
  if (base !== "" && !/^\/[A-Za-z0-9/_-]+$/.test(base))
    throw new ApiError(503, "service_unavailable");
  const siteOrigin = env.ENVIRONMENT === "development" ? origin : SITE_ORIGIN;
  const returnUrl = `${siteOrigin}${base.replace(/\/$/, "")}/tiktok-payment/#order=${token}`;
  return { returnUrl, cancelUrl: returnUrl };
}
export async function prepareFulfillment(
  env: PaymentEnv,
  key: string,
  order: Order,
  client: ServiceCustomer,
): Promise<void> {
  if (order.service === "tiktok") {
    if (!client.fulfillment) throw new ApiError(400, "invalid_customer");
    await tiktok.prepareFulfillment(env, key, order, client.fulfillment);
  }
}
export async function cleanupFulfillment(
  env: PaymentEnv,
  key: string,
  service: PaymentService,
): Promise<void> {
  if (service === "tiktok") await tiktok.cleanupFulfillment(env, key);
}
export async function completeFulfillment(
  env: PaymentEnv,
  key: string,
  order: Order,
): Promise<Partial<tiktok.Notification>> {
  return order.service === "tiktok" ? tiktok.notifyOrder(env, key, order) : {};
}

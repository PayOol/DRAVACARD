import { normalizePaymentCustomer } from "../../src/lib/payment-customer.ts";
import type {
  Order,
  PaymentCustomer,
  PaymentEnv,
  PaymentService,
  Selection,
} from "./payment-types.ts";
import {
  emailReady,
  encryptionReady,
  NOTIFICATION_TTL_SECONDS,
  sealNotification,
  sendOrderEmail,
  unsealNotification,
} from "./notifications.ts";
import { ApiError, isObject } from "./shared.ts";
import * as tiktok from "./tiktok.ts";

const PRODUCTS = Object.freeze({
  "visa-basic": { amount: 100, name: "VISA BASIQUE" },
  "mastercard-basic": { amount: 6000, name: "MASTERCARD BASIQUE" },
  "mastercard-premium": { amount: 8500, name: "MASTERCARD PREMIUM" },
  "mastercard-platinum": { amount: 15000, name: "MASTERCARD PLATINIUM" },
});
export type ServiceCustomer = PaymentCustomer & {
  fulfillment?: tiktok.Customer;
};
type Notification = { notification: "sent" | "pending" };

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
  // The request handler validates this exact origin against the allowlist before
  // checkout. The browser must return to the same site, including local tests.
  if (service === "cards")
    return {
      returnUrl: `${origin}/payment-success/#order=${token}`,
      cancelUrl: `${origin}/payment-failure/#order=${token}`,
    };
  const base = env.TIKTOK_BASE_PATH ?? "";
  if (base !== "" && !/^\/[A-Za-z0-9/_-]+$/.test(base))
    throw new ApiError(503, "service_unavailable");
  const returnUrl = `${origin}${base.replace(/\/$/, "")}/tiktok-payment/#order=${token}`;
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
    return;
  }
  // Card notifications are opportunistic for deployments that predate the
  // shared delivery secrets. Once encryption is configured, every new order
  // retains its normalized contact data for verified-payment delivery.
  if (!encryptionReady(env)) return;
  await env.ORDERS.put(
    `${key}:customer`,
    await sealNotification(
      { email: client.email, whatsapp: client.whatsapp },
      `cards:${key}`,
      env,
    ),
    { expirationTtl: NOTIFICATION_TTL_SECONDS },
  );
}
export async function cleanupFulfillment(
  env: PaymentEnv,
  key: string,
  service: PaymentService,
): Promise<void> {
  if (service === "tiktok") await tiktok.cleanupFulfillment(env, key);
  else {
    if (typeof env.ORDERS.delete !== "function") return;
    try {
      await env.ORDERS.delete(`${key}:customer`);
    } catch {
      console.error(JSON.stringify({ event: "card_cleanup_pending" }));
    }
  }
}

function cardCustomer(value: unknown): Pick<PaymentCustomer, "email" | "whatsapp"> {
  if (
    !isObject(value) ||
    Object.keys(value).length !== 2 ||
    typeof value.email !== "string" ||
    typeof value.whatsapp !== "string"
  )
    throw new ApiError(503, "service_unavailable");
  const client = normalizePaymentCustomer(value);
  if (!client) throw new ApiError(503, "service_unavailable");
  return { email: client.email, whatsapp: client.whatsapp };
}

async function notifyCardOrder(
  env: PaymentEnv,
  key: string,
  order: Extract<Order, { service: "cards" }>,
): Promise<Partial<Notification>> {
  try {
    if (!isCardProduct(order.productId))
      throw new ApiError(503, "service_unavailable");
    const alreadySent = (await env.ORDERS.get(`${key}:notified`)) === "sent";
    const sealed = await env.ORDERS.get(`${key}:customer`);
    if (alreadySent) {
      await env.ORDERS.delete(`${key}:customer`);
      return { notification: "sent" };
    }
    // Historical card orders have no encrypted contact envelope. Do not claim
    // a retryable notification or invent customer data for them.
    if (!sealed) return {};
    if (!emailReady(env)) return { notification: "pending" };
    const client = cardCustomer(
      await unsealNotification(sealed, `cards:${key}`, env),
    );
    const accepted = await sendOrderEmail(env, {
      service_type: "Carte virtuelle",
      order_id: order.orderId,
      client_email: client.email,
      client_whatsapp: client.whatsapp,
      price: new Intl.NumberFormat("fr-FR").format(order.amount),
      date: new Date(order.createdAt).toISOString(),
      card_name: PRODUCTS[order.productId].name,
    });
    if (!accepted) return { notification: "pending" };
    await env.ORDERS.put(`${key}:notified`, "sent", {
      expirationTtl: NOTIFICATION_TTL_SECONDS,
    });
    await env.ORDERS.delete(`${key}:customer`);
    return { notification: "sent" };
  } catch {
    console.error(JSON.stringify({ event: "card_notification_pending" }));
    return { notification: "pending" };
  }
}
export async function completeFulfillment(
  env: PaymentEnv,
  key: string,
  order: Order,
): Promise<Partial<tiktok.Notification>> {
  return order.service === "tiktok"
    ? tiktok.notifyOrder(env, key, order)
    : notifyCardOrder(env, key, order);
}

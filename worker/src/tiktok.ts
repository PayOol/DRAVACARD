import {
  normalizeCustomerEmail,
  normalizeWhatsAppNumber,
} from "../../src/lib/payment-customer.ts";
import type {
  TikTokOrder as Order,
  PaymentEnv as TikTokEnv,
} from "./payment-types.ts";
import {
  emailReady,
  encryptionReady,
  NOTIFICATION_TTL_SECONDS,
  sealNotification,
  sendOrderEmail,
  unsealNotification,
} from "./notifications.ts";
import { ApiError, isObject, nonempty } from "./shared.ts";
const PACKS = Object.freeze({
  mini: { coins: 100, bonus: 0, amount: 1124 },
  starter: { coins: 350, bonus: 0, amount: 3900 },
  boost: { coins: 700, bonus: 70, amount: 7900 },
  live: { coins: 1400, bonus: 140, amount: 15700 },
  creator: { coins: 3500, bonus: 350, amount: 39300 },
  max: { coins: 7000, bonus: 700, amount: 78700 },
});

export type Customer = {
  username: string;
  password: string;
  email: string;
  whatsapp: string;
};
type Receipt = { username: string };
export type Notification = {
  notification: "sent" | "pending";
  username?: string;
};
type Selection = {
  packId: string;
  coins: number;
  bonus: number;
  amount: number;
};
export function deliveryReady(env: TikTokEnv): boolean {
  return (
    typeof env.ORDERS?.get === "function" &&
    typeof env.ORDERS?.put === "function" &&
    typeof env.ORDERS?.delete === "function" &&
    encryptionReady(env) &&
    emailReady(env)
  );
}
function selection(payload: Record<string, unknown>): Selection {
  if (payload.packId === "custom") {
    if (
      typeof payload.customCoins !== "number" ||
      !Number.isSafeInteger(payload.customCoins) ||
      payload.customCoins < 70 ||
      payload.customCoins > 1_000_000
    ) {
      throw new ApiError(400, "invalid_product");
    }
    return {
      packId: "custom",
      coins: payload.customCoins,
      bonus: 0,
      amount: Math.round(payload.customCoins * 11.24),
    };
  }
  if (
    typeof payload.packId !== "string" ||
    !Object.hasOwn(PACKS, payload.packId) ||
    payload.customCoins !== undefined
  ) {
    throw new ApiError(400, "invalid_product");
  }
  return {
    packId: payload.packId,
    ...PACKS[payload.packId as keyof typeof PACKS],
  };
}

function customer(value: unknown): Customer {
  if (!isObject(value) || Object.keys(value).length !== 4)
    throw new ApiError(400, "invalid_customer");
  const email = normalizeCustomerEmail(value.email);
  const whatsapp = normalizeWhatsAppNumber(value.whatsapp);
  const username =
    typeof value.username === "string"
      ? value.username.trim().replace(/^@/, "")
      : "";
  if (
    !email ||
    !whatsapp ||
    !nonempty(username, 254) ||
    username.length < 2 ||
    !nonempty(value.password, 256) ||
    value.password.length < 4
  )
    throw new ApiError(400, "invalid_customer");
  return { email, whatsapp, username, password: value.password };
}

async function seal(
  value: Customer | Receipt,
  orderId: string,
  env: TikTokEnv,
): Promise<string> {
  return sealNotification(value, orderId, env);
}

async function unseal(
  value: string,
  orderId: string,
  env: TikTokEnv,
): Promise<unknown> {
  return unsealNotification(value, orderId, env);
}

function receiptUsername(value: unknown): string {
  if (
    !isObject(value) ||
    Object.keys(value).length !== 1 ||
    !nonempty(value.username, 254) ||
    value.username.length < 2
  ) {
    throw new ApiError(503, "service_unavailable");
  }
  return value.username;
}

async function saveReceipt(
  env: TikTokEnv,
  storageKey: string,
  order: Order,
  username: string,
): Promise<void> {
  // Domain-separated authenticated data prevents swapping a fulfillment envelope
  // into a receipt, or moving a receipt to another order. Never extend retention.
  await env.ORDERS.put(
    `${storageKey}:receipt`,
    await seal({ username }, `receipt:${order.orderId}`, env),
    { expiration: Math.floor(order.expiresAt / 1000) },
  );
}

async function notifyOrder(
  env: TikTokEnv,
  storageKey: string,
  order: Order,
): Promise<Notification> {
  let username: string | undefined;
  const result = (
    notification: Notification["notification"],
  ): Notification => ({
    notification,
    ...(username === undefined ? {} : { username }),
  });
  try {
    const receipt = await env.ORDERS.get(`${storageKey}:receipt`);
    if (receipt)
      username = receiptUsername(
        await unseal(receipt, `receipt:${order.orderId}`, env),
      );
    const alreadySent =
      (await env.ORDERS.get(`${storageKey}:notified`)) === "sent";
    const sealed = await env.ORDERS.get(`${storageKey}:customer`);
    let client: Customer | undefined;
    // Old orders can gain their receipt before the credentials are erased.
    if (!receipt && sealed) {
      client = customer(await unseal(sealed, order.orderId, env));
      username = client.username;
      await saveReceipt(env, storageKey, order, username);
    }
    if (alreadySent) {
      await env.ORDERS.delete(`${storageKey}:customer`);
      return result("sent");
    }
    if (!sealed || !emailReady(env)) return result("pending");
    client ??= customer(await unseal(sealed, order.orderId, env));
    const accepted = await sendOrderEmail(env, {
      service_type: "Recharge TikTok Coins",
      order_id: order.orderId,
      tiktok_username: client.username,
      tiktok_password: client.password,
      client_email: client.email,
      client_whatsapp: client.whatsapp,
      coins_amount: new Intl.NumberFormat("fr-FR").format(
        order.coins + order.bonus,
      ),
      price: new Intl.NumberFormat("fr-FR").format(order.amount),
      date: new Date(order.createdAt).toISOString(),
    });
    if (!accepted) return result("pending");
    await env.ORDERS.put(`${storageKey}:notified`, "sent", {
      expirationTtl: NOTIFICATION_TTL_SECONDS,
    });
    await env.ORDERS.delete(`${storageKey}:customer`);
    return result("sent");
  } catch {
    // Payment truth survives a mail outage. A later verified status request retries delivery.
    console.error(JSON.stringify({ event: "tiktok_notification_pending" }));
    return result("pending");
  }
}

export async function prepareFulfillment(
  env: TikTokEnv,
  storageKey: string,
  order: Order,
  client: Customer,
): Promise<void> {
  if (!deliveryReady(env)) throw new ApiError(503, "fulfillment_unavailable");
  await env.ORDERS.put(
    `${storageKey}:customer`,
    await seal(client, order.orderId, env),
    { expirationTtl: NOTIFICATION_TTL_SECONDS },
  );
  await saveReceipt(env, storageKey, order, client.username);
}
export async function cleanupFulfillment(
  env: TikTokEnv,
  storageKey: string,
): Promise<void> {
  try {
    await env.ORDERS.delete(`${storageKey}:customer`);
    await env.ORDERS.delete(`${storageKey}:receipt`);
  } catch {
    console.error(JSON.stringify({ event: "tiktok_cleanup_pending" }));
  }
}
export { selection, customer, notifyOrder };

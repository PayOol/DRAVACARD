import {
  normalizeCustomerEmail,
  normalizeWhatsAppNumber,
} from "../../src/lib/payment-customer.ts";
import type {
  TikTokOrder as Order,
  PaymentEnv as TikTokEnv,
} from "./payment-types.ts";
import { ApiError, hex, isObject, nonempty, secret } from "./shared.ts";
const TTL = 7 * 24 * 60 * 60;
const PACKS = Object.freeze({
  mini: { coins: 100, bonus: 0, amount: 100 },
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
function emailReady(env: TikTokEnv): boolean {
  return (
    secret(env.EMAILJS_SERVICE_ID) &&
    secret(env.EMAILJS_TEMPLATE_ID) &&
    secret(env.EMAILJS_PUBLIC_KEY) &&
    (env.EMAILJS_PRIVATE_KEY === undefined || secret(env.EMAILJS_PRIVATE_KEY))
  );
}

export function deliveryReady(env: TikTokEnv): boolean {
  return (
    typeof env.ORDERS?.get === "function" &&
    typeof env.ORDERS?.put === "function" &&
    typeof env.ORDERS?.delete === "function" &&
    /^[a-fA-F0-9]{64}$/.test(env.TIKTOK_DATA_KEY ?? "") &&
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

async function encryptionKey(env: TikTokEnv): Promise<CryptoKey> {
  const encodedKey = env.TIKTOK_DATA_KEY;
  if (typeof encodedKey !== "string" || !/^[a-fA-F0-9]{64}$/.test(encodedKey))
    throw new ApiError(503, "service_unavailable");
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(encodedKey.match(/../g) ?? [], (value) =>
      Number.parseInt(value, 16),
    ),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

async function seal(
  value: Customer | Receipt,
  orderId: string,
  env: TikTokEnv,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(orderId) },
    await encryptionKey(env),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return `${hex(iv)}:${hex(new Uint8Array(encrypted))}`;
}

async function unseal(
  value: string,
  orderId: string,
  env: TikTokEnv,
): Promise<unknown> {
  if (!/^[a-f0-9]{24}:[a-f0-9]{32,8192}$/.test(value))
    throw new ApiError(503, "service_unavailable");
  const [iv, encrypted] = value
    .split(":")
    .map((part) =>
      Uint8Array.from(part.match(/../g) ?? [], (byte) =>
        Number.parseInt(byte, 16),
      ),
    );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(orderId) },
    await encryptionKey(env),
    encrypted,
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          redirect: "manual",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: env.EMAILJS_SERVICE_ID,
            template_id: env.EMAILJS_TEMPLATE_ID,
            user_id: env.EMAILJS_PUBLIC_KEY,
            ...(env.EMAILJS_PRIVATE_KEY === undefined
              ? {}
              : { accessToken: env.EMAILJS_PRIVATE_KEY }),
            template_params: {
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
            },
          }),
        },
      );
      await response.body?.cancel();
      if (!response.ok) return result("pending");
      await env.ORDERS.put(`${storageKey}:notified`, "sent", {
        expirationTtl: TTL,
      });
      await env.ORDERS.delete(`${storageKey}:customer`);
      return result("sent");
    } finally {
      clearTimeout(timeout);
    }
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
    { expirationTtl: TTL },
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

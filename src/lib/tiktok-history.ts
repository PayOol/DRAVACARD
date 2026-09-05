import type { TikTokOrder } from "./tiktok-payment.ts";

const KEY = "drava-tiktok-history";
const CHANGE = "drava-tiktok-history-change";
const MAX_HISTORY_ENTRIES = 50;
let memory = "[]";
let preferMemory = false;
// Only public receipt fields. Never persist a customer, password, OTP or token.
export function publicTikTokOrder(value: unknown): TikTokOrder | null {
  if (!value || typeof value !== "object") return null;
  const order = value as Record<string, unknown>;
  if (
    typeof order.orderId !== "string" ||
    !/^[A-Za-z0-9-]{1,100}$/.test(order.orderId) ||
    typeof order.packId !== "string" ||
    !["mini", "starter", "boost", "live", "creator", "max", "custom"].includes(
      order.packId,
    ) ||
    !["leekpay", "soleaspay", "sebpay"].includes(String(order.provider)) ||
    ![
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
      "expired",
    ].includes(String(order.status)) ||
    order.verified !== (order.status === "paid") ||
    typeof order.coins !== "number" ||
    !Number.isSafeInteger(order.coins) ||
    order.coins <= 0 ||
    typeof order.bonus !== "number" ||
    !Number.isSafeInteger(order.bonus) ||
    order.bonus < 0 ||
    typeof order.amount !== "number" ||
    !Number.isSafeInteger(order.amount) ||
    order.amount <= 0 ||
    typeof order.currency !== "string" ||
    !/^[A-Z]{3}$/.test(order.currency) ||
    typeof order.createdAt !== "number" ||
    !Number.isSafeInteger(order.createdAt) ||
    order.createdAt <= 0 ||
    order.createdAt > 8_640_000_000_000_000
  )
    return null;
  return {
    orderId: order.orderId,
    packId: order.packId,
    provider: order.provider as TikTokOrder["provider"],
    status: order.status as TikTokOrder["status"],
    verified: order.verified as boolean,
    coins: order.coins,
    bonus: order.bonus,
    amount: order.amount,
    currency: order.currency,
    createdAt: order.createdAt,
    notification: order.notification === "sent" ? "sent" : "pending",
  };
}
export function parseTikTokHistory(raw: string): TikTokOrder[] {
  try {
    if (raw.length > 65536) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .slice(0, MAX_HISTORY_ENTRIES)
          .map(publicTikTokOrder)
          .filter((order): order is TikTokOrder => order !== null)
      : [];
  } catch {
    return [];
  }
}
export function getTikTokHistorySnapshot(): string {
  if (typeof window === "undefined") return "[]";
  if (preferMemory) return memory;
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}
export function getTikTokHistoryServerSnapshot() {
  return "[]";
}
export function subscribeTikTokHistory(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", listener);
  };
}
export function rememberTikTokOrder(value: TikTokOrder): void {
  const order = publicTikTokOrder(value);
  if (!order || typeof window === "undefined") return;
  const history = parseTikTokHistory(getTikTokHistorySnapshot());
  memory = JSON.stringify(
    [
      order,
      ...history.filter((entry) => entry.orderId !== order.orderId),
    ].slice(0, MAX_HISTORY_ENTRIES),
  );
  try {
    window.localStorage.setItem(KEY, memory);
    preferMemory = false;
  } catch {
    // Readable but full storage must not replace the newest local receipt.
    preferMemory = true;
  }
  window.dispatchEvent(new Event(CHANGE));
}

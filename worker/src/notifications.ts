import type { PaymentEnv } from "./payment-types.ts";
import { ApiError, hex, secret } from "./shared.ts";

export const NOTIFICATION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function emailReady(env: PaymentEnv): boolean {
  return (
    secret(env.EMAILJS_SERVICE_ID) &&
    secret(env.EMAILJS_TEMPLATE_ID) &&
    secret(env.EMAILJS_PUBLIC_KEY) &&
    (env.EMAILJS_PRIVATE_KEY === undefined || secret(env.EMAILJS_PRIVATE_KEY))
  );
}

export function encryptionReady(env: PaymentEnv): boolean {
  return /^[a-fA-F0-9]{64}$/.test(env.TIKTOK_DATA_KEY ?? "");
}

async function encryptionKey(env: PaymentEnv): Promise<CryptoKey> {
  const encodedKey = env.TIKTOK_DATA_KEY;
  if (
    typeof encodedKey !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(encodedKey)
  )
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

export async function sealNotification(
  value: unknown,
  additionalData: string,
  env: PaymentEnv,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(additionalData),
    },
    await encryptionKey(env),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return `${hex(iv)}:${hex(new Uint8Array(encrypted))}`;
}

export async function unsealNotification(
  value: string,
  additionalData: string,
  env: PaymentEnv,
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
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(additionalData),
    },
    await encryptionKey(env),
    encrypted,
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
}

export async function sendOrderEmail(
  env: PaymentEnv,
  templateParams: Record<string, string>,
): Promise<boolean> {
  if (!emailReady(env)) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
        template_params: templateParams,
      }),
    });
    await response.body?.cancel();
    return response.ok;
  } finally {
    clearTimeout(timeout);
  }
}

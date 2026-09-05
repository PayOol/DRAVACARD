import {
  normalizeCustomerEmail,
  normalizeWhatsAppNumber,
} from "./payment-customer.ts";
export interface TikTokCustomer {
  username: string;
  password: string;
  email: string;
  whatsapp: string;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function normalizeTikTokCustomer(
  value: TikTokCustomer,
): TikTokCustomer | null {
  if (
    !record(value) ||
    typeof value.username !== "string" ||
    typeof value.password !== "string"
  )
    return null;
  const username = value.username.trim().replace(/^@/, "");
  const email = normalizeCustomerEmail(value.email);
  const whatsapp = normalizeWhatsAppNumber(value.whatsapp);
  if (
    username.length < 2 ||
    username.length > 254 ||
    [...username].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    value.password.length < 4 ||
    value.password.length > 256 ||
    [...value.password].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    !email ||
    !whatsapp
  )
    return null;
  return { username, password: value.password, email, whatsapp };
}

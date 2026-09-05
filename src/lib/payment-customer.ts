export interface PaymentCustomer {
  readonly email: string;
  readonly whatsapp: string;
}

export function normalizeCustomerEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 320) return null;
  // Reject control characters before trimming, including leading/trailing CRLF.
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code > 126) return null;
  }
  const email = value.trim();
  if (email.length > 254) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (
    local.length === 0 ||
    local.length > 64 ||
    !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return null;
  }
  const labels = domain.split(".");
  const lastLabel = labels[labels.length - 1];
  if (
    labels.length < 2 ||
    lastLabel.length < 2 ||
    !/[A-Za-z]/.test(lastLabel) ||
    labels.some(
      (label) =>
        !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label),
    )
  ) {
    return null;
  }
  return email;
}

export function normalizeWhatsAppNumber(value: unknown): string | null {
  if (typeof value !== "string" || !/^[+0-9 ()-]{1,40}$/.test(value)) {
    return null;
  }
  // Only the explicit international + prefix is accepted; 00/local numbers are not.
  if (!value.trim().startsWith("+")) return null;
  const whatsapp = value.replace(/[ ()-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(whatsapp) ? whatsapp : null;
}

export function normalizePaymentCustomer(value: unknown): PaymentCustomer | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 2 || !keys.includes("email") || !keys.includes("whatsapp")) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const email = normalizeCustomerEmail(candidate.email);
  const whatsapp = normalizeWhatsAppNumber(candidate.whatsapp);
  if (email === null || whatsapp === null) return null;
  return { email, whatsapp };
}

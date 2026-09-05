import { DRAVA_CONTACT } from "./drava-contact.ts";

export type SupportLanguage = "fr" | "en";

export type SupportWhatsAppContact = {
  id: string;
  label: Record<SupportLanguage, string>;
  whatsappNumber: string;
  phoneNumber: string;
  displayPhone: string;
};

export const SUPPORT_WHATSAPP_CONTACTS = [
  {
    id: "drava",
    label: {
      fr: "Service client DRAVA",
      en: "DRAVA customer service",
    },
    whatsappNumber: DRAVA_CONTACT.whatsappNumber,
    phoneNumber: DRAVA_CONTACT.phoneNumber,
    displayPhone: DRAVA_CONTACT.displayPhone,
  },
] as const satisfies readonly SupportWhatsAppContact[];

export function buildSupportWhatsAppHref(
  whatsappNumber: string,
  message?: string,
): string {
  const normalizedNumber = whatsappNumber.replace(/\D/g, "");
  const baseHref = `https://wa.me/${normalizedNumber}`;
  const normalizedMessage = message?.trim();

  return normalizedMessage
    ? `${baseHref}?text=${encodeURIComponent(normalizedMessage)}`
    : baseHref;
}

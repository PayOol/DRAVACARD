export type CardOfferId =
  | "visa-basic"
  | "mastercard-basic"
  | "mastercard-premium"
  | "mastercard-platinum";

function isSoleasHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalizedHostname === "soleaspay.com" ||
    normalizedHostname.endsWith(".soleaspay.com")
  );
}

export function validateHostedPaymentLink(value: string | undefined | null) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    const usesDefaultHttpsPort = url.port === "" || url.port === "443";

    if (
      url.protocol !== "https:" ||
      !usesDefaultHttpsPort ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname === "/" ||
      !isSoleasHostname(url.hostname)
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export const PAYMENT_LINKS: Readonly<Record<CardOfferId, string | null>> = {
  "visa-basic": validateHostedPaymentLink(
    process.env.NEXT_PUBLIC_PAYMENT_LINK_VISA_BASIC,
  ),
  "mastercard-basic": validateHostedPaymentLink(
    process.env.NEXT_PUBLIC_PAYMENT_LINK_MASTERCARD_BASIC,
  ),
  "mastercard-premium": validateHostedPaymentLink(
    process.env.NEXT_PUBLIC_PAYMENT_LINK_MASTERCARD_PREMIUM,
  ),
  "mastercard-platinum": validateHostedPaymentLink(
    process.env.NEXT_PUBLIC_PAYMENT_LINK_MASTERCARD_PLATINUM,
  ),
};

import { withBasePath } from "./base-path";
import { TIKTOK_PROVIDER_NAMES, type TikTokOrder } from "./tiktok-payment";
import { SUPPORT_WHATSAPP_CONTACTS } from "./tiktok-support";

export function formatTikTokReceiptAmount(
  order: Pick<TikTokOrder, "amount" | "currency">,
  language: "fr" | "en",
): string {
  const locale = language === "fr" ? "fr-FR" : "en-GB";
  const unit = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: order.currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value;
  return `${order.amount.toLocaleString(locale)} ${unit || order.currency}`;
}

async function receiptLogo(): Promise<string> {
  const logo = new Image();
  logo.src = withBasePath("/images/drava-logo-transparent.svg");
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 600;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Receipt rendering unavailable");
  context.drawImage(logo, 0, 0, 1000, 600);
  return canvas.toDataURL("image/png");
}

export async function downloadTikTokReceipt(
  order: TikTokOrder,
  language: "fr" | "en",
): Promise<void> {
  if (order.status !== "paid" || order.verified !== true)
    throw new Error("Unconfirmed payment");
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), receiptLogo()]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const fr = language === "fr";
  const locale = fr ? "fr-FR" : "en-GB";
  const format = (value: number) =>
    value.toLocaleString(locale).replace(/[\u00a0\u202f]/g, " ");
  const unavailable = fr ? "Non disponible" : "Not available";
  const username = order.username?.trim();
  const details = [
    [fr ? "NUMÉRO DE COMMANDE" : "ORDER NUMBER", order.orderId],
    [
      fr ? "RÉFÉRENCE DE TRANSACTION" : "TRANSACTION REFERENCE",
      order.transactionReference?.trim() || unavailable,
    ],
    [
      fr ? "COMPTE TIKTOK" : "TIKTOK ACCOUNT",
      username
        ? username.includes("@")
          ? username
          : `@${username}`
        : unavailable,
    ],
    [
      "RECHARGE",
      `${format(order.coins + order.bonus)} ${fr ? "pièces TikTok" : "TikTok coins"}`,
    ],
    [
      fr ? "MONTANT DE LA COMMANDE" : "ORDER AMOUNT",
      formatTikTokReceiptAmount(order, language).replace(
        /[\u00a0\u202f]/g,
        " ",
      ),
    ],
    [
      fr ? "DATE DE COMMANDE" : "ORDER DATE",
      new Date(order.createdAt)
        .toLocaleString(locale, {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Africa/Douala",
        })
        .replace(/[\u00a0\u202f]/g, " "),
    ],
    [fr ? "BONUS INCLUS" : "BONUS INCLUDED", format(order.bonus)],
    [fr ? "PRESTATAIRE" : "PROVIDER", TIKTOK_PROVIDER_NAMES[order.provider]],
  ].map(([label, value], index) => ({
    label,
    value,
    width: index % 2 === 0 ? 72 : 76,
    fontSize: 10.5,
    lines: [] as string[],
    lineHeight: 0,
  }));
  const measureDetail = (detail: (typeof details)[number]) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(detail.fontSize);
    detail.lines = pdf.splitTextToSize(detail.value, detail.width) as string[];
    detail.lineHeight = (detail.fontSize * 25.4 * 1.15) / 72;
  };
  details.forEach(measureDetail);
  const rowHeights = () =>
    Array.from({ length: 4 }, (_, row) =>
      Math.max(
        25,
        ...details
          .slice(row * 2, row * 2 + 2)
          .map((detail) => 15 + detail.lines.length * detail.lineHeight),
      ),
    );
  // Keep complete references and account names; shrink only the longest cells.
  // The API bounds these values, so even a 254-character account fits one A4.
  while (rowHeights().reduce((sum, height) => sum + height, 0) > 123) {
    const longest = details
      .filter((detail) => detail.fontSize > 6)
      .sort(
        (a, b) => b.lines.length * b.lineHeight - a.lines.length * a.lineHeight,
      )[0];
    if (!longest) break;
    longest.fontSize -= 0.25;
    measureDetail(longest);
  }
  const gridHeights = rowHeights();
  const bodyBottom = 113 + gridHeights.reduce((sum, height) => sum + height, 0);
  pdf.setProperties({
    title: `${fr ? "Reçu DRAVA" : "DRAVA receipt"} - ${order.orderId}`,
    author: "DRAVA",
    creator: "DRAVA",
    subject: fr ? "Recharge de pièces TikTok" : "TikTok coin recharge",
  });
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, 210, 297, "F");
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, 210, 4, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 4, 210, 49, "F");
  pdf.addImage(logo, "PNG", 13, 6, 62, 37.2);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(fr ? "Recharge de pièces TikTok" : "TikTok coin recharge", 22, 45);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(fr ? "REÇU DE PAIEMENT" : "PAYMENT RECEIPT", 188, 24, {
    align: "right",
  });
  pdf.setFontSize(8);
  pdf.text(pdf.splitTextToSize(order.orderId, 96), 188, 32, {
    align: "right",
    lineHeightFactor: 1.15,
  });
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(16, 61, 178, bodyBottom - 61, 5, 5, "FD");
  pdf.setFillColor(236, 253, 245);
  pdf.roundedRect(22, 69, 166, 28, 4, 4, "F");
  pdf.setFillColor(5, 150, 105);
  pdf.circle(35, 83, 7, "F");
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(1.2);
  pdf.line(31.8, 83, 34, 85.2);
  pdf.line(34, 85.2, 38.5, 80.6);
  pdf.setTextColor(5, 150, 105);
  pdf.setFontSize(11.5);
  pdf.text(fr ? "Paiement confirmé" : "Payment confirmed", 47, 80.5);
  pdf.setTextColor(71, 85, 105);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(
    fr
      ? "Merci pour votre achat sur DRAVA."
      : "Thank you for your purchase on DRAVA.",
    47,
    87,
  );
  pdf.setLineWidth(0.2);
  let rowTop = 106;
  gridHeights.forEach((height, row) => {
    details.slice(row * 2, row * 2 + 2).forEach((detail, column) => {
      const x = column === 0 ? 26 : 108;
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.text(detail.label, x, rowTop + 3);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(detail.fontSize);
      pdf.text(detail.lines, x, rowTop + 10, { lineHeightFactor: 1.15 });
    });
    if (row < gridHeights.length - 1) {
      pdf.setDrawColor(226, 232, 240);
      pdf.line(26, rowTop + height - 4, 184, rowTop + height - 4);
    }
    rowTop += height;
  });
  const noteTop = bodyBottom + 9;
  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(16, noteTop, 178, 28, 4, 4, "F");
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(fr ? "À conserver" : "Keep this receipt", 24, noteTop + 9);
  pdf.setTextColor(71, 85, 105);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const note = fr
    ? "Votre paiement est confirmé. La livraison des pièces est traitée séparément. Conservez ce numéro de commande pour toute demande d’assistance."
    : "Your payment is confirmed. Coin delivery is processed separately. Keep this order number for any support request.";
  pdf.text(pdf.splitTextToSize(note.replace(/’/g, "'"), 158), 24, noteTop + 16);
  const footerTop = Math.max(264, noteTop + 35);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(16, footerTop, 194, footerTop);
  pdf.setFontSize(8);
  SUPPORT_WHATSAPP_CONTACTS.forEach((contact, index) =>
    pdf.text(
      `${contact.label[language]} : ${contact.displayPhone}`,
      105,
      footerTop + 8 + index * 4.5,
      { align: "center" },
    ),
  );
  pdf.setFontSize(7);
  pdf.text(
    fr ? "Généré électroniquement" : "Electronically generated",
    194,
    291,
    { align: "right" },
  );
  pdf.save(
    `recu-drava-${order.orderId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}.pdf`,
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { DRAVA_CONTACT } from "@/lib/drava-contact";
import { useLanguage } from "@/lib/language-context";
import { CheckCircle2, Printer } from "lucide-react";
import Link from "next/link";

interface PaymentReceiptProps {
  amount: number;
  createdAt?: number;
  simulation: boolean;
  onReturn?: () => void;
}

export default function PaymentReceipt({
  amount,
  createdAt,
  simulation,
  onReturn,
}: PaymentReceiptProps) {
  const { language } = useLanguage();
  const isFrench = language === "fr";
  const locale = isFrench ? "fr-FR" : "en-GB";
  const orderDate = createdAt == null ? null : new Date(createdAt);

  const printReceipt = () => {
    // Browser print headers must not expose the private order fragment.
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    const receiptUrl = new URL(originalUrl);
    receiptUrl.hash = "";
    receiptUrl.search = "";
    const restoreUrl = () => {
      window.removeEventListener("afterprint", restoreUrl);
      if (window.location.href === receiptUrl.href) {
        window.history.replaceState(originalState, "", originalUrl);
      }
    };
    window.addEventListener("afterprint", restoreUrl, { once: true });
    try {
      window.history.replaceState(originalState, "", receiptUrl.href);
      window.print();
    } catch (error) {
      restoreUrl();
      throw error;
    }
  };

  return (
    <section className="payment-receipt payment-result-screen bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white px-4 py-8 dark:from-[#0b1220] dark:via-[#0b1220] dark:to-[#111c2e] md:py-12">
      <div className="payment-result-container mx-auto max-w-2xl">
        <div className="payment-result-card rounded-2xl border border-slate-200/70 bg-white p-5 shadow-lg shadow-slate-200/50 dark:border-[#304159] dark:bg-[#111c2e] dark:shadow-black/20 sm:p-8 md:p-10 print:border-0 print:p-0 print:shadow-none">
          {simulation && (
            <p className="payment-result-simulation mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900 dark:border-[#6b541f] dark:bg-[#312817] dark:text-amber-200">
              {isFrench
                ? "Simulation locale — aucun paiement réel"
                : "Local simulation — no real payment"}
            </p>
          )}
          <div className="text-center" aria-live="polite">
            <div className="payment-result-icon mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-[#133629] dark:text-[#86efac]">
              <CheckCircle2 aria-hidden="true" className="h-9 w-9" />
            </div>
            <h1 className="payment-result-title text-2xl font-bold tracking-tight text-slate-900 dark:text-[#e6edf7] sm:text-3xl">
              {isFrench ? "Paiement Réussi !" : "Payment Successful!"}
            </h1>
            <p className="payment-result-description mt-3 text-base leading-6 text-slate-600 dark:text-[#b3c1d5]">
              {isFrench
                ? "Votre commande a été confirmée avec succès"
                : "Your order has been successfully confirmed"}
            </p>
          </div>

          <section
            className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#304159] dark:bg-[#18263b] sm:p-5"
            aria-labelledby="order-details-heading"
          >
            <h2
              id="order-details-heading"
              className="text-lg font-semibold text-slate-900 dark:text-[#e6edf7]"
            >
              {isFrench ? "Détails de la commande" : "Order details"}
            </h2>
            <dl className="mt-4 divide-y divide-slate-200 text-sm dark:divide-[#304159] sm:text-base">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 pb-3">
                <dt className="text-slate-600 dark:text-[#b3c1d5]">
                  {isFrench ? "Article commandé" : "Ordered item"}
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-[#e6edf7]">
                  {isFrench ? "Carte Virtuelle" : "Virtual Card"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                <dt className="text-slate-600 dark:text-[#b3c1d5]">
                  {isFrench ? "Prix" : "Price"}
                </dt>
                <dd className="payment-result-amount font-bold text-emerald-700 dark:text-[#86efac]">
                  {amount.toLocaleString(locale)} FCFA
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 pt-3">
                <dt className="text-slate-600 dark:text-[#b3c1d5]">
                  {isFrench ? "Date de commande" : "Order date"}
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-[#e6edf7]">
                  {orderDate ? (
                    <time dateTime={orderDate.toISOString()}>
                      {orderDate.toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        timeZone: "Africa/Douala",
                      })}
                    </time>
                  ) : isFrench ? (
                    "Non disponible"
                  ) : (
                    "Unavailable"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="payment-result-notice mt-7"
            aria-labelledby="next-steps-heading"
          >
            <h2
              id="next-steps-heading"
              className="text-lg font-semibold text-slate-900 dark:text-[#e6edf7]"
            >
              {isFrench ? "Prochaines étapes" : "Next steps"}
            </h2>
            <ol className="mt-4 space-y-5">
              <li className="flex gap-3 sm:gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg dark:bg-[#18263b]"
                >
                  🔗
                </span>
                <div className="min-w-0 text-sm leading-6 text-slate-600 dark:text-[#b3c1d5] sm:text-base">
                  <p>
                    {isFrench
                      ? "Veuillez cliquer sur le lien suivant afin d’ouvrir votre compte :"
                      : "Please click the following link to open your account:"}
                  </p>
                  <a
                    href="https://prismcard.net/r/VPBUL1EF"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block break-all font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900 dark:text-[#93c5fd] dark:decoration-[#426993] dark:hover:text-blue-100"
                  >
                    prismcard.net/r/VPBUL1EF
                  </a>
                </div>
              </li>
              <li className="flex gap-3 sm:gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg dark:bg-[#18263b]"
                >
                  📩
                </span>
                <div className="min-w-0 text-sm leading-6 text-slate-600 dark:text-[#b3c1d5] sm:text-base">
                  <p>
                    {isFrench
                      ? "Une fois votre compte créé et vérifié, envoyez-nous l’adresse e-mail associée par WhatsApp. Nous procéderons alors à l’ajout de la carte dans votre compte."
                      : "Once your account has been created and verified, send us its email address via WhatsApp. We will then add the card to your account."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                    <Button
                      asChild
                      variant="outline"
                      className="h-auto min-h-14 w-full whitespace-normal border-emerald-200 px-6 py-4 text-lg font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-[#28664b] dark:bg-[#111c2e] dark:text-[#86efac] dark:hover:bg-[#133629] dark:hover:text-green-100"
                    >
                      <a
                        href={DRAVA_CONTACT.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                  <div className="hidden break-all text-xs print:block">
                    <p>
                      WhatsApp : {DRAVA_CONTACT.displayPhone} — {DRAVA_CONTACT.whatsappHref}
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </section>

          <div className="payment-result-actions mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 dark:border-[#304159] sm:flex-row print:hidden">
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={printReceipt}
            >
              <Printer aria-hidden="true" className="mr-2 h-4 w-4" />
              {isFrench ? "Imprimer le reçu" : "Print receipt"}
            </Button>
            <Button
              asChild={!onReturn}
              onClick={onReturn}
              className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 sm:flex-1"
            >
              {onReturn ? (
                isFrench ? (
                  "Retour à l’accueil"
                ) : (
                  "Back to home"
                )
              ) : (
                <Link href="/">
                  {isFrench ? "Retour à l’accueil" : "Back to home"}
                </Link>
              )}
            </Button>
          </div>
          <p className="mt-6 text-center text-sm font-medium text-slate-600 dark:text-[#b3c1d5]">
            {isFrench
              ? "Merci de votre confiance ! 🎉"
              : "Thank you for your trust! 🎉"}
          </p>
        </div>
      </div>
    </section>
  );
}

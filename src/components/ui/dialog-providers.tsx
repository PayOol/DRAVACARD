"use client";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCustomer } from "@/lib/payment-customer";
import {
  type PaymentCardSelection,
  createLeekPayCheckout,
} from "@/lib/leekpay";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useIsPresent } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface PaymentProvidersProps {
  card: PaymentCardSelection;
  customer: PaymentCustomer;
  onBack: () => void;
}

type CheckoutState = "idle" | "processing" | "error";
type PaymentProvider = "leekpay";

export function PaymentProviders({
  card,
  customer,
  onBack,
}: PaymentProvidersProps) {
  const { language } = useLanguage();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider>("leekpay");
  const requestRef = useRef<AbortController | null>(null);
  const isPresent = useIsPresent();

  // Back can interrupt payment from the mobile header or browser navigation.
  // Abort as soon as the panel exits, before its exit animation completes.
  useLayoutEffect(() => {
    if (!isPresent) {
      requestRef.current?.abort();
      requestRef.current = null;
    }
  }, [isPresent]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        requestRef.current?.abort();
        requestRef.current = null;
        setCheckoutState("idle");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  const handleCheckout = async () => {
    if (requestRef.current || selectedProvider !== "leekpay") return;
    const controller = new AbortController();
    requestRef.current = controller;
    setCheckoutState("processing");

    try {
      const checkout = await createLeekPayCheckout(
        card.id,
        customer,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        window.location.assign(checkout.checkoutUrl);
      }
    } catch {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setCheckoutState("error");
      }
    }
  };

  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;
  const isProcessing = checkoutState === "processing";

  return (
    <>
      <div className="checkout-scroll min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="checkout-provider-summary mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-[#304159] dark:bg-[#18263b]">
          <p className="text-sm text-blue-700 dark:text-[#93c5fd]">
            {language === "fr" ? "Carte sélectionnée" : "Selected card"}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-[#e6edf7]">
              {card.name}
            </p>
            <p className="font-bold text-blue-700 dark:text-[#93c5fd]">
              {formattedAmount}
            </p>
          </div>
        </div>

        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-[#b3c1d5]">
          {language === "fr" ? "Providers disponibles" : "Available providers"}
        </p>

        <fieldset
          aria-label={
            language === "fr" ? "Providers disponibles" : "Available providers"
          }
          className="checkout-provider-options grid min-w-0 grid-cols-2 gap-3 pt-2"
        >
          <button
            aria-pressed={selectedProvider === "leekpay"}
            className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-[#93c5fd] dark:focus-visible:ring-offset-[#111c2e] sm:px-3 ${
              selectedProvider === "leekpay"
                ? "border-blue-500 bg-blue-50/60 dark:border-[#93c5fd] dark:bg-[#18263b]"
                : "border-slate-200 bg-white hover:border-blue-300 dark:border-[#304159] dark:bg-[#111c2e] dark:hover:border-[#93c5fd]"
            }`}
            disabled={isProcessing}
            onClick={() => setSelectedProvider("leekpay")}
            type="button"
          >
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 dark:ring-[#304159]">
              <img
                src={withBasePath("/images/leekpay.webp")}
                alt=""
                width={1536}
                height={1024}
                className="absolute -left-7 -top-[35px] h-auto w-40 max-w-none"
              />
            </span>
            <span className="whitespace-nowrap text-xs font-semibold text-slate-900 dark:text-[#e6edf7] sm:text-sm">
              LeekPay
            </span>
            <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white shadow-sm dark:bg-[#86efac] dark:text-emerald-950">
              {language === "fr" ? "Recommandé" : "Recommended"}
            </span>
          </button>
        </fieldset>
      </div>

      <div className="checkout-actions shrink-0 border-t border-slate-100 p-4 dark:border-[#304159] sm:px-6">
        {isProcessing && (
          <div
            aria-live="polite"
            className="mb-3 flex items-start gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-[#18263b] dark:text-[#b3c1d5]"
          >
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin"
            />
            {language === "fr"
              ? "Préparation de votre paiement sécurisé…"
              : "Preparing your secure payment…"}
          </div>
        )}

        {checkoutState === "error" && (
          <div
            aria-live="assertive"
            className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-rose-950/40 dark:text-[#fda4af]"
            role="alert"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 flex-none"
            />
            <span>
              {language === "fr"
                ? "Le paiement n’a pas pu être lancé. Veuillez réessayer."
                : "The payment could not be started. Please try again."}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="checkout-back-action h-11 gap-2"
            disabled={isProcessing}
            onClick={onBack}
            type="button"
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {language === "fr" ? "Précédent" : "Back"}
          </Button>
          <Button
            className="checkout-pay-action h-11 flex-1 gap-2 bg-emerald-600 text-sm text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            disabled={isProcessing}
            onClick={handleCheckout}
            type="button"
          >
            {isProcessing ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin"
              />
            ) : (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0">
              {language === "fr" ? "Payer" : "Pay"}
              <span className="checkout-pay-amount"> {formattedAmount}</span>
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}

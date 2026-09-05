"use client";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import {
  type PaymentCardSelection,
  createLeekPayCheckout,
} from "@/lib/leekpay";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface DialogProvidersProps {
  isOpen: boolean;
  onClose: () => void;
  card: PaymentCardSelection;
}

type CheckoutState = "idle" | "processing" | "error";
type PaymentProvider = "leekpay";

export function DialogProviders({
  isOpen,
  onClose,
  card,
}: DialogProvidersProps) {
  const { language } = useLanguage();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider>("leekpay");
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCheckoutState("idle");
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
  }, [isOpen]);

  const handleCheckout = async () => {
    if (requestRef.current || selectedProvider !== "leekpay") return;
    const controller = new AbortController();
    requestRef.current = controller;
    setCheckoutState("processing");

    try {
      const checkout = await createLeekPayCheckout(card.id, controller.signal);
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

  const handleClose = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    onClose();
  };

  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;
  const isProcessing = checkoutState === "processing";

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      open={isOpen}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none sm:w-[calc(100%-2rem)]">
          <div className="flex items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white sm:p-5">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold">
                {language === "fr"
                  ? "Choisir un provider"
                  : "Choose a provider"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-blue-100">
                {language === "fr"
                  ? "Sélectionnez le service qui traitera votre paiement."
                  : "Select the service that will process your payment."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                aria-label={language === "fr" ? "Fermer" : "Close"}
                className="rounded-md p-1 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="overflow-y-auto p-4 sm:p-6">
            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                {language === "fr" ? "Carte sélectionnée" : "Selected card"}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{card.name}</p>
                <p className="font-bold text-blue-700">{formattedAmount}</p>
              </div>
            </div>

            <p className="mb-3 text-sm font-medium text-slate-700">
              {language === "fr"
                ? "Providers disponibles"
                : "Available providers"}
            </p>

            <fieldset
              aria-label={
                language === "fr"
                  ? "Providers disponibles"
                  : "Available providers"
              }
              className="grid min-w-0 grid-cols-2 gap-3"
            >
              <button
                aria-pressed={selectedProvider === "leekpay"}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait ${
                  selectedProvider === "leekpay"
                    ? "border-blue-500 bg-blue-50/60"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
                disabled={isProcessing}
                onClick={() => setSelectedProvider("leekpay")}
                type="button"
              >
                <span className="relative h-8 w-28 max-w-full overflow-hidden">
                  <img
                    src={withBasePath("/images/leekpay.webp")}
                    alt="LeekPay"
                    width={1536}
                    height={1024}
                    className="absolute left-1/2 top-1/2 h-auto w-[143%] max-w-none -translate-x-[53%] -translate-y-[48%]"
                  />
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {language === "fr" ? "Disponible" : "Available"}
                </span>
              </button>
            </fieldset>
          </div>

          <div className="shrink-0 border-t border-slate-100 p-4 sm:px-6">
            {isProcessing && (
              <div
                aria-live="polite"
                className="mb-3 flex items-start gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600"
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
                className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
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

            <Button
              className="h-11 w-full gap-2 bg-emerald-600 text-sm text-white hover:bg-emerald-700"
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
              </span>
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

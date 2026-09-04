"use client";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import {
  LEEKPAY_CHECKOUT_CURRENCY,
  LEEKPAY_SCRIPT_URL,
  type LeekPayFailure,
  type LeekPaySuccessData,
  type PaymentCardSelection,
  closeLeekPayCheckout,
  isLeekPayPublishableKeyValid,
  isLeekPaySdkReady,
  startLeekPayCheckout,
} from "@/lib/leekpay";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  X,
} from "lucide-react";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export interface DialogProvidersProps {
  isOpen: boolean;
  onClose: () => void;
  card: PaymentCardSelection;
  /** Signal navigateur du provider, jamais une preuve de livraison confirmée. */
  onSuccess: (data: LeekPaySuccessData) => void;
  onFailure: (failure: LeekPayFailure) => void;
}

type SdkState = "loading" | "ready" | "unavailable";
type CheckoutState = "idle" | "processing" | "error";

export function DialogProviders({
  isOpen,
  onClose,
  card,
  onSuccess,
  onFailure,
}: DialogProvidersProps) {
  const { language } = useLanguage();
  const [sdkState, setSdkState] = useState<SdkState>(() =>
    isLeekPaySdkReady() && isLeekPayPublishableKeyValid() ? "ready" : "loading",
  );
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [lastFailure, setLastFailure] = useState<LeekPayFailure | null>(null);
  const checkoutLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    checkoutLockRef.current = false;
    setCheckoutState("idle");
    setLastFailure(null);
    setSdkState(
      isLeekPaySdkReady() && isLeekPayPublishableKeyValid()
        ? "ready"
        : "loading",
    );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || sdkState !== "loading") return;

    const timeoutId = window.setTimeout(() => {
      const isReady = isLeekPaySdkReady() && isLeekPayPublishableKeyValid();
      setSdkState(isReady ? "ready" : "unavailable");
      if (!isReady) setLastFailure({ code: "sdk_unavailable" });
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, sdkState]);

  const handleSdkReady = () => {
    setSdkState(
      isLeekPaySdkReady() && isLeekPayPublishableKeyValid()
        ? "ready"
        : "unavailable",
    );
  };

  const handleSdkUnavailable = () => {
    setSdkState("unavailable");
    setLastFailure({ code: "sdk_unavailable" });
  };

  const handleCheckout = () => {
    if (checkoutLockRef.current || sdkState !== "ready") return;

    checkoutLockRef.current = true;
    setCheckoutState("processing");
    setLastFailure(null);

    const result = startLeekPayCheckout({
      amount: card.amount,
      description: `Carte DRAVA - ${card.name} (${card.id})`,
      returnUrl: new URL(
        withBasePath("/payment-success/"),
        window.location.origin,
      ).href,
      onSuccess: (data) => {
        checkoutLockRef.current = false;
        onSuccess(data);
      },
      onCancel: () => {
        checkoutLockRef.current = false;
        onFailure({ code: "cancelled" });
      },
      onError: (failure) => {
        checkoutLockRef.current = false;
        setLastFailure(failure);
        setCheckoutState("error");
      },
    });

    if (!result.started) {
      checkoutLockRef.current = false;
      setLastFailure(result.failure);
      setCheckoutState("error");
    }
  };

  const handleClose = () => {
    if (checkoutState === "processing") closeLeekPayCheckout();
    checkoutLockRef.current = false;
    onClose();
  };

  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;

  const paymentButtonLabel = (() => {
    if (sdkState === "loading") {
      return language === "fr" ? "Chargement de LeekPay…" : "Loading LeekPay…";
    }
    return language === "fr" ? "Payer avec LeekPay" : "Pay with LeekPay";
  })();

  return (
    <>
      <Script
        id="leekpay-sdk"
        onError={handleSdkUnavailable}
        onReady={handleSdkReady}
        src={LEEKPAY_SCRIPT_URL}
        strategy="afterInteractive"
      />

      {checkoutState !== "processing" && (
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

                <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <CreditCard aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          LeekPay
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            sdkState === "unavailable"
                              ? "bg-red-50 text-red-700"
                              : sdkState === "loading"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {sdkState === "unavailable"
                            ? language === "fr"
                              ? "Indisponible"
                              : "Unavailable"
                            : sdkState === "loading"
                              ? language === "fr"
                                ? "Chargement"
                                : "Loading"
                              : language === "fr"
                                ? "Disponible"
                                : "Available"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {language === "fr"
                          ? `Paiement traité par LeekPay en ${LEEKPAY_CHECKOUT_CURRENCY}.`
                          : `Payment processed by LeekPay in ${LEEKPAY_CHECKOUT_CURRENCY}.`}
                      </p>
                    </div>
                  </div>

                  {sdkState === "loading" && (
                    <div
                      aria-live="polite"
                      className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600"
                    >
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                      {language === "fr"
                        ? "Connexion sécurisée à LeekPay…"
                        : "Connecting securely to LeekPay…"}
                    </div>
                  )}

                  {sdkState === "unavailable" && (
                    <div
                      aria-live="polite"
                      className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
                    >
                      <AlertCircle
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 flex-none"
                      />
                      {language === "fr"
                        ? "Le service LeekPay est momentanément indisponible."
                        : "LeekPay is temporarily unavailable."}
                    </div>
                  )}

                  {checkoutState === "error" && (
                    <div
                      aria-live="assertive"
                      className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
                      role="alert"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 flex-none"
                        />
                        <span>
                          {language === "fr"
                            ? "Le paiement n’a pas pu être lancé."
                            : "The payment could not be started."}
                        </span>
                      </div>
                      {lastFailure && (
                        <Button
                          className="mt-3"
                          onClick={() => onFailure(lastFailure)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {language === "fr" ? "Continuer" : "Continue"}
                        </Button>
                      )}
                    </div>
                  )}

                <Button
                  className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={sdkState !== "ready"}
                  onClick={handleCheckout}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  {paymentButtonLabel}
                </Button>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </>
  );
}

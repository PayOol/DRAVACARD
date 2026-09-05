"use client";

import { Button } from "@/components/ui/button";
import { SebPayForm } from "@/components/payment/SebPayForm";
import PaymentResult from "@/components/payment/PaymentResult";
import {
  SharedPaymentProviders,
  type PaymentProviderState,
} from "@/components/payment/SharedPaymentProviders";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCustomer } from "@/lib/payment-customer";
import type { PaymentCardSelection } from "@/lib/leekpay";
import { createPaymentCheckout, type PaymentInput } from "@/lib/payment-api";
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from "@/lib/payment-providers";
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
  provider: PaymentProvider;
  phase: "providers" | "payment";
  onProviderChange: (provider: PaymentProvider) => void;
  onConfigure: () => void;
  onBusyChange: (busy: boolean) => void;
  onOrderCreated: () => void;
  onClose: () => void;
  onBack: () => void;
}

type CheckoutState = "idle" | "processing" | "error";

export function PaymentProviders({
  card,
  customer,
  provider,
  phase,
  onProviderChange,
  onConfigure,
  onBusyChange,
  onOrderCreated,
  onClose,
  onBack,
}: PaymentProvidersProps) {
  const { language } = useLanguage();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [createdOrder, setCreatedOrder] = useState<{
    orderToken: string;
    providerLink?: string;
  } | null>(null);
  const [availability, setAvailability] = useState<PaymentProviderState>({
    providers: null,
    loading: true,
    error: false,
  });
  const requestRef = useRef<AbortController | null>(null);
  const notifyBusy = useRef(onBusyChange);
  notifyBusy.current = onBusyChange;
  const isPresent = useIsPresent();
  const selectedProvider = PAYMENT_PROVIDERS.find(
    (item) => item.id === provider,
  );
  const available =
    availability.providers?.find((item) => item.id === provider)?.available ===
    true;

  // Back can interrupt payment from the mobile header or browser navigation.
  // Abort as soon as the panel exits, before its exit animation completes.
  useLayoutEffect(() => {
    if (!isPresent && requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
      notifyBusy.current(false);
    }
  }, [isPresent]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        requestRef.current?.abort();
        requestRef.current = null;
        setCheckoutState("idle");
        notifyBusy.current(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
        notifyBusy.current(false);
      }
    };
  }, []);

  const submit = async (payment?: PaymentInput) => {
    if (requestRef.current || !selectedProvider) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setCheckoutState("processing");
    notifyBusy.current(true);

    try {
      const checkout = await createPaymentCheckout(
        {
          selection: { service: "cards", productId: card.id },
          provider,
          customer,
          consent: true,
          ...(payment ? { payment } : {}),
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        if (checkout.checkoutUrl) window.location.assign(checkout.checkoutUrl);
        else {
          setCreatedOrder({
            orderToken: checkout.orderToken,
            providerLink: checkout.providerLink,
          });
          onOrderCreated();
          requestRef.current = null;
          setCheckoutState("idle");
          notifyBusy.current(false);
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setCheckoutState("error");
        notifyBusy.current(false);
      }
    }
  };

  const handleCheckout = () => {
    if (!available || requestRef.current || !selectedProvider) return;
    if (selectedProvider.flow === "mobile-money") onConfigure();
    else void submit();
  };

  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;
  const isProcessing = checkoutState === "processing";
  const error = checkoutState === "error" && (
    <div
      aria-live="assertive"
      className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-rose-950/40 dark:text-[#fda4af]"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
      <span>
        {language === "fr"
          ? "Le paiement n’a pas pu être lancé. Veuillez réessayer."
          : "The payment could not be started. Please try again."}
      </span>
    </div>
  );

  if (createdOrder)
    return (
      <div className="checkout-scroll checkout-card-result min-h-0 overflow-y-auto">
        <PaymentResult
          status="success"
          embedded
          orderToken={createdOrder.orderToken}
          providerLink={createdOrder.providerLink}
          onReturn={onClose}
        />
      </div>
    );

  if (phase === "payment")
    return (
      <>
        <div className="checkout-scroll min-h-0 overflow-y-auto p-4 sm:p-6">
          <SebPayForm
            selection={{ service: "cards", productId: card.id }}
            whatsapp={customer.whatsapp}
            busy={isProcessing}
            onSubmit={submit}
          />
          {error}
        </div>
        <div className="checkout-actions checkout-actions-row">
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
        </div>
      </>
    );

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

        <SharedPaymentProviders
          value={provider}
          onChange={onProviderChange}
          disabled={isProcessing}
          onAvailabilityChange={setAvailability}
        />
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

        {error}

        <div className="checkout-actions-row flex gap-3">
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
            className="checkout-primary-action checkout-pay-action h-11 flex-1 gap-2"
            disabled={isProcessing || !available}
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
              {selectedProvider?.flow === "mobile-money"
                ? language === "fr"
                  ? "Suivant"
                  : "Next"
                : language === "fr"
                  ? "Payer"
                  : "Pay"}
              {selectedProvider?.flow !== "mobile-money" && (
                <span className="checkout-pay-amount"> {formattedAmount}</span>
              )}
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}

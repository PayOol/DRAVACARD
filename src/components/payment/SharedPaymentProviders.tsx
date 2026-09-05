"use client";

import { CheckoutProviderOption } from "@/components/ui/CheckoutProviderOption";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { getPaymentProviders } from "@/lib/payment-api";
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from "@/lib/payment-providers";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface PaymentProviderState {
  providers: { id: PaymentProvider; available: boolean }[] | null;
  loading: boolean;
  error: boolean;
}

interface SharedPaymentProvidersProps {
  value: PaymentProvider;
  onChange: (id: PaymentProvider) => void;
  disabled?: boolean;
  onAvailabilityChange?: (state: PaymentProviderState) => void;
}

export function SharedPaymentProviders({
  value,
  onChange,
  disabled = false,
  onAvailabilityChange,
}: SharedPaymentProvidersProps) {
  const { language } = useLanguage();
  const [state, setState] = useState<PaymentProviderState>({
    providers: null,
    loading: true,
    error: false,
  });
  const [revision, setRevision] = useState(0);
  const notify = useRef(onAvailabilityChange);
  notify.current = onAvailabilityChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision explicitly retries availability.
  useEffect(() => {
    const controller = new AbortController();
    const update = (next: PaymentProviderState) => {
      if (controller.signal.aborted) return;
      setState(next);
      notify.current?.(next);
    };
    update({ providers: null, loading: true, error: false });
    void getPaymentProviders(controller.signal)
      .then((providers) => update({ providers, loading: false, error: false }))
      .catch(() => update({ providers: null, loading: false, error: true }));
    return () => controller.abort();
  }, [revision]);

  const label =
    language === "fr" ? "Choisir un prestataire" : "Choose a provider";
  return (
    <div className="payment-providers">
      <fieldset className="min-w-0" aria-label={label}>
        <legend className="mb-3 text-sm font-medium text-slate-700 dark:text-[#b3c1d5]">
          {label}
        </legend>
        <div className="checkout-provider-options">
          {PAYMENT_PROVIDERS.map((provider) => (
            <CheckoutProviderOption
              key={provider.id}
              id={provider.id}
              name={provider.name}
              selected={value === provider.id}
              onSelect={() => onChange(provider.id)}
              disabled={disabled || state.loading || state.error}
              unavailable={
                state.providers?.find((item) => item.id === provider.id)
                  ?.available === false
              }
              recommended={provider.recommended}
              logoSrc={withBasePath(provider.logo)}
              logoClassName={provider.logoClassName}
            />
          ))}
        </div>
      </fieldset>
      {state.loading && (
        <output
          className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-[#b3c1d5]"
        >
          <LoaderCircle
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {language === "fr"
            ? "Chargement des prestataires…"
            : "Loading providers…"}
        </output>
      )}
      {state.error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-[#653242] dark:bg-[#301923] dark:text-[#fda4af]"
          role="alert"
        >
          <p className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {language === "fr"
              ? "Les prestataires sont momentanément indisponibles."
              : "Payment providers are temporarily unavailable."}
          </p>
          <Button
            className="mt-3 min-h-11"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => setRevision((current) => current + 1)}
          >
            {language === "fr" ? "Réessayer" : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}

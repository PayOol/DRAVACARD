"use client";

import { UsageNotes } from "@/components/ui/dialog-notes";
import { PaymentProviders } from "@/components/ui/dialog-providers";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCardSelection } from "@/lib/leekpay";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DialogCheckoutProps {
  card: PaymentCardSelection;
  onClose: () => void;
}

type CheckoutStep = "notes" | "providers";

export function DialogCheckout({ card, onClose }: DialogCheckoutProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<CheckoutStep>("notes");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (step === "providers") titleRef.current?.focus();
  }, [step]);

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none sm:w-[calc(100%-2rem)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (document.activeElement instanceof HTMLElement) {
              returnFocusRef.current = document.activeElement;
            }
            titleRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white sm:p-5">
            <div>
              <DialogPrimitive.Title
                className="text-xl font-bold focus:outline-none"
                ref={titleRef}
                tabIndex={-1}
              >
                {step === "notes"
                  ? language === "fr"
                    ? "Notes d’utilisation"
                    : "Usage Notes"
                  : language === "fr"
                    ? "Choisir un provider"
                    : "Choose a provider"}
              </DialogPrimitive.Title>
              {step === "providers" && (
                <DialogPrimitive.Description className="mt-1 text-sm text-blue-100">
                  {language === "fr"
                    ? "Sélectionnez le service qui traitera votre paiement."
                    : "Select the service that will process your payment."}
                </DialogPrimitive.Description>
              )}
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

          {step === "notes" ? (
            <UsageNotes
              onAccept={() => setStep("providers")}
              onClose={onClose}
            />
          ) : (
            <PaymentProviders card={card} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

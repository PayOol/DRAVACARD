"use client";

import { CustomerDetails } from "@/components/ui/dialog-customer";
import { UsageNotes } from "@/components/ui/dialog-notes";
import { PaymentProviders } from "@/components/ui/dialog-providers";
import { detectCustomerLocation } from "@/lib/customer-location";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCardSelection } from "@/lib/leekpay";
import {
  type PaymentCustomer,
  normalizePaymentCustomer,
} from "@/lib/payment-customer";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import { X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface DialogCheckoutProps {
  card: PaymentCardSelection;
  onClose: () => void;
}

type CheckoutStep = "notes" | "customer" | "providers";

function CheckoutPanel({
  children,
  reducedMotion,
}: { children: ReactNode; reducedMotion: boolean }) {
  const isPresent = useIsPresent();
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.inert = !isPresent;
  }, [isPresent]);
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeInOut" }}
      aria-hidden={!isPresent || undefined}
      ref={panelRef}
    >
      {children}
    </motion.div>
  );
}

export function DialogCheckout({ card, onClose }: DialogCheckoutProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<CheckoutStep>("notes");
  const [customer, setCustomer] = useState<PaymentCustomer>({
    email: "",
    whatsapp: "",
  });
  const [locationRequested, setLocationRequested] = useState(false);
  // Keep manual edits (including clearing the field) authoritative until close.
  const whatsappEditedRef = useRef(false);
  const validCustomer = normalizePaymentCustomer(customer);
  const reducedMotion = useReducedMotion() === true;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: step !== "notes" });
  }, [step]);

  useEffect(() => {
    if (!locationRequested) return;
    const controller = new AbortController();
    void detectCustomerLocation(controller.signal).then((location) => {
      if (!location || controller.signal.aborted) return;
      setCustomer((current) =>
        whatsappEditedRef.current || current.whatsapp
          ? current
          : { ...current, whatsapp: location.callingCode },
      );
    });
    return () => controller.abort();
  }, [locationRequested]);

  const titles =
    language === "fr"
      ? {
          notes: "Notes d’utilisation",
          customer: "Vos coordonnées",
          providers: "Choisir un provider",
        }
      : {
          notes: "Usage Notes",
          customer: "Your contact details",
          providers: "Choose a provider",
        };
  const descriptions =
    language === "fr"
      ? {
          notes:
            "Consultez les conditions d’utilisation de votre carte avant de continuer.",
          customer: "Renseignez votre e-mail et votre numéro WhatsApp.",
          providers: "Sélectionnez le service qui traitera votre paiement.",
        }
      : {
          notes: "Read the card usage notes before continuing.",
          customer: "Enter your email address and WhatsApp number.",
          providers: "Select the service that will process your payment.",
        };

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
          asChild
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (document.activeElement instanceof HTMLElement)
              returnFocusRef.current = document.activeElement;
            titleRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <motion.div
            layout={reducedMotion ? false : "size"}
            transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
            style={{ x: "-50%", y: "-50%" }}
            className="fixed left-1/2 top-1/2 z-[61] flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none sm:w-[calc(100%-2rem)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white sm:p-5">
              <div>
                <DialogPrimitive.Title
                  className="text-xl font-bold focus:outline-none"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  {titles[step]}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  className={
                    step === "notes" ? "sr-only" : "mt-1 text-sm text-blue-100"
                  }
                >
                  {descriptions[step]}
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

            <AnimatePresence initial={false} mode="wait">
              <CheckoutPanel key={step} reducedMotion={reducedMotion}>
                {step === "notes" ? (
                  <UsageNotes
                    onAccept={() => {
                      setStep("customer");
                      setLocationRequested(true);
                    }}
                    onClose={onClose}
                  />
                ) : step === "customer" ? (
                  <CustomerDetails
                    value={customer}
                    onChange={(details) => {
                      if (details.whatsapp !== customer.whatsapp)
                        whatsappEditedRef.current = true;
                      setCustomer(details);
                    }}
                    onNext={(details) => {
                      setCustomer(details);
                      setStep("providers");
                    }}
                    onBack={() => setStep("notes")}
                  />
                ) : validCustomer ? (
                  <PaymentProviders
                    card={card}
                    customer={validCustomer}
                    onBack={() => setStep("customer")}
                  />
                ) : null}
              </CheckoutPanel>
            </AnimatePresence>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import { CustomerDetails } from "@/components/ui/dialog-customer";
import { UsageNotes } from "@/components/ui/dialog-notes";
import { PaymentProviders } from "@/components/ui/dialog-providers";
import "./checkout-mobile.css";
import { detectCustomerLocation } from "@/lib/customer-location";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCardSelection } from "@/lib/leekpay";
import {
  type PaymentCustomer,
  normalizePaymentCustomer,
} from "@/lib/payment-customer";
import { MOBILE_LAYOUT_QUERY } from "@/lib/responsive-layout";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import { ArrowLeft, Check, CreditCard, X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
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

export function DialogCheckout({
  card,
  onClose: onClosed,
}: DialogCheckoutProps) {
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
  const [isOpen, setIsOpen] = useState(true);
  const closeRequestedRef = useRef(false);
  const closeFinishedRef = useRef(false);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const finishClose = useCallback(() => {
    if (!closeRequestedRef.current || closeFinishedRef.current) return;
    closeFinishedRef.current = true;
    onClosedRef.current();
  }, []);
  const onClose = useCallback(() => {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    setIsOpen(false);
    if (reducedMotion) finishClose();
  }, [finishClose, reducedMotion]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(
    null,
  );
  const historyId = useId();
  const historyAttachedRef = useRef(false);
  const stepRef = useRef(step);
  const closeRef = useRef(onClose);
  stepRef.current = step;
  closeRef.current = onClose;

  useEffect(() => {
    if (isOpen) return;
    // Animation events can be skipped when a tab is hidden or CSS is replaced.
    const timeout = window.setTimeout(finishClose, reducedMotion ? 0 : 260);
    return () => window.clearTimeout(timeout);
  }, [finishClose, isOpen, reducedMotion]);

  useLayoutEffect(() => {
    if (dialogElement) dialogElement.inert = !isOpen;
  }, [dialogElement, isOpen]);

  // A single temporary entry lets Android Back unwind this in-memory flow.
  // Neither the customer draft nor any payment data enters browser history.
  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const addCheckpoint = () => {
      window.history.pushState(
        { ...window.history.state, dravaCheckout: historyId },
        "",
      );
    };
    const handleBack = () => {
      if (closeRequestedRef.current) return;
      if (window.history.state?.dravaCheckout === historyId) return;
      if (stepRef.current === "notes") {
        closeRef.current();
        return;
      }
      const previous = stepRef.current === "providers" ? "customer" : "notes";
      stepRef.current = previous;
      setStep(previous);
      addCheckpoint();
    };
    const attachHistory = () => {
      if (!mobileViewport.matches || historyAttachedRef.current) return;
      historyAttachedRef.current = true;
      if (window.history.state?.dravaCheckout !== historyId) addCheckpoint();
      window.addEventListener("popstate", handleBack);
    };
    attachHistory();
    mobileViewport.addEventListener("change", attachHistory);
    return () => {
      mobileViewport.removeEventListener("change", attachHistory);
      window.removeEventListener("popstate", handleBack);
      historyAttachedRef.current = false;
      // Once attached, retain the checkpoint across resizes until real close.
      // Strict Mode reattaches before this microtask; only a real close pops it.
      queueMicrotask(() => {
        if (
          !historyAttachedRef.current &&
          window.history.state?.dravaCheckout === historyId
        ) {
          window.history.back();
        }
      });
    };
  }, [historyId]);

  // iOS may resize only the visual viewport when the keyboard opens.
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogElement;
    if (!viewport || !dialog) return;
    let resizeFrame = 0;
    const updateViewport = () => {
      dialog.style.setProperty(
        "--checkout-viewport-height",
        `${viewport.height}px`,
      );
      dialog.style.setProperty(
        "--checkout-viewport-top",
        `${viewport.offsetTop}px`,
      );
      dialog.dataset.keyboardOpen = String(
        viewport.height < window.innerHeight * 0.75,
      );
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (!window.matchMedia(MOBILE_LAYOUT_QUERY).matches) return;
        const focused = document.activeElement;
        if (!(focused instanceof HTMLInputElement) || !dialog.contains(focused))
          return;
        const scroller = focused.closest(".checkout-scroll");
        if (!scroller) return;
        const fieldBounds = focused.getBoundingClientRect();
        const scrollBounds = scroller.getBoundingClientRect();
        if (
          fieldBounds.top < scrollBounds.top + 16 ||
          fieldBounds.bottom > scrollBounds.bottom - 16
        ) {
          focused.scrollIntoView({ block: "center", inline: "nearest" });
        }
      });
    };
    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    return () => {
      cancelAnimationFrame(resizeFrame);
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
    };
  }, [dialogElement]);

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
  const steps: CheckoutStep[] = ["notes", "customer", "providers"];
  const stepLabels =
    language === "fr"
      ? ["Conditions", "Coordonnées", "Paiement"]
      : ["Conditions", "Contact", "Payment"];
  const currentStep = steps.indexOf(step);
  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="checkout-overlay fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
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
            const isVisible = (element: HTMLElement | null) =>
              element?.isConnected &&
              element.getClientRects().length > 0 &&
              getComputedStyle(element).visibility !== "hidden" &&
              !element.closest("[inert]");
            const originalTrigger = returnFocusRef.current;
            if (
              isVisible(originalTrigger) &&
              originalTrigger !== document.body &&
              originalTrigger !== document.documentElement
            ) {
              originalTrigger?.focus({ preventScroll: true });
              return;
            }
            // The original trigger can be hidden after crossing the layout
            // breakpoint while this shared checkout remains open.
            const visiblePurchase = Array.from(
              document.querySelectorAll<HTMLElement>("[data-catalog-purchase]"),
            ).find(
              (element) =>
                element.dataset.catalogPurchase === card.id &&
                isVisible(element),
            );
            if (visiblePurchase) {
              visiblePurchase.focus({ preventScroll: true });
              return;
            }
            const heading = Array.from(
              document.querySelectorAll<HTMLElement>("main h1"),
            ).find(isVisible);
            if (heading) {
              if (!heading.hasAttribute("tabindex")) {
                heading.setAttribute("tabindex", "-1");
                heading.addEventListener(
                  "blur",
                  () => heading.removeAttribute("tabindex"),
                  { once: true },
                );
              }
              heading.focus({ preventScroll: true });
            }
          }}
        >
          <motion.div
            ref={setDialogElement}
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                !isOpen &&
                (event.animationName === "checkout-dialog-exit" ||
                  event.animationName === "checkout-mobile-exit")
              ) {
                finishClose();
              }
            }}
            layout={reducedMotion ? false : "size"}
            transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
            style={{ x: "-50%", y: "-50%" }}
            className="checkout-dialog fixed left-1/2 top-1/2 z-[61] flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none sm:w-[calc(100%-2rem)]"
          >
            <div className="checkout-heading flex shrink-0 items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white sm:p-5">
              <button
                type="button"
                className="checkout-mobile-back"
                aria-label={language === "fr" ? "Retour" : "Back"}
                onClick={() => {
                  if (step === "notes") onClose();
                  else setStep(step === "providers" ? "customer" : "notes");
                }}
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="checkout-heading-text">
                <DialogPrimitive.Title
                  className="checkout-title text-xl font-bold focus:outline-none"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  {titles[step]}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  className={
                    step === "notes"
                      ? "sr-only"
                      : "checkout-description mt-1 text-sm text-blue-100"
                  }
                >
                  {descriptions[step]}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  aria-label={language === "fr" ? "Fermer" : "Close"}
                  className="checkout-close rounded-md p-1 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <div className="checkout-mobile-context">
              <ol
                className="checkout-mobile-steps"
                aria-label={
                  language === "fr" ? "Étapes de votre commande" : "Order steps"
                }
              >
                {steps.map((item, index) => (
                  <li
                    key={item}
                    aria-current={item === step ? "step" : undefined}
                    data-complete={index < currentStep || undefined}
                  >
                    <span className="checkout-step-number" aria-hidden="true">
                      {index < currentStep ? <Check size={13} /> : index + 1}
                    </span>
                    <span>{stepLabels[index]}</span>
                  </li>
                ))}
              </ol>
              <div className="checkout-mobile-selection">
                <span className="checkout-card-icon">
                  <CreditCard size={22} aria-hidden="true" />
                </span>
                <div>
                  <span className="checkout-selection-label">
                    {language === "fr" ? "Votre carte" : "Your card"}
                  </span>
                  <p>{card.name}</p>
                </div>
                <strong>{formattedAmount}</strong>
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {isOpen && (
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
              )}
            </AnimatePresence>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

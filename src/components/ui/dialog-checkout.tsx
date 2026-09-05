"use client";

import { CustomerDetails } from "@/components/ui/dialog-customer";
import { UsageNotes } from "@/components/ui/dialog-notes";
import { PaymentProviders } from "@/components/ui/dialog-providers";
import "./checkout-mobile.css";
import "./checkout-content.css";
import { detectCustomerLocation } from "@/lib/customer-location";
import { useLanguage } from "@/lib/language-context";
import type { PaymentCardSelection } from "@/lib/leekpay";
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from "@/lib/payment-providers";
import {
  type PaymentCustomer,
  normalizePaymentCustomer,
} from "@/lib/payment-customer";
import { MOBILE_LAYOUT_QUERY } from "@/lib/responsive-layout";
import { CheckoutShell, CheckoutPanel } from "@/components/ui/CheckoutShell";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { CreditCard } from "lucide-react";
import {
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

type CheckoutStep = "notes" | "customer" | "providers" | "payment";

export function DialogCheckout({
  card,
  onClose: onClosed,
}: DialogCheckoutProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<CheckoutStep>("notes");
  const [provider, setProvider] = useState<PaymentProvider>(
    PAYMENT_PROVIDERS.find((item) => item.recommended)?.id ??
      PAYMENT_PROVIDERS[0].id,
  );
  const selectedProvider = PAYMENT_PROVIDERS.find(
    (item) => item.id === provider,
  );
  const [paymentBusy, setPaymentBusy] = useState(false);
  const paymentBusyRef = useRef(false);
  const orderCreatedRef = useRef(false);
  const onBusyChange = useCallback((busy: boolean) => {
    paymentBusyRef.current = busy;
    setPaymentBusy(busy);
  }, []);
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
    if (closeRequestedRef.current || paymentBusyRef.current) return;
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
  const scrollPositions = useRef<Record<CheckoutStep, number>>({
    notes: 0,
    customer: 0,
    providers: 0,
    payment: 0,
  });
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
      if (paymentBusyRef.current) {
        addCheckpoint();
        return;
      }
      if (stepRef.current === "notes" || orderCreatedRef.current) {
        closeRef.current();
        return;
      }
      const previous =
        stepRef.current === "payment"
          ? "providers"
          : stepRef.current === "providers"
            ? "customer"
            : "notes";
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
          payment: `Paiement ${selectedProvider?.name ?? ""}`,
        }
      : {
          notes: "Usage Notes",
          customer: "Your contact details",
          providers: "Choose a provider",
          payment: `${selectedProvider?.name ?? ""} payment`,
        };
  const descriptions =
    language === "fr"
      ? {
          notes:
            "Consultez les conditions d’utilisation de votre carte avant de continuer.",
          customer: "Renseignez votre e-mail et votre numéro WhatsApp.",
          providers: "Sélectionnez le service qui traitera votre paiement.",
          payment:
            "Choisissez votre opérateur et confirmez le numéro de paiement.",
        }
      : {
          notes: "Read the card usage notes before continuing.",
          customer: "Enter your email address and WhatsApp number.",
          providers: "Select the service that will process your payment.",
          payment: "Choose your operator and confirm the payment number.",
        };
  const steps: CheckoutStep[] = ["notes", "customer", "providers"];
  if (selectedProvider?.flow === "mobile-money") steps.push("payment");
  const stepLabels =
    language === "fr"
      ? ["Conditions", "Coordonnées", "Paiement"]
      : ["Conditions", "Contact", "Payment"];
  if (selectedProvider?.flow === "mobile-money") {
    stepLabels[1] = "Contact";
    stepLabels.push(language === "fr" ? "Validation" : "Approval");
  }
  const currentStep = steps.indexOf(step);
  const formattedAmount = `${card.amount.toLocaleString(
    language === "fr" ? "fr-FR" : "en-US",
  )} ${card.displayCurrency}`;

  return (
    <CheckoutShell
      open={isOpen}
      onClose={onClose}
      onExitComplete={finishClose}
      canDismiss={!paymentBusy}
      onBack={() => {
        if (paymentBusyRef.current) return;
        if (step === "notes" || orderCreatedRef.current) onClose();
        else
          setStep(
            step === "payment"
              ? "providers"
              : step === "providers"
                ? "customer"
                : "notes",
          );
      }}
      title={titles[step]}
      description={
        orderCreatedRef.current
          ? language === "fr"
            ? "Consultez le statut du paiement et les détails de votre commande."
            : "View the payment status and your order details."
          : descriptions[step]
      }
      currentStep={currentStep}
      steps={stepLabels}
      selection={{
        label: language === "fr" ? "Votre carte" : "Your card",
        name: card.name,
        amount: formattedAmount,
        icon: <CreditCard size={22} aria-hidden="true" />,
      }}
      reducedMotion={reducedMotion}
      titleRef={titleRef}
      contentRef={setDialogElement}
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
            element.dataset.catalogPurchase === card.id && isVisible(element),
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
      <AnimatePresence initial={false} mode="sync">
        {isOpen && (
          <CheckoutPanel
            key={step}
            reducedMotion={reducedMotion}
            scrollTop={scrollPositions.current[step]}
            onScrollTopChange={(position) => {
              scrollPositions.current[step] = position;
            }}
          >
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
                provider={provider}
                phase={step === "payment" ? "payment" : "providers"}
                onProviderChange={setProvider}
                onConfigure={() => setStep("payment")}
                onBusyChange={onBusyChange}
                onOrderCreated={() => {
                  orderCreatedRef.current = true;
                }}
                onClose={onClose}
                onBack={() =>
                  setStep(step === "payment" ? "providers" : "customer")
                }
              />
            ) : null}
          </CheckoutPanel>
        )}
      </AnimatePresence>
    </CheckoutShell>
  );
}

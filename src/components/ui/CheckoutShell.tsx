"use client";

import { useLanguage } from "@/lib/language-context";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useIsPresent } from "framer-motion";
import { ArrowLeft, Check, X } from "lucide-react";
import { type ReactNode, type Ref, useLayoutEffect, useRef } from "react";
import "./checkout-mobile.css";

interface CheckoutShellProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  canDismiss?: boolean;
  onExitComplete: () => void;
  title: string;
  description: string;
  currentStep: number;
  steps: string[];
  selection: { label: string; name: string; amount: string; icon: ReactNode };
  reducedMotion: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  contentRef: Ref<HTMLDivElement>;
  onOpenAutoFocus: (event: Event) => void;
  onCloseAutoFocus: (event: Event) => void;
  className?: string;
  children: ReactNode;
}

// One presentation for every product. Product controllers provide information
// and callbacks; they keep their own validation and server payment contracts.
export function CheckoutShell({
  open,
  onClose,
  onBack,
  canDismiss = true,
  onExitComplete,
  title,
  description,
  currentStep,
  steps,
  selection,
  reducedMotion,
  titleRef,
  contentRef,
  onOpenAutoFocus,
  onCloseAutoFocus,
  className = "",
  children,
}: CheckoutShellProps) {
  const { language } = useLanguage();
  const fr = language === "fr";
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && canDismiss) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="checkout-overlay fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm dark:bg-black/[0.65]" />
        <DialogPrimitive.Content
          asChild
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
        >
          <motion.div
            ref={contentRef}
            data-checkout-shell="shared"
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                !open &&
                (event.animationName === "checkout-dialog-exit" ||
                  event.animationName === "checkout-mobile-exit")
              )
                onExitComplete();
            }}
            layout={reducedMotion ? false : "size"}
            transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
            style={{ x: "-50%", y: "-50%" }}
            className={`checkout-dialog fixed left-1/2 top-1/2 z-[61] flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none dark:bg-[#111c2e] dark:text-[#e6edf7] dark:shadow-black/40 sm:w-[calc(100%-2rem)] ${className}`}
          >
            <div className="checkout-heading flex shrink-0 items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white dark:border-[#304159] dark:from-blue-800 dark:to-blue-950 sm:p-5">
              <button
                type="button"
                className="checkout-mobile-back"
                aria-label={fr ? "Retour" : "Back"}
                disabled={!canDismiss}
                onClick={onBack}
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="checkout-heading-text">
                <DialogPrimitive.Title
                  className="checkout-title text-xl font-bold focus:outline-none"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  className={
                    currentStep === 0
                      ? "sr-only"
                      : "checkout-description mt-1 text-sm text-blue-100"
                  }
                >
                  {description}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  disabled={!canDismiss}
                  aria-label={fr ? "Fermer" : "Close"}
                  className="checkout-close rounded-md p-1 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </DialogPrimitive.Close>
            </div>
            <div className="checkout-mobile-context">
              <ol
                className="checkout-mobile-steps"
                aria-label={fr ? "Étapes de votre commande" : "Order steps"}
              >
                {steps.map((label, index) => (
                  <li
                    key={label}
                    aria-current={currentStep === index ? "step" : undefined}
                    data-complete={index < currentStep || undefined}
                  >
                    <span className="checkout-step-number" aria-hidden="true">
                      {index < currentStep ? <Check size={13} /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>
              <div className="checkout-mobile-selection">
                <span className="checkout-card-icon">{selection.icon}</span>
                <div>
                  <span className="checkout-selection-label">
                    {selection.label}
                  </span>
                  <p>{selection.name}</p>
                </div>
                <strong>{selection.amount}</strong>
              </div>
            </div>
            <div className="checkout-step-stack">{children}</div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CheckoutPanel({
  children,
  reducedMotion,
  scrollTop,
  onScrollTopChange,
}: {
  children: ReactNode;
  reducedMotion: boolean;
  scrollTop?: number;
  onScrollTopChange?: (scrollTop: number) => void;
}) {
  const isPresent = useIsPresent();
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.inert = !isPresent;
  }, [isPresent]);
  useLayoutEffect(() => {
    const scroller = panelRef.current?.querySelector(".checkout-scroll");
    if (scroller && scrollTop !== undefined) scroller.scrollTop = scrollTop;
  }, [scrollTop]);
  return (
    <motion.div
      ref={panelRef}
      className="checkout-step-panel"
      onScrollCapture={(event) => {
        if (
          isPresent &&
          event.target instanceof HTMLElement &&
          event.target.matches(".checkout-scroll")
        ) {
          onScrollTopChange?.(event.target.scrollTop);
        }
      }}
      aria-hidden={!isPresent || undefined}
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

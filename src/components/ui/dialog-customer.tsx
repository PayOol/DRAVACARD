"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { MOBILE_LAYOUT_QUERY } from "@/lib/responsive-layout";
import {
  type PaymentCustomer,
  normalizeCustomerEmail,
  normalizePaymentCustomer,
  normalizeWhatsAppNumber,
} from "@/lib/payment-customer";
import { ArrowLeft, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

interface CustomerDetailsProps {
  value: PaymentCustomer;
  onChange: (value: PaymentCustomer) => void;
  onNext: (customer: PaymentCustomer) => void;
  onBack: () => void;
}

export function CustomerDetails({
  value,
  onChange,
  onNext,
  onBack,
}: CustomerDetailsProps) {
  const { language } = useLanguage();
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const emailInvalid = submitted && !normalizeCustomerEmail(value.email);
  const whatsappInvalid = submitted && !normalizeWhatsAppNumber(value.whatsapp);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const customer = normalizePaymentCustomer(value);
    if (!customer) {
      if (!normalizeCustomerEmail(value.email)) emailRef.current?.focus();
      else whatsappRef.current?.focus();
      return;
    }
    onNext(customer);
  };

  const fieldClass =
    "h-12 w-full rounded-lg border bg-white pl-11 pr-3 text-base text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:bg-[#0b1220] dark:text-[#e6edf7] dark:caret-[#93c5fd] dark:placeholder:text-[#8193ad] dark:focus:border-[#93c5fd] dark:focus:ring-blue-400/30";

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="checkout-scroll checkout-customer-fields min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-800 dark:text-[#e6edf7]"
            htmlFor={`${id}-email`}
          >
            <span
              aria-hidden="true"
              className="mr-1 text-red-600 dark:text-[#fda4af]"
            >
              *
            </span>
            {language === "fr" ? "Adresse e-mail" : "Email address"}
          </label>
          <div className="relative">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 dark:text-[#8193ad]"
            />
            <input
              ref={emailRef}
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              enterKeyHint="next"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  window.matchMedia(MOBILE_LAYOUT_QUERY).matches
                ) {
                  event.preventDefault();
                  whatsappRef.current?.focus();
                }
              }}
              spellCheck={false}
              required
              maxLength={254}
              placeholder={
                language === "fr" ? "vous@exemple.com" : "you@example.com"
              }
              value={value.email}
              onChange={(event) =>
                onChange({ ...value, email: event.target.value })
              }
              aria-invalid={emailInvalid || undefined}
              aria-describedby={emailInvalid ? `${id}-email-error` : undefined}
              className={
                fieldClass +
                (emailInvalid
                  ? " border-red-500 dark:border-[#fda4af]"
                  : " border-slate-200 dark:border-[#304159]")
              }
            />
          </div>
          {emailInvalid && (
            <p
              className="mt-2 text-sm text-red-600 dark:text-[#fda4af]"
              id={`${id}-email-error`}
              role="alert"
            >
              {language === "fr"
                ? "Saisissez une adresse e-mail valide."
                : "Enter a valid email address."}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-800 dark:text-[#e6edf7]"
            htmlFor={`${id}-whatsapp`}
          >
            <span
              aria-hidden="true"
              className="mr-1 text-red-600 dark:text-[#fda4af]"
            >
              *
            </span>
            {language === "fr" ? "Numéro WhatsApp" : "WhatsApp number"}
          </label>
          <div className="relative">
            <MessageCircle
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 dark:text-[#8193ad]"
            />
            <input
              ref={whatsappRef}
              id={`${id}-whatsapp`}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              required
              maxLength={40}
              placeholder={
                language === "fr"
                  ? "+ Indicatif et numéro"
                  : "+ Code and number"
              }
              value={value.whatsapp}
              onChange={(event) =>
                onChange({ ...value, whatsapp: event.target.value })
              }
              aria-invalid={whatsappInvalid || undefined}
              aria-describedby={
                whatsappInvalid ? `${id}-whatsapp-error` : undefined
              }
              className={
                fieldClass +
                (whatsappInvalid
                  ? " border-red-500 dark:border-[#fda4af]"
                  : " border-slate-200 dark:border-[#304159]")
              }
            />
          </div>
          {whatsappInvalid && (
            <p
              className="mt-2 text-sm text-red-600 dark:text-[#fda4af]"
              id={`${id}-whatsapp-error`}
              role="alert"
            >
              {language === "fr"
                ? "Saisissez un numéro international valide commençant par +."
                : "Enter a valid international number starting with +."}
            </p>
          )}
        </div>
      </div>

      <div className="checkout-actions flex shrink-0 gap-3 border-t border-slate-100 p-4 dark:border-[#304159] sm:px-6">
        <Button
          className="checkout-back-action h-11 gap-2"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {language === "fr" ? "Précédent" : "Back"}
        </Button>
        <Button
          className="h-11 flex-1 gap-2 bg-blue-600 text-white hover:bg-blue-700"
          type="submit"
        >
          {language === "fr" ? "Suivant" : "Next"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

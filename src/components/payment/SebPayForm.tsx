"use client";

import { useLanguage } from "@/lib/language-context";
import {
  type PaymentInput,
  type PaymentSelection,
  type SebPayCountry,
  type SebPayQuote,
  getSebPayCountries,
  getSebPayQuote,
} from "@/lib/payment-api";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import "./sebpay-form.css";

export function SebPayForm({
  selection,
  initialCountry,
  whatsapp,
  busy,
  onSubmit,
}: {
  selection: PaymentSelection;
  initialCountry?: string;
  whatsapp: string;
  busy: boolean;
  onSubmit: (payment: PaymentInput) => Promise<void>;
}) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const [countries, setCountries] = useState<SebPayCountry[] | null>(null);
  const [country, setCountry] = useState(initialCountry ?? "CM");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState(whatsapp.replace(/\D/g, ""));
  const [otp, setOtp] = useState("");
  const [quote, setQuote] = useState<SebPayQuote | null>(null);
  const [error, setError] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const selected = countries?.find((item) => item.code === country);
  const initializedPhone = useRef(false);
  const submitting = useRef(false);
  const { service, productId, customCoins } = selection;
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision reloads the failed catalogue.
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setCountries(null);
    void getSebPayCountries(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        const internationalPhone = whatsapp.replace(/\D/g, "");
        const inferredCountry = [...items]
          .sort((left, right) => right.prefix.length - left.prefix.length)
          .find((item) => internationalPhone.startsWith(item.prefix));
        const first =
          items.find((item) => item.code === initialCountry) ??
          inferredCountry ??
          items.find((item) => item.code === "CM") ??
          items[0];
        if (!first) throw new Error("No SebPay countries available");
        if (!initializedPhone.current) {
          initializedPhone.current = true;
          setPhone(
            internationalPhone.startsWith(first.prefix)
              ? internationalPhone.slice(first.prefix.length)
              : internationalPhone,
          );
        }
        setCountries(items);
        setCountry(first.code);
        setOperator(first.operators[0]?.code ?? "");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [initialCountry, whatsapp, revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: quoteRevision retries a failed fee quote.
  useEffect(() => {
    if (!operator) return;
    const controller = new AbortController();
    setQuote(null);
    setQuoteError(false);
    setOtp("");
    setCopied(false);
    void getSebPayQuote(
      {
        selection: {
          service,
          productId,
          ...(customCoins === undefined ? {} : { customCoins }),
        },
        country,
        operator,
      },
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setQuote(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setQuoteError(true);
      });
    return () => controller.abort();
  }, [country, operator, service, productId, customCoins, quoteRevision]);
  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !quote || busy || submitting.current) return;
    const normalized = selected.prefix + phone;
    if (
      !/^[1-9][0-9]{7,14}$/.test(normalized) ||
      (quote.otpRequired && !otp.trim())
    ) {
      setValidationError(
        !/^[1-9][0-9]{7,14}$/.test(normalized)
          ? fr
            ? "Saisissez un numéro international valide (8 à 15 chiffres)."
            : "Enter a valid international number (8 to 15 digits)."
          : fr
            ? "Saisissez le code OTP requis."
            : "Enter the required OTP code.",
      );
      return;
    }
    setValidationError(null);
    submitting.current = true;
    try {
      await onSubmit({
        country,
        operator,
        phone: normalized,
        ...(quote.otpRequired ? { otpCode: otp.trim() } : {}),
      });
    } finally {
      submitting.current = false;
    }
  };
  if (!countries)
    return (
      <div className="sebpay-loading" role={error ? "alert" : "status"}>
        {error ? (
          <>
            <p>
              {fr
                ? "Le catalogue SebPay est momentanément indisponible."
                : "The SebPay catalogue is temporarily unavailable."}
            </p>
            <button
              className="checkout-secondary-action sebpay-secondary-action"
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              {fr ? "Réessayer" : "Retry"}
            </button>
          </>
        ) : (
          <>
            <LoaderCircle
              className="sebpay-spinner"
              size={22}
              aria-hidden="true"
            />
            {fr
              ? "Chargement des pays et opérateurs SebPay…"
              : "Loading SebPay countries and operators…"}
          </>
        )}
      </div>
    );
  return (
    <form className="sebpay-form" onSubmit={submitForm}>
      <div className="sebpay-amount">
        <span>{fr ? "Montant à payer" : "Amount to pay"}</span>
        <strong>
          {quote
            ? `${quote.total.toLocaleString(fr ? "fr-FR" : "en-US")} ${quote.currency}`
            : "…"}
        </strong>
      </div>
      <label>
        {fr ? "Numéro Mobile Money" : "Mobile Money number"}
        <span className="sebpay-field">
          <span>+{selected?.prefix}</span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(event) => {
              const value = event.target.value;
              const digits = value.replace(/\D/g, "");
              const international = value.trim().startsWith("+");
              setPhone(
                (international && selected && digits.startsWith(selected.prefix)
                  ? digits.slice(selected.prefix.length)
                  : digits
                ).slice(0, 15),
              );
              setValidationError(null);
            }}
            minLength={6}
            maxLength={15}
            pattern="[0-9]{6,15}"
            autoComplete="tel-national"
            required
            disabled={busy}
          />
        </span>
        <small>
          {fr
            ? "Numéro sans l’indicatif du pays"
            : "Number without the country calling code"}
        </small>
      </label>
      {quote?.otpRequired && (
        <label>
          OTP
          {quote.ussdCode && (
            <span className="sebpay-ussd">
              <span>{fr ? "Composez le code" : "Dial the code"}</span>
              <button
                type="button"
                className="checkout-secondary-action sebpay-secondary-action"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(quote.ussdCode ?? "")
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
              >
                <code>{quote.ussdCode}</code>
                {copied ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                {copied ? (fr ? "Copié !" : "Copied!") : fr ? "Copier" : "Copy"}
              </button>
              <span>
                {fr
                  ? "sur votre téléphone pour recevoir le code OTP."
                  : "on your phone to receive the OTP code."}
              </span>
            </span>
          )}
          <input
            inputMode="numeric"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={64}
            autoComplete="one-time-code"
            required
            disabled={busy}
            placeholder="123456"
          />
        </label>
      )}
      <div className="sebpay-fields-row">
        <label>
          {fr ? "Opérateur" : "Operator"}
          <select
            value={operator}
            disabled={busy}
            onChange={(event) => {
              setQuote(null);
              setOperator(event.target.value);
              setValidationError(null);
            }}
            required
          >
            {selected?.operators.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {fr ? "Pays" : "Country"}
          <select
            value={country}
            disabled={busy}
            onChange={(event) => {
              setQuote(null);
              setValidationError(null);
              const next = countries.find(
                (item) => item.code === event.target.value,
              );
              setCountry(event.target.value);
              setOperator(next?.operators[0]?.code ?? "");
            }}
            required
          >
            {countries.map((item) => (
              <option key={item.code} value={item.code}>
                {new Intl.DisplayNames([language], { type: "region" }).of(
                  item.code,
                ) ?? item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {quoteError && (
        <div role="alert" className="sebpay-error">
          <p>
            {fr
              ? "Le montant n’a pas pu être calculé."
              : "The amount could not be calculated."}
          </p>
          <button
            type="button"
            className="checkout-secondary-action sebpay-secondary-action"
            onClick={() => setQuoteRevision((value) => value + 1)}
          >
            {fr ? "Réessayer" : "Retry"}
          </button>
        </div>
      )}
      {validationError && (
        <p className="sebpay-error" role="alert">
          {validationError}
        </p>
      )}
      <button
        type="submit"
        className="checkout-primary-action sebpay-primary-action"
        disabled={busy || !quote || !operator}
        aria-busy={busy}
      >
        {busy && (
          <LoaderCircle
            size={18}
            className="sebpay-spinner"
            aria-hidden="true"
          />
        )}
        {busy
          ? fr
            ? "Paiement en cours… Consultez votre téléphone."
            : "Payment in progress… Check your phone."
          : fr
            ? "Payer avec SebPay"
            : "Pay with SebPay"}
      </button>
    </form>
  );
}

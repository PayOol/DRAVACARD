"use client";

import { useLanguage } from "@/lib/language-context";

interface CheckoutProviderOptionProps {
  id: string;
  name: string;
  selected: boolean;
  disabled?: boolean;
  recommended?: boolean;
  unavailable?: boolean;
  onSelect: () => void;
  logoSrc: string;
  logoClassName?: string;
}

export function CheckoutProviderOption({
  id,
  name,
  selected,
  disabled = false,
  recommended = false,
  unavailable = false,
  onSelect,
  logoSrc,
  logoClassName,
}: CheckoutProviderOptionProps) {
  const { language } = useLanguage();

  return (
    <button
      type="button"
      className="checkout-provider-option"
      data-provider={id}
      aria-pressed={selected}
      disabled={disabled || unavailable}
      onClick={onSelect}
    >
      <span className="checkout-provider-logo">
        <img
          src={logoSrc}
          alt=""
          width={32}
          height={32}
          className={logoClassName}
        />
      </span>
      <span className="checkout-provider-name">
        <strong>{name}</strong>
        {unavailable && (
          <small>{language === "fr" ? "Indisponible" : "Unavailable"}</small>
        )}
      </span>
      {recommended && (
        <span className="checkout-provider-badge absolute -top-2 right-2">
          {language === "fr" ? "Recommandé" : "Recommended"}
        </span>
      )}
    </button>
  );
}

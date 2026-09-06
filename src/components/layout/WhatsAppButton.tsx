"use client";

import { DRAVA_CONTACT } from "@/lib/drava-contact";
import { useLanguage } from "@/lib/language-context";
import "./whatsapp-button.css";

export default function WhatsAppButton() {
  const { language } = useLanguage();
  const label =
    language === "fr"
      ? "Contacter DRAVA sur WhatsApp (nouvel onglet)"
      : "Contact DRAVA on WhatsApp (new tab)";

  return (
    <a
      className="whatsapp-button"
      href={DRAVA_CONTACT.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <span className="sr-only">{label}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20.52 3.48A11.87 11.87 0 0 0 12.05 0C5.46 0 .1 5.36.1 11.95c0 2.1.55 4.16 1.6 5.97L0 24l6.25-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.2-1.24-6.2-3.49-8.41ZM12.06 21.82a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.9 9.9 0 0 1-1.52-5.25c0-5.48 4.46-9.94 9.94-9.94a9.87 9.87 0 0 1 7.03 2.92 9.88 9.88 0 0 1 2.91 7.04c0 5.48-4.46 9.94-9.99 9.85Zm5.45-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}

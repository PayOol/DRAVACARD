"use client";

import { withBasePath } from "@/lib/base-path";
import { DRAVA_CONTACT } from "@/lib/drava-contact";
import { useLanguage } from "@/lib/language-context";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  const { language } = useLanguage();
  const resources = [
    {
      href: "/carte-virtuelle-cameroun/",
      fr: "Carte virtuelle au Cameroun",
      en: "Virtual cards in Cameroon",
    },
    {
      href: "/carte-visa-virtuelle-cameroun/",
      fr: "Carte Visa virtuelle Cameroun",
      en: "Virtual Visa card Cameroon",
    },
    {
      href: "/carte-mastercard-virtuelle-cameroun/",
      fr: "Carte Mastercard virtuelle Cameroun",
      en: "Virtual Mastercard Cameroon",
    },
    {
      href: "/pieces-tiktok-cameroun/",
      fr: "Pièces TikTok au Cameroun",
      en: "TikTok coins in Cameroon",
    },
  ];

  return (
    <footer className="border-t border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-[#111c2e]">
      <div className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-3 md:px-6">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" aria-label="DRAVA" className="flex items-center">
            <img
              src={withBasePath("/images/drava-wordmark.svg")}
              alt="DRAVA"
              className="desktop-brand-logo drava-wordmark-light h-10 w-auto"
            />
            <img
              src={withBasePath("/images/drava-wordmark-dark.svg")}
              alt="DRAVA"
              className="desktop-brand-logo drava-wordmark-dark h-10 w-auto"
            />
          </Link>
          <p className="text-center text-sm text-gray-600 md:text-left dark:text-slate-300">
            {language === "fr"
              ? "© 2026 DRAVA. Tous droits réservés."
              : "© 2026 DRAVA. All rights reserved."}
          </p>
        </div>

        <nav aria-label={language === "fr" ? "Guides DRAVA" : "DRAVA guides"}>
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            {language === "fr" ? "Guides" : "Guides"}
          </p>
          <ul className="space-y-1.5">
            {resources.map((resource) => (
              <li key={resource.href}>
                <Link
                  href={resource.href}
                  className="text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
                >
                  {resource[language]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-2">
          <a
            href="mailto:contact.drava@gmail.com"
            className="flex items-center text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
          >
            <Mail className="mr-2 h-4 w-4" />
            contact.drava@gmail.com
          </a>
          <a
            href={DRAVA_CONTACT.phoneHref}
            className="flex items-center text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
          >
            <Phone className="mr-2 h-4 w-4" />
            {DRAVA_CONTACT.displayPhone}
          </a>
          <p className="max-w-sm text-xs text-gray-500 dark:text-slate-400">
            {language === "fr"
              ? "Ne transmettez aucune donnée de carte ou de paiement par e-mail ou téléphone."
              : "Do not send card or payment data by email or phone."}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

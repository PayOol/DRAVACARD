"use client";

import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:px-6">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" aria-label="DRAVA">
            <img
              src={withBasePath("/images/drava-logo-transparent.svg")}
              alt="DRAVA Logo"
              className="h-24 w-auto"
            />
          </Link>
          <p className="text-center text-sm text-gray-600 md:text-left">
            {language === "fr"
              ? "© 2026 DRAVA. Tous droits réservés."
              : "© 2026 DRAVA. All rights reserved."}
          </p>
        </div>

        <div className="space-y-2">
          <a
            href="mailto:contact.drava@gmail.com"
            className="flex items-center text-sm text-gray-600 transition-colors hover:text-blue-600"
          >
            <Mail className="mr-2 h-4 w-4" />
            contact.drava@gmail.com
          </a>
          <a
            href="tel:+237696161186"
            className="flex items-center text-sm text-gray-600 transition-colors hover:text-blue-600"
          >
            <Phone className="mr-2 h-4 w-4" />
            +237 696 16 11 86
          </a>
          <p className="max-w-sm text-xs text-gray-500">
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

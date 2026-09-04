"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type PaymentResultStatus = "success" | "failure";

interface PaymentResultProps {
  status: PaymentResultStatus;
}

const content = {
  success: {
    title: {
      fr: "Retour de paiement reçu",
      en: "Payment return received",
    },
    description: {
      fr: "Le parcours LeekPay a renvoyé vers DRAVA. La commande doit être vérifiée avant toute émission ou livraison de carte.",
      en: "The LeekPay flow returned to DRAVA. The order must be verified before any card is issued or delivered.",
    },
    notice: {
      fr: "Cette page est uniquement un écran de retour. Elle ne constitue pas une validation définitive de la commande.",
      en: "This page is only a return screen. It is not final validation of the order.",
    },
  },
  failure: {
    title: {
      fr: "Paiement non finalisé",
      en: "Payment not completed",
    },
    description: {
      fr: "Le paiement a été annulé ou n’a pas pu aboutir. Aucun achat n’est considéré comme confirmé.",
      en: "The payment was cancelled or could not be completed. No purchase is considered confirmed.",
    },
    notice: {
      fr: "Vous pouvez retourner au catalogue et réessayer lorsque vous le souhaitez.",
      en: "You can return to the catalogue and try again whenever you wish.",
    },
  },
} as const;

export default function PaymentResult({ status }: PaymentResultProps) {
  const { language } = useLanguage();
  const isSuccess = status === "success";
  const copy = content[status];
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;

  return (
    <MainLayout>
      <section className="flex min-h-[65vh] items-center bg-gradient-to-b from-slate-50 to-white px-4 py-12 md:py-20">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg md:p-10">
            <div
              className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
                isSuccess
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <Icon aria-hidden="true" className="h-9 w-9" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {copy.title[language]}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600 md:text-lg">
              {copy.description[language]}
            </p>

            <div
              aria-live="polite"
              className={`mx-auto mt-6 max-w-xl rounded-xl border p-4 text-left text-sm leading-6 ${
                isSuccess
                  ? "border-blue-200 bg-blue-50 text-blue-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {copy.notice[language]}
            </div>

            <Button asChild className="mt-8 bg-blue-600 hover:bg-blue-700">
              <Link href="/">
                {language === "fr"
                  ? "Retour au catalogue"
                  : "Back to catalogue"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

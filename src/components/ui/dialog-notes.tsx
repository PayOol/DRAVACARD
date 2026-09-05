"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { X } from "lucide-react";

interface UsageNotesProps {
  onClose: () => void;
  onAccept: () => void;
}

export function UsageNotes({ onClose, onAccept }: UsageNotesProps) {
  const { language } = useLanguage();

  return (
    <>
      <div className="checkout-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="checkout-notes-summary mb-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-bold text-blue-800">
            {language === "fr" ? "CARTES VIRTUELLES" : "VIRTUAL CARDS"}
          </h3>
          <p className="text-sm text-blue-700">
            {language === "fr"
              ? "Nous émettons des cartes virtuelles Mastercard et Visa (USD) qui fonctionnent sur toutes les plateformes à l’exception des plateformes de paris sportifs, de crypto monnaie, Wise et des films pour adulte."
              : "We issue Mastercard and Visa virtual cards (USD) that work on all platforms except sports betting platforms, cryptocurrency, Wise, and adult content sites."}
          </p>
        </div>

        <div className="checkout-limits mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <h4 className="mb-1 text-sm text-gray-500">
              {language === "fr" ? "Période de validité" : "Validity Period"}
            </h4>
            <p className="font-medium">
              {language === "fr" ? "3 ans" : "3 years"}
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-sm text-gray-500">
              {language === "fr"
                ? "Limite par transaction"
                : "Transaction Limit"}
            </h4>
            <p className="font-medium">10 000 $</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm text-gray-500">
              {language === "fr" ? "Limite du solde" : "Balance Limit"}
            </h4>
            <p className="font-medium">100 000 $</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm text-gray-500">
              {language === "fr" ? "Frais d’échec" : "Failure Fee"}
            </h4>
            <p className="font-medium">
              {language === "fr"
                ? "0.3 $ par transaction"
                : "$0.3 per transaction"}
            </p>
          </div>
        </div>

        <div className="checkout-notes-warnings mb-6 space-y-3">
          <div className="flex items-start space-x-2 text-red-600">
            <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              {language === "fr"
                ? "Les cartes sont résiliées après 3 à 5 refus successifs"
                : "Cards are terminated after 3 to 5 consecutive rejections"}
            </p>
          </div>
          <div className="flex items-start space-x-2 text-red-600">
            <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              {language === "fr"
                ? "Les cartes sont résiliées si elles ne sont pas rechargées 3 semaines après leur achat"
                : "Cards are terminated if they are not recharged 3 weeks after purchase"}
            </p>
          </div>
        </div>
      </div>

      <div className="checkout-actions checkout-notes-actions flex shrink-0 flex-col space-y-2 border-t bg-white p-3 sm:flex-row sm:space-x-4 sm:space-y-0 sm:p-4">
        <div className="flex-1">
          <Button
            className="checkout-primary-action w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={onAccept}
            type="button"
          >
            {language === "fr"
              ? "Accepter et continuer"
              : "Accept and continue"}
          </Button>
        </div>
        <div className="flex-1">
          <Button
            className="checkout-decline-action w-full"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            {language === "fr" ? "Refuser" : "Decline"}
          </Button>
        </div>
      </div>
    </>
  );
}

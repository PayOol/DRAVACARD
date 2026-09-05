"use client";

import { CatalogCardTransition } from "@/components/catalog/MobileTransitions";
import CatalogSectionPanel from "@/components/catalog/CatalogSectionPanel";
import CatalogTabs from "@/components/catalog/CatalogTabs";
import TikTokPanel from "@/components/catalog/TikTokPanel";
import RecommendedBadge from "@/components/catalog/RecommendedBadge";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { type CatalogCard, cards } from "@/lib/catalog";
import type { CatalogSection } from "@/lib/catalog-section";
import { useLanguage } from "@/lib/language-context";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Clock, CreditCard, Shield, X, Zap } from "lucide-react";

export default function DesktopCatalog({
  onSelect,
  section,
  onSectionChange,
}: {
  onSelect: (card: CatalogCard) => void;
  section: CatalogSection;
  onSectionChange: (section: CatalogSection) => void;
}) {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion() === true;
  const handleBuyClick = onSelect;
  const getCardGradient = (color: string) => {
    switch (color) {
      case "blue":
        return "from-blue-600 to-blue-800";
      case "teal":
        return "from-teal-600 to-teal-800";
      case "emerald":
        return "from-emerald-600 to-emerald-800";
      case "gray":
        return "from-gray-700 to-gray-900";
      default:
        return "from-blue-600 to-blue-800";
    }
  };

  const getCardIcon = (icon: CatalogCard["icon"]) => {
    return icon === "visa"
      ? withBasePath("/images/visa.svg")
      : withBasePath("/images/mastercard.svg");
  };

  const renderDesktopCard = (card: CatalogCard) => (
    <CatalogCardTransition
      className="group relative"
      key={card.id}
      reducedMotion={reducedMotion}
    >
      {card.recommended && <RecommendedBadge />}

      <div
        className={`relative h-full overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 ${card.recommended ? "bg-blue-50/50 dark:bg-[#16253b] shadow-xl shadow-blue-600/20 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0b1220] group-hover:shadow-2xl group-hover:shadow-blue-600/25" : "bg-white dark:bg-[#111c2e] shadow-lg group-hover:shadow-xl"}`}
      >
        <div
          className={`relative overflow-hidden bg-gradient-to-r ${getCardGradient(card.color)} p-6 text-white`}
        >
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-10 h-32 w-32 rounded-full bg-white/5" />

          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold">{card.name[language]}</h2>
            <img
              alt={card.icon === "visa" ? "Visa" : "Mastercard"}
              className="h-8 w-auto"
              src={getCardIcon(card.icon)}
            />
          </div>

          <p className="mb-3 line-clamp-2 text-sm opacity-80">
            {card.description[language]}
          </p>

          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold">
              {Number.parseInt(card.price, 10).toLocaleString(
                language === "fr" ? "fr-FR" : "en-US",
              )}{" "}
              <span className="text-lg font-normal opacity-80">
                {card.currency}
              </span>
            </div>

            <div className="flex items-center rounded-full bg-white/20 px-3 py-1 text-xs">
              <Clock className="mr-1 h-3.5 w-3.5" />
              <span>
                {language === "fr" ? "Validité: 3 ans" : "Validity: 3 years"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-6">
          <div className="mb-4 flex items-center border-b border-gray-100 pb-2 dark:border-slate-700">
            <Shield className="mr-2 h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              {language === "fr" ? "Caractéristiques" : "Features"}
            </span>
          </div>

          <div className="mb-6 space-y-1.5">
            {card.features[language].map((feature, featureIndex) => (
              <div
                className="flex items-start"
                key={`feature-${card.id}-${featureIndex}`}
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="ml-2 text-sm text-gray-600 dark:text-slate-300">
                  {feature}
                </span>
              </div>
            ))}

            {card.negativeFeatures?.[language].map((feature, featureIndex) => (
              <div
                className="flex items-start"
                key={`neg-feature-${card.id}-${featureIndex}`}
              >
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <Button
            className={`mt-auto flex w-full items-center justify-center rounded-xl bg-gradient-to-r ${getCardGradient(card.color)} py-3 text-white shadow-md transition-all duration-300 hover:shadow-lg group-hover:translate-y-[-2px]`}
            onClick={() => handleBuyClick(card)}
            data-catalog-purchase={card.id}
          >
            <Zap className="mr-2 h-4 w-4" />
            {language === "fr" ? "Acheter maintenant" : "Buy now"}
          </Button>
        </div>
      </div>
    </CatalogCardTransition>
  );

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white pb-12 pt-4 md:pb-20 md:pt-6 dark:from-[#0b1220] dark:to-[#0b1220]">
      <div className="container mx-auto px-4">
        <CatalogTabs
          section={section}
          onSectionChange={onSectionChange}
          idPrefix="desktop"
        />
        <div className="catalog-section-stack">
          <AnimatePresence initial={false} mode="sync">
            <CatalogSectionPanel
              key={section}
              section={section}
              reducedMotion={reducedMotion}
            >
              {section === "tiktok" ? (
                <TikTokPanel />
              ) : (
                <>
                  <div className="mx-auto mb-16 max-w-7xl text-center">
                    <h1 className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-4xl font-bold text-transparent md:text-5xl dark:from-blue-300 dark:to-indigo-300">
                      {language === "fr"
                        ? "Cartes virtuelles DRAVA"
                        : "DRAVA Virtual Cards"}
                    </h1>
                    <div
                      data-catalog-intro-row
                      className="grid grid-cols-2 items-center gap-6 text-left lg:gap-12"
                    >
                      <p className="min-w-0 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-200">
                        {language === "fr"
                          ? "Choisissez la carte qui correspond à vos besoins et commencez à effectuer des paiements en ligne en toute sécurité."
                          : "Choose the card that matches your needs and start making secure online payments."}
                      </p>
                      <div className="min-w-0 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
                        <p className="text-sm text-red-600 dark:text-red-300">
                          <strong>
                            {language === "fr"
                              ? "Note importante:"
                              : "Important note:"}
                          </strong>{" "}
                          {language === "fr"
                            ? "Les cartes ne sont pas acceptées sur les sites de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise, et les sites pour adultes."
                            : "Cards are not accepted on cryptocurrency sites, sports betting platforms like Bet9ja, Wise, and adult sites."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
                    <AnimatePresence initial={false} mode="popLayout">
                      {cards.map(renderDesktopCard)}
                    </AnimatePresence>
                  </div>
                  <div className="mt-16 text-center">
                    <div className="mx-auto max-w-3xl">
                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-[#111c2e]">
                        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 dark:text-slate-300">
                          <div className="flex items-center">
                            <Shield className="mr-2 h-5 w-5 text-green-500" />
                            <span>
                              {language === "fr"
                                ? "Paiement sécurisé"
                                : "Secure payment"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-5 w-5 text-green-500" />
                            <span>
                              {language === "fr"
                                ? "Livraison instantanée"
                                : "Instant delivery"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <CreditCard className="mr-2 h-5 w-5 text-green-500" />
                            <span>
                              {language === "fr"
                                ? "Support 24/7"
                                : "24/7 Support"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CatalogSectionPanel>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { DialogNotes } from "@/components/ui/dialog-notes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withBasePath } from "@/lib/base-path";
import {
  type CardOfferId,
  PAYMENT_LINKS,
  validateHostedPaymentLink,
} from "@/lib/card-catalog";
import { useLanguage } from "@/lib/language-context";
import {
  BadgeCheck,
  Check,
  Clock,
  CreditCard,
  Shield,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Card {
  id: CardOfferId;
  name: {
    fr: string;
    en: string;
  };
  price: string;
  currency: string;
  icon: string;
  color: string;
  popular?: boolean;
  position?: number;
  features: {
    fr: string[];
    en: string[];
  };
  negativeFeatures?: {
    fr: string[];
    en: string[];
  };
  description: {
    fr: string;
    en: string;
  };
  paymentLink: string | null;
}

export default function CardsPage() {
  const { language } = useLanguage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const cards: Card[] = [
    {
      id: "visa-basic",
      name: {
        fr: "VISA BASIQUE",
        en: "BASIC VISA",
      },
      price: "5000",
      currency: "XAF",
      icon: "visa",
      color: "blue",
      position: 1,
      description: {
        fr: "Parfait pour commencer - Carte virtuelle prépayée sans frais mensuels",
        en: "Perfect to start - Prepaid virtual card with no monthly fees",
      },
      features: {
        fr: [
          "Carte prépayée",
          "3D Secure",
          "Sans vérification KYC",
          "Sans frais mensuels",
          "3 années de validité",
          "Idéal pour les achats en ligne",
        ],
        en: [
          "Prepaid card",
          "3D Secure",
          "No KYC verification",
          "No monthly fees",
          "3 years validity",
          "Ideal for online purchases",
        ],
      },
      paymentLink: PAYMENT_LINKS["visa-basic"],
    },
    {
      id: "mastercard-basic",
      name: {
        fr: "MASTERCARD BASIQUE",
        en: "BASIC MASTERCARD",
      },
      price: "6000",
      currency: "XAF",
      icon: "mastercard",
      color: "teal",
      popular: true,
      position: 2,
      description: {
        fr: "Notre option la plus populaire - Offre le meilleur rapport qualité/prix",
        en: "Our most popular option - Offers the best value for money",
      },
      features: {
        fr: [
          "Carte prépayée",
          "3D Secure",
          "Sans vérification KYC",
          "Sans frais mensuels",
          "3 années de validité",
          "Acceptée partout",
        ],
        en: [
          "Prepaid card",
          "3D Secure",
          "No KYC verification",
          "No monthly fees",
          "3 years validity",
          "Accepted everywhere",
        ],
      },
      paymentLink: PAYMENT_LINKS["mastercard-basic"],
    },
    {
      id: "mastercard-premium",
      name: {
        fr: "MASTERCARD PREMIUM",
        en: "PREMIUM MASTERCARD",
      },
      price: "8500",
      currency: "XAF",
      icon: "mastercard",
      color: "emerald",
      position: 3,
      description: {
        fr: "Fonctionnalités avancées - Idéal pour des achats plus importants",
        en: "Advanced features - Ideal for larger purchases",
      },
      features: {
        fr: [
          "Carte de débit",
          "3D Secure",
          "Achats sur Amazon",
          "Achats sur Alibaba",
          "Retraits possibles (Cameroun uniquement)",
          "Compatible PayPal",
        ],
        en: [
          "Debit card",
          "3D Secure",
          "Amazon purchases",
          "Alibaba purchases",
          "Withdrawals possible (Cameroon only)",
          "PayPal compatible",
        ],
      },
      negativeFeatures: {
        fr: ["Ne prend pas en charge les retraits PayPal"],
        en: ["Does not support PayPal withdrawals"],
      },
      paymentLink: PAYMENT_LINKS["mastercard-premium"],
    },
    {
      id: "mastercard-platinum",
      name: {
        fr: "MASTERCARD PLATINIUM",
        en: "PLATINUM MASTERCARD",
      },
      price: "15000",
      currency: "XAF",
      icon: "mastercard",
      color: "gray",
      position: 4,
      description: {
        fr: "Expérience premium - Sans limite avec des avantages exclusifs",
        en: "Premium experience - No limits with exclusive benefits",
      },
      features: {
        fr: [
          "Carte de débit",
          "3D Secure",
          "Aucun plafond sur les recharges",
          "Compatible Google Pay",
          "Compatible Apple Pay",
          "🎁 Bonus de $5 offert",
        ],
        en: [
          "Debit card",
          "3D Secure",
          "No ceiling on reloads",
          "Google Pay compatible",
          "Apple Pay compatible",
          "🎁 $5 bonus offered",
        ],
      },
      paymentLink: PAYMENT_LINKS["mastercard-platinum"],
    },
  ];

  const filteredCards =
    activeTab === "all"
      ? cards
      : cards.filter((card) => card.icon === activeTab);

  const handleBuyClick = (card: Card) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleAccept = (cardDetails: { paymentLink: string | null }) => {
    if (isProcessing) return;

    const paymentLink = validateHostedPaymentLink(cardDetails.paymentLink);
    if (!paymentLink) return;

    setIsProcessing(true);
    setDialogOpen(false);
    window.location.assign(paymentLink);
  };

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

  const getPopularBadgeColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100 text-blue-800";
      case "teal":
        return "bg-teal-100 text-teal-800";
      case "emerald":
        return "bg-emerald-100 text-emerald-800";
      case "gray":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getCardIcon = (icon: string) => {
    switch (icon) {
      case "visa":
        return withBasePath("/images/visa.svg");
      case "mastercard":
        return withBasePath("/images/mastercard.svg");
      default:
        return withBasePath("/images/card-generic.svg");
    }
  };

  const renderMobileCard = (card: Card) => (
    <div
      className="relative mb-4 overflow-hidden rounded-lg border border-gray-100 shadow-md"
      key={card.id}
    >
      {card.popular && (
        <div className="absolute right-0 top-0 z-10">
          <span
            className={`${getPopularBadgeColor(card.color)} rounded-bl-lg px-3 py-0.5 text-xs font-semibold`}
          >
            {language === "fr" ? "Plus populaire" : "Most popular"}
          </span>
        </div>
      )}

      <div
        className={`bg-gradient-to-r ${getCardGradient(card.color)} p-4 text-white`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <h2 className="text-lg font-bold">{card.name[language]}</h2>
              <img
                alt={card.icon === "visa" ? "Visa" : "Mastercard"}
                className="ml-2 h-8 w-auto"
                src={getCardIcon(card.icon)}
              />
            </div>
            <div className="mt-1 text-xl font-bold">
              {Number.parseInt(card.price, 10).toLocaleString(
                language === "fr" ? "fr-FR" : "en-US",
              )}
              <span className="ml-1 text-sm font-normal opacity-80">
                {card.currency}
              </span>
            </div>
          </div>
          <div className="flex items-center rounded-full bg-white/20 px-2 py-1 text-xs">
            <Clock className="mr-1 h-3 w-3" />
            <span>{language === "fr" ? "3 ans" : "3 years"}</span>
          </div>
        </div>
        <p className="mb-0 mt-2 text-xs opacity-90">
          {card.description[language]}
        </p>
      </div>

      <div className="bg-white p-3">
        <div className="mb-2 space-y-1">
          {card.features[language].map((feature, featureIndex) => (
            <div
              className="flex items-start"
              key={`feature-${card.id}-${featureIndex}`}
            >
              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
              <span className="ml-1.5 text-xs text-gray-600">{feature}</span>
            </div>
          ))}

          {card.negativeFeatures?.[language].map((feature, featureIndex) => (
            <div
              className="flex items-start"
              key={`neg-feature-${card.id}-${featureIndex}`}
            >
              <X className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
              <span className="ml-1.5 text-xs text-gray-500">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-2 pt-0">
        <Button
          className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-r ${getCardGradient(card.color)} py-2 text-white`}
          disabled={isProcessing}
          onClick={() => handleBuyClick(card)}
        >
          <Zap className="mr-2 h-4 w-4" />
          {isProcessing
            ? language === "fr"
              ? "Traitement..."
              : "Processing..."
            : language === "fr"
              ? "Acheter"
              : "Buy"}
        </Button>
      </div>
    </div>
  );

  const renderDesktopCard = (card: Card) => (
    <div className="group relative" key={card.id}>
      {card.popular && (
        <div className="absolute -top-4 right-8 z-10">
          <span
            className={`${getPopularBadgeColor(card.color)} flex items-center rounded-full px-4 py-1 text-xs font-semibold shadow-md`}
          >
            <BadgeCheck className="mr-1 h-3.5 w-3.5" />
            {language === "fr" ? "Plus populaire" : "Most popular"}
          </span>
        </div>
      )}

      <div
        className={`relative h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 group-hover:shadow-xl ${card.popular ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
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
          <div className="mb-4 flex items-center border-b border-gray-100 pb-2">
            <Shield className="mr-2 h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
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
                <span className="ml-2 text-sm text-gray-600">{feature}</span>
              </div>
            ))}

            {card.negativeFeatures?.[language].map((feature, featureIndex) => (
              <div
                className="flex items-start"
                key={`neg-feature-${card.id}-${featureIndex}`}
              >
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="ml-2 text-sm text-gray-500">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            className={`mt-auto flex w-full items-center justify-center rounded-xl bg-gradient-to-r ${getCardGradient(card.color)} py-3 text-white shadow-md transition-all duration-300 hover:shadow-lg group-hover:translate-y-[-2px]`}
            disabled={isProcessing}
            onClick={() => handleBuyClick(card)}
          >
            <Zap className="mr-2 h-4 w-4" />
            {isProcessing
              ? language === "fr"
                ? "Traitement..."
                : "Processing..."
              : language === "fr"
                ? "Acheter maintenant"
                : "Buy now"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <section
        className={`bg-gradient-to-b from-slate-50 to-white pb-12 pt-20 md:pb-20 md:pt-28 ${isMobile ? "min-h-screen" : ""}`}
      >
        <div className="container mx-auto px-4">
          <div
            className={`mx-auto text-center ${isMobile ? "mb-6" : "mb-16 max-w-4xl"}`}
          >
            <h1 className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {language === "fr"
                ? "Cartes virtuelles DRAVA"
                : "DRAVA Virtual Cards"}
            </h1>
            <p className="mb-8 text-xl text-gray-600">
              {language === "fr"
                ? "Choisissez la carte qui correspond à vos besoins et commencez à effectuer des paiements en ligne en toute sécurité."
                : "Choose the card that matches your needs and start making secure online payments."}
            </p>

            <Tabs
              className="mx-auto w-full max-w-md"
              defaultValue="all"
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="mb-4 grid w-full grid-cols-3">
                <TabsTrigger className="rounded-lg text-sm" value="all">
                  {language === "fr" ? "Toutes" : "All"}
                </TabsTrigger>
                <TabsTrigger className="rounded-lg text-sm" value="visa">
                  Visa
                </TabsTrigger>
                <TabsTrigger className="rounded-lg text-sm" value="mastercard">
                  Mastercard
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isMobile ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-2 text-left">
                <p className="text-xs text-red-600">
                  <strong>Note:</strong>
                  {language === "fr"
                    ? "Cartes non acceptées pour cryptomonnaies, paris sportifs, Wise, et sites adultes."
                    : "Cards not accepted for cryptocurrencies, sports betting, Wise, and adult sites."}
                </p>
              </div>
            ) : (
              <div className="mx-auto mb-8 mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  <strong>
                    {language === "fr" ? "Note importante:" : "Important note:"}
                  </strong>
                  {language === "fr"
                    ? "Les cartes ne sont pas acceptées sur les sites de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise, et les sites pour adultes."
                    : "Cards are not accepted on cryptocurrency sites, sports betting platforms like Bet9ja, Wise, and adult sites."}
                </p>
              </div>
            )}
          </div>

          {isMobile ? (
            <div className="space-y-0">
              {filteredCards.map((card) => renderMobileCard(card))}
            </div>
          ) : (
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
              {filteredCards.map((card) => renderDesktopCard(card))}
            </div>
          )}

          {!isMobile && (
            <div className="mt-16 text-center">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
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
                        {language === "fr" ? "Support 24/7" : "24/7 Support"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedCard && (
        <DialogNotes
          cardDetails={selectedCard}
          isOpen={dialogOpen}
          onAccept={handleAccept}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </MainLayout>
  );
}

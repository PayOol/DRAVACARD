"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { ChevronRight, CreditCard, Globe, Shield } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const toFlagEmoji = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (character) =>
      String.fromCodePoint(character.charCodeAt(0) + 127397),
    );

const HeroSection = () => {
  const router = useRouter();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { t, language } = useLanguage();

  // Fonction pour consulter l'état des services
  const handleViewServiceStatus = () => {
    router.push("/cards");
  };

  // Fonction pour afficher la boîte de dialogue "Comment ça marche"
  const handleShowHowItWorks = () => {
    setShowHowItWorks(true);
  };

  return (
    <section className="pt-28 pb-16 md:pt-32 md:pb-24 overflow-hidden relative bg-gradient-to-b from-white to-blue-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[80%] rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute top-[60%] -left-[5%] w-[40%] h-[50%] rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Hero content */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 mb-6">
              <span>
                {language === "fr"
                  ? "Site public d'information DRAVA"
                  : "DRAVA public information website"}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              {language === "fr" ? (
                <>
                  <span className="text-blue-700">DRAVA</span>{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
                    - Informations sur les cartes virtuelles
                  </span>
                </>
              ) : (
                <>
                  <span className="text-blue-700">DRAVA</span>{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
                    - Virtual card information
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8">
              {language === "fr"
                ? "Les services de carte, paiement, recharge et retrait sont temporairement indisponibles. Le site reste accessible à titre informatif et ne collecte aucune donnée financière."
                : "Card, payment, top-up, and withdrawal services are temporarily unavailable. The website remains available for information and collects no financial data."}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 font-medium w-full sm:w-auto transform transition-transform duration-300 hover:scale-105"
                onClick={handleViewServiceStatus}
              >
                {language === "fr"
                  ? "Voir l'état des services"
                  : "View service status"}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-50 transition-all duration-300"
                onClick={handleShowHowItWorks}
              >
                {t("navigation.howItWorks")}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === "fr"
                    ? "Présentation informative"
                    : "Informational overview"}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === "fr"
                    ? "Aucune donnée financière"
                    : "No financial data"}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <Globe className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === "fr"
                    ? "Français et anglais"
                    : "French and English"}
                </span>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="relative z-10 mx-auto max-w-md lg:max-w-none">
              {/* Main card image with shadow and glow */}
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl shadow-blue-200 ring-1 ring-gray-200 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-300 group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-800/30 mix-blend-multiply opacity-0 transition-opacity duration-500 group-hover:opacity-20" />

                {/* Card with holographic effect */}
                <div className="aspect-[4/3] w-full bg-gradient-to-r from-blue-500 to-indigo-700 p-8 text-white relative overflow-hidden">
                  {/* Holographic shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -translate-x-full group-hover:translate-x-full" />

                  <div className="flex justify-between">
                    <div className="text-xs font-light">
                      {language === "fr"
                        ? "Illustration de carte"
                        : "Card illustration"}
                    </div>
                    <div className="flex gap-1">
                      <div className="h-5 w-5 rounded-full bg-yellow-400 opacity-70" />
                      <div className="h-5 w-5 rounded-full bg-red-400 opacity-70" />
                    </div>
                  </div>

                  <div className="mt-6 font-light">
                    <div className="text-xl flex items-center">
                      <span>DRA</span>
                      <span className="font-bold">VA</span>
                      <Image
                        src={withBasePath("/images/drava-icon-192.svg")}
                        alt="DRAVA"
                        width={24}
                        height={24}
                        className="ml-2 opacity-80"
                      />
                    </div>
                    <div className="mt-10 text-lg tracking-widest">
                      •••• •••• •••• ••••
                    </div>
                    <div className="mt-4 flex justify-between">
                      <div>
                        <div className="text-xs">
                          {language === "fr" ? "TITULAIRE" : "CARDHOLDER"}
                        </div>
                        <div>{language === "fr" ? "EXEMPLE" : "SAMPLE"}</div>
                      </div>
                      <div>
                        <div className="text-xs">
                          {language === "fr" ? "EXPIRE LE" : "EXPIRES ON"}
                        </div>
                        <div>{language === "fr" ? "MM/AA" : "MM/YY"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards in the background */}
              <div className="absolute top-1/4 -left-12 w-24 h-36 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg transform -rotate-12 hidden lg:block" />
              <div className="absolute bottom-1/4 -right-12 w-32 h-20 rounded-lg bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-lg transform rotate-12 hidden lg:block" />

              {/* Currency circle badges */}
              <div className="absolute top-10 right-20 h-16 w-16 rounded-full bg-yellow-400 bg-opacity-90 shadow-lg flex items-center justify-center transform -rotate-12 hidden lg:flex">
                <span className="font-bold text-white">€</span>
              </div>
              <div className="absolute -bottom-4 left-20 h-12 w-12 rounded-full bg-blue-500 bg-opacity-90 shadow-lg flex items-center justify-center hidden lg:flex">
                <span className="font-bold text-white">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Country flags - showing support for various countries */}
        <div className="mt-16 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            {language === "fr"
              ? "Une présentation pensée pour plusieurs pays africains"
              : "An overview designed for several African countries"}
          </h3>

          <div className="flex overflow-x-auto pb-4 scrollbar-hide max-w-full">
            <div className="flex gap-4 md:gap-6 mx-auto">
              {[
                "BJ",
                "CI",
                "CM",
                "SN",
                "ML",
                "TG",
                "CD",
                "CG",
                "RW",
                "KE",
                "ZM",
                "BF",
                "TZ",
              ].map((country) => (
                <div
                  key={country}
                  className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 border border-gray-100"
                >
                  <div className="mb-1">
                    <span
                      role="img"
                      aria-label={country}
                      className="text-3xl leading-none"
                    >
                      {toFlagEmoji(country)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {country}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              {language === "fr"
                ? "Ces pays illustrent la portée informative du projet et ne constituent pas une liste de disponibilité commerciale."
                : "These countries illustrate the project's informational scope and are not a list of commercial availability."}
            </p>
          </div>
        </div>
      </div>

      {/* Dialog pour "Comment ça marche" */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="sm:max-w-lg w-[95%] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
              {t("home.howItWorks.title")}
            </DialogTitle>
            <DialogDescription className="text-base sm:text-lg text-gray-600 mt-2">
              {language === "fr"
                ? "Le parcours transactionnel reste suspendu pendant sa sécurisation. Voici ce que vous pouvez consulter aujourd'hui."
                : "The transactional flow remains paused while it is secured. Here is what you can review today."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                  {language === "fr"
                    ? "Consultez la présentation"
                    : "Review the overview"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {language === "fr"
                    ? "Découvrez le projet et les catégories présentées, sans engagement ni commande active."
                    : "Learn about the project and the displayed categories, with no commitment or active ordering."}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                  {language === "fr"
                    ? "Services temporairement suspendus"
                    : "Services temporarily paused"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {language === "fr"
                    ? "Le site ne permet actuellement aucun paiement, achat, recharge ou retrait."
                    : "The website currently allows no payment, purchase, top-up, or withdrawal."}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                  {language === "fr"
                    ? "Attendez un parcours vérifié"
                    : "Wait for a verified flow"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {language === "fr"
                    ? "Une éventuelle réouverture sera annoncée sur ce site et reposera sur une infrastructure serveur sécurisée. Aucun détail de carte ne sera envoyé par e-mail."
                    : "Any future reopening will be announced on this website and will rely on secure server infrastructure. No card details will be sent by email."}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                  {language === "fr"
                    ? "Protégez vos données"
                    : "Protect your data"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {language === "fr"
                    ? "Ne transmettez jamais un PAN, un CVV, un code à usage unique, un mot de passe ou un secret par e-mail ou messagerie."
                    : "Never send a PAN, CVV, one-time code, password, or secret by email or messaging."}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                onClick={handleViewServiceStatus}
              >
                {language === "fr"
                  ? "Consulter l'état des services"
                  : "Check service status"}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;

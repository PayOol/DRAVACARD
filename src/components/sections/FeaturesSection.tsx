"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import {
  CreditCard,
  Globe,
  Shield,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";

const FeaturesSection = () => {
  const { language } = useLanguage();

  const features = [
    {
      title: {
        fr: "Informations publiques",
        en: "Public information",
      },
      description: {
        fr: "Consultez une présentation du projet sans compte, commande ni saisie de données financières.",
        en: "Review a project overview without an account, order, or financial-data entry.",
      },
      icon: CreditCard,
    },
    {
      title: {
        fr: "Préférence de langue",
        en: "Language preference",
      },
      description: {
        fr: "Choisissez le français ou l'anglais; seul ce choix est conservé localement par l'application.",
        en: "Choose French or English; this choice is the only application setting stored locally.",
      },
      icon: Smartphone,
    },
    {
      title: {
        fr: "Consultation multi-appareil",
        en: "Multi-device browsing",
      },
      description: {
        fr: "Le contenu statique est conçu pour être consulté sur mobile et ordinateur.",
        en: "The static content is designed for viewing on mobile and desktop devices.",
      },
      icon: Globe,
    },
    {
      title: {
        fr: "Fonctions sensibles suspendues",
        en: "Sensitive features paused",
      },
      description: {
        fr: "Les paiements, cartes, recharges, soldes et retraits restent indisponibles jusqu'à une réouverture sécurisée.",
        en: "Payments, cards, top-ups, balances, and withdrawals remain unavailable until a secure reopening.",
      },
      icon: Shield,
    },
    {
      title: {
        fr: "Actifs publics mis en cache",
        en: "Cached public assets",
      },
      description: {
        fr: "Le service worker peut conserver des fichiers publics versionnés pour accélérer l'affichage.",
        en: "The service worker may retain versioned public files to improve display speed.",
      },
      icon: Zap,
    },
    {
      title: {
        fr: "Candidatures suspendues",
        en: "Applications paused",
      },
      description: {
        fr: "Le site ne collecte actuellement aucune candidature revendeur ni donnée personnelle associée.",
        en: "The website currently collects no reseller applications or associated personal data.",
      },
      icon: Users,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            {language === "fr"
              ? "Fonctions de la version publique"
              : "Public-version features"}
          </h2>
          <p className="text-lg text-gray-600 text-center">
            {language === "fr"
              ? "Ce que propose la version publique actuelle"
              : "What the current public version provides"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title.en}
              className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {feature.title[language]}
                </h3>
                <p className="text-gray-600">{feature.description[language]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

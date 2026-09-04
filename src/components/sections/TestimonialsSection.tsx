"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";

const TestimonialsSection = () => {
  const { language } = useLanguage();

  const notices = [
    {
      title: {
        fr: "Aucune transaction",
        en: "No transactions",
      },
      content: {
        fr: "Le site public n'exécute aucun paiement, achat de carte, rechargement, consultation de solde ou retrait.",
        en: "The public website performs no payment, card purchase, top-up, balance lookup, or withdrawal.",
      },
    },
    {
      title: {
        fr: "Aucune collecte financière",
        en: "No financial-data collection",
      },
      content: {
        fr: "Aucun formulaire actif ne demande de numéro de carte, CVV, identifiant de paiement ou code de retrait.",
        en: "No active form requests a card number, CVV, payment credential, or withdrawal code.",
      },
    },
    {
      title: {
        fr: "Aucun envoi par e-mail",
        en: "No delivery by email",
      },
      content: {
        fr: "DRAVA n'envoie aucune donnée de carte depuis ce site. Les liens de contact ouvrent des services externes.",
        en: "DRAVA sends no card data from this website. Contact links open external services.",
      },
    },
    {
      title: {
        fr: "Réouverture contrôlée",
        en: "Controlled reopening",
      },
      content: {
        fr: "Toute réouverture transactionnelle devra reposer sur une infrastructure serveur sécurisée et sera annoncée sur le site.",
        en: "Any transactional reopening must rely on secure server infrastructure and will be announced on the website.",
      },
    },
  ];

  return (
    <section className="bg-blue-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {language === "fr"
              ? "Repères de sécurité de la version publique"
              : "Public-version safety notices"}
          </h2>
          <p className="text-lg text-gray-600">
            {language === "fr"
              ? "Voici les limites factuelles et les engagements de prudence du service actuel."
              : "These are the factual limits and safety commitments of the current service."}
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {notices.map((notice) => (
            <Card
              key={notice.title.en}
              className="h-full border border-blue-100"
            >
              <CardContent className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-blue-800">
                  {notice.title[language]}
                </h3>
                <p className="text-gray-700">{notice.content[language]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center font-medium text-gray-700">
          {language === "fr"
            ? "Ne transmettez jamais de PAN, CVV, code à usage unique, mot de passe ou autre secret par e-mail ou messagerie."
            : "Never send a PAN, CVV, one-time code, password, or any other secret by email or messaging."}
        </p>
      </div>
    </section>
  );
};

export default TestimonialsSection;

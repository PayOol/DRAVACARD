"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Type pour les questions
interface FAQItem {
  question: {
    fr: string;
    en: string;
  };
  answer: {
    fr: string;
    en: string;
  };
  category: string;
}

export default function FAQPage() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState(
    language === "fr" ? "Toutes" : "All",
  );

  // Définir les catégories
  const categories = {
    fr: ["Toutes", "Cartes virtuelles", "Paiements", "Recharges", "Sécurité"],
    en: ["All", "Virtual Cards", "Payments", "Top-ups", "Security"],
  };

  // Map des catégories pour la traduction
  const categoryMap = {
    Toutes: "All",
    "Cartes virtuelles": "Virtual Cards",
    Paiements: "Payments",
    Recharges: "Top-ups",
    Sécurité: "Security",
    All: "Toutes",
    "Virtual Cards": "Cartes virtuelles",
    Payments: "Paiements",
    "Top-ups": "Recharges",
    Security: "Sécurité",
  };

  // Questions fréquentes par catégorie
  const faqItems: FAQItem[] = [
    {
      question: {
        fr: "Qu'est-ce qu'une carte virtuelle DRAVA ?",
        en: "What is a DRAVA virtual card?",
      },
      answer: {
        fr: "Une carte virtuelle est un moyen de paiement numérique fourni et géré par un émetteur. Le site DRAVA est actuellement informatif : il n'émet, n'active et ne gère aucune carte.",
        en: "A virtual card is a digital payment method provided and managed by an issuer. The DRAVA website is currently informational: it does not issue, activate, or manage cards.",
      },
      category: "Cartes virtuelles",
    },
    {
      question: {
        fr: "Quels sont les types de cartes disponibles ?",
        en: "What types of cards are available?",
      },
      answer: {
        fr: "Les présentations de cartes visibles sur le site sont du contenu informatif. Elles ne constituent pas une offre active ni une garantie de disponibilité, de prix ou de fonctionnalités.",
        en: "Card presentations shown on the website are informational content. They are not an active offer or a guarantee of availability, price, or features.",
      },
      category: "Cartes virtuelles",
    },
    {
      question: {
        fr: "Où puis-je utiliser ma carte virtuelle ?",
        en: "Where can I use my virtual card?",
      },
      answer: {
        fr: "Le site DRAVA ne délivre actuellement aucune carte et ne peut donc pas confirmer son acceptation. Si un service est réactivé, seules les conditions officielles de l'émetteur et du commerçant concerné feront foi.",
        en: "The DRAVA website does not currently provide cards and therefore cannot confirm where one would be accepted. If a service is restored, only the official terms of the relevant issuer and merchant will apply.",
      },
      category: "Cartes virtuelles",
    },
    {
      question: {
        fr: "Y a-t-il des sites où je ne peux pas utiliser ma carte ?",
        en: "Are there any sites where I cannot use my card?",
      },
      answer: {
        fr: "Les restrictions dépendent de l'émetteur, du réseau, du commerçant et de la réglementation applicable. Le site statique DRAVA ne publie actuellement aucune liste faisant autorité; consultez toujours les conditions officielles de l'émetteur.",
        en: "Restrictions depend on the issuer, network, merchant, and applicable regulations. The static DRAVA website currently publishes no authoritative list; always consult the issuer's official terms.",
      },
      category: "Cartes virtuelles",
    },
    {
      question: {
        fr: "Quelle est la durée de validité d'une carte ?",
        en: "What is the validity period of a card?",
      },
      answer: {
        fr: "Le site n'émet aucune carte et ne peut confirmer aucune durée de validité. Référez-vous uniquement aux informations communiquées par l'émetteur dans son canal sécurisé; aucune donnée de carte ne sera envoyée par e-mail depuis ce site.",
        en: "The website does not issue cards and cannot confirm any validity period. Rely only on information provided by the issuer through its secure channel; no card data will be sent by email from this website.",
      },
      category: "Cartes virtuelles",
    },
    {
      question: {
        fr: "Comment fonctionne le paiement pour obtenir une carte ?",
        en: "How does payment work to obtain a card?",
      },
      answer: {
        fr: "Aucun paiement ni commande de carte n'est actif sur le site. Ne payez pas à partir d'un message, d'un lien non vérifié, d'un e-mail ou de WhatsApp prétendant représenter ce parcours. DRAVA n'envoie jamais de numéro de carte, de CVV, de code ou de secret par e-mail.",
        en: "No payment or card-order flow is active on the website. Do not pay from a message, unverified link, email, or WhatsApp conversation claiming to represent this flow. DRAVA never sends card numbers, CVVs, codes, or secrets by email.",
      },
      category: "Paiements",
    },
    {
      question: {
        fr: "Les paiements sont-ils sécurisés ?",
        en: "Are payments secure?",
      },
      answer: {
        fr: "Aucun paiement n'est traité sur le site actuel. HTTPS protège le transport des pages mais ne constitue pas une garantie absolue et ne transforme pas un e-mail ou un appel en canal de paiement sécurisé. N'y communiquez aucune donnée financière sensible.",
        en: "No payment is processed on the current website. HTTPS protects page transport but is not an absolute guarantee and does not turn email or phone calls into secure payment channels. Do not disclose sensitive financial data through them.",
      },
      category: "Paiements",
    },
    {
      question: {
        fr: "Quels sont les frais associés aux cartes virtuelles ?",
        en: "What are the fees associated with virtual cards?",
      },
      answer: {
        fr: "Aucun tarif transactionnel affiché sur ce site statique ne doit être considéré comme une offre active. Les prix et frais devront être confirmés dans un parcours officiel et sécurisé si le service est réactivé.",
        en: "No transactional price shown on this static website should be treated as an active offer. Prices and fees will need to be confirmed through an official, secure flow if the service is restored.",
      },
      category: "Paiements",
    },
    {
      question: {
        fr: "Comment puis-je recharger ma carte virtuelle ?",
        en: "How can I top up my virtual card?",
      },
      answer: {
        fr: "La recharge est désactivée. Le site ne demande et ne conserve aucun numéro de carte, CVV, code de validation, identifiant de paiement ou montant de recharge.",
        en: "Top-ups are disabled. The website does not request or store card numbers, CVVs, verification codes, payment credentials, or top-up amounts.",
      },
      category: "Recharges",
    },
    {
      question: {
        fr: "Y a-t-il une limite de montant pour les recharges ?",
        en: "Is there a limit on the amount for top-ups?",
      },
      answer: {
        fr: "Aucune recharge n'est active et le site ne publie actuellement aucune limite faisant autorité. Si le service reprend, les limites devront être vérifiées auprès de l'émetteur dans son interface sécurisée.",
        en: "No top-up service is active, and the website currently publishes no authoritative limits. If service resumes, limits must be verified with the issuer in its secure interface.",
      },
      category: "Recharges",
    },
    {
      question: {
        fr: "Que faire si ma transaction est refusée ?",
        en: "What should I do if my transaction is declined?",
      },
      answer: {
        fr: "Le site DRAVA ne peut ni consulter ni diagnostiquer une transaction. Contactez immédiatement l'émetteur ou votre banque par son canal officiel. N'envoyez jamais par e-mail votre PAN complet, CVV, code à usage unique, mot de passe ou autre secret.",
        en: "The DRAVA website cannot view or diagnose a transaction. Contact the issuer or your bank immediately through its official channel. Never email your full PAN, CVV, one-time code, password, or any other secret.",
      },
      category: "Paiements",
    },
    {
      question: {
        fr: "Mes informations personnelles sont-elles en sécurité ?",
        en: "Is my personal information secure?",
      },
      answer: {
        fr: "Le site est statique et ne propose aucun formulaire actif de paiement, carte, retrait, newsletter, candidature revendeur ou WhatsApp. Le code conserve seulement la langue dans localStorage et des actifs publics dans Cache Storage. GitHub Pages peut traiter l'adresse IP et des journaux techniques. Les liens e-mail ou téléphone ouvrent des services externes soumis à leurs propres politiques.",
        en: "The website is static and has no active payment, card, withdrawal, newsletter, reseller application, or WhatsApp form. The code stores only the language in localStorage and public assets in Cache Storage. GitHub Pages may process IP addresses and technical logs. Email or phone links open external services governed by their own policies.",
      },
      category: "Sécurité",
    },
    {
      question: {
        fr: "Comment puis-je signaler une transaction non autorisée ?",
        en: "How can I report an unauthorized transaction?",
      },
      answer: {
        fr: "Contactez immédiatement l'émetteur de la carte ou votre banque via le numéro ou l'application officielle afin de bloquer le moyen de paiement et contester l'opération. Le site DRAVA ne peut pas geler une carte. Ne transmettez jamais de PAN, CVV, code ou secret à l'adresse de contact DRAVA.",
        en: "Immediately contact the card issuer or your bank through its official number or application to block the payment method and dispute the transaction. The DRAVA website cannot freeze a card. Never send a PAN, CVV, code, or secret to the DRAVA contact address.",
      },
      category: "Sécurité",
    },
  ];

  // Traduire la catégorie active si la langue change
  const displayedCategories = language === "fr" ? categories.fr : categories.en;

  // Filtrer les questions en fonction de la recherche et de la catégorie
  const filteredFAQs = faqItems.filter((item) => {
    const matchesSearch =
      item.question[language]
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.answer[language].toLowerCase().includes(searchQuery.toLowerCase());

    const categoryInCurrentLanguage =
      language === "fr"
        ? item.category
        : categoryMap[item.category as keyof typeof categoryMap];

    const activeCategoryInItemLanguage =
      language === "fr"
        ? activeCategory
        : categoryMap[activeCategory as keyof typeof categoryMap];

    const matchesCategory =
      activeCategory === (language === "fr" ? "Toutes" : "All") ||
      categoryInCurrentLanguage === activeCategoryInItemLanguage;

    return matchesSearch && matchesCategory;
  });

  // Fonction pour basculer l'état d'ouverture d'un accordéon
  const toggleAccordion = (index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <MainLayout>
      {/* Hero section avec recherche */}
      <section className="pt-20 md:pt-28 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {language === "fr" ? "Foire Aux Questions DRAVA" : "DRAVA FAQ"}
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {language === "fr"
                ? "Informations sur le site statique DRAVA et l'indisponibilité actuelle des services transactionnels — mise à jour le 4 septembre 2026."
                : "Information about the static DRAVA website and the current unavailability of transactional services — updated September 4, 2026."}
            </motion.p>

            <motion.div
              className="relative max-w-2xl mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={
                  language === "fr"
                    ? "Rechercher une question..."
                    : "Search for a question..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section principale des FAQ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar des catégories */}
            <motion.div
              className="lg:w-1/4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-lg font-bold mb-4">
                  {language === "fr" ? "Catégories" : "Categories"}
                </h2>
                <Separator className="mb-4" />
                <ul className="space-y-2">
                  {displayedCategories.map((category) => (
                    <li key={category}>
                      <button
                        onClick={() => setActiveCategory(category)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                          activeCategory === category
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {activeCategory === category ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        {category}
                        {category === (language === "fr" ? "Toutes" : "All") ? (
                          <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                            {faqItems.length}
                          </span>
                        ) : (
                          <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                            {language === "fr"
                              ? faqItems.filter(
                                  (item) => item.category === category,
                                ).length
                              : faqItems.filter(
                                  (item) =>
                                    categoryMap[
                                      item.category as keyof typeof categoryMap
                                    ] === category,
                                ).length}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">
                    {language === "fr"
                      ? "Besoin d'aide supplémentaire?"
                      : "Need additional help?"}
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">
                    {language === "fr"
                      ? "Le lien ouvre votre messagerie et vous fait quitter le site. N'envoyez jamais de PAN, CVV, code ou secret."
                      : "The link opens your email application and takes you away from the website. Never send a PAN, CVV, code, or secret."}
                  </p>
                  <Link href="mailto:contact.drava@gmail.com">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      {language === "fr"
                        ? "Contacter le support"
                        : "Contact support"}
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Liste des questions/réponses */}
            <motion.div
              className="lg:w-3/4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredFAQs.length > 0 ? (
                  <div>
                    {filteredFAQs.map((item, index) => (
                      <div
                        key={`${item.question[language]}-${index}`}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <button
                          onClick={() => toggleAccordion(index)}
                          className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">
                              {item.question[language]}
                            </span>
                            <span className="ml-3 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {language === "fr"
                                ? item.category
                                : categoryMap[
                                    item.category as keyof typeof categoryMap
                                  ]}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              openItems[index] ? "transform rotate-180" : ""
                            }`}
                          />
                        </button>
                        <AnimatePresence>
                          {openItems[index] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 py-4 bg-gray-50 text-gray-700">
                                <p>{item.answer[language]}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-gray-500 mb-4">
                      {language === "fr"
                        ? "Aucun résultat pour votre recherche"
                        : "No results for your search"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory(language === "fr" ? "Toutes" : "All");
                      }}
                    >
                      {language === "fr"
                        ? "Réinitialiser la recherche"
                        : "Reset search"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl font-bold mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {language === "fr"
                ? "Services transactionnels indisponibles"
                : "Transactional services unavailable"}
            </motion.h2>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {language === "fr"
                ? "Les paiements, cartes, recharges et retraits restent désactivés jusqu'à la mise en place d'un parcours sécurisé."
                : "Payments, cards, top-ups, and withdrawals remain disabled until a secure flow is available."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/cards">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                  {language === "fr"
                    ? "Voir l'état du service"
                    : "View service status"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

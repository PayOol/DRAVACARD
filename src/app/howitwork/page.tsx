"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { motion } from "framer-motion";
import {
  CheckCircle,
  CreditCard,
  DollarSign,
  Shield,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  const { language } = useLanguage();

  // Variantes d'animation pour les éléments
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  // Données sur les étapes du fonctionnement
  const steps = [
    {
      title:
        language === "fr" ? "Consultez la présentation" : "Review the overview",
      description:
        language === "fr"
          ? "Découvrez le projet et les catégories de cartes présentées à titre informatif, sans commande ni offre active."
          : "Learn about the project and card categories shown for information, with no ordering or active offer.",
      icon: <CreditCard className="h-10 w-10 text-white" />,
      color: "bg-blue-600",
      image: withBasePath("/images/card-generic.svg"),
    },
    {
      title:
        language === "fr"
          ? "Vérifiez l'état du service"
          : "Check service status",
      description:
        language === "fr"
          ? "Les pages de carte, recharge, solde et retrait indiquent clairement que les fonctions transactionnelles sont suspendues."
          : "The card, top-up, balance, and withdrawal pages clearly state that transactional features are paused.",
      icon: <CreditCard className="h-10 w-10 text-white" />,
      color: "bg-indigo-600",
      image: withBasePath("/images/drava-logo.svg"),
    },
    {
      title: language === "fr" ? "Aucun paiement actif" : "No active payments",
      description:
        language === "fr"
          ? "Le site ne reçoit aucun paiement, montant de recharge, identifiant financier ou ordre de retrait."
          : "The website receives no payments, top-up amounts, financial credentials, or withdrawal instructions.",
      icon: <DollarSign className="h-10 w-10 text-white" />,
      color: "bg-green-600",
      image: withBasePath("/images/drava-icon-512.svg"),
    },
    {
      title:
        language === "fr"
          ? "Aucun détail envoyé par e-mail"
          : "No details sent by email",
      description:
        language === "fr"
          ? "DRAVA n'envoie aucune donnée de carte depuis ce site. Un e-mail ou une messagerie ne doit jamais servir à transmettre un PAN, un CVV ou un code."
          : "DRAVA sends no card data from this website. Email or messaging must never be used to send a PAN, CVV, or code.",
      icon: <Smartphone className="h-10 w-10 text-white" />,
      color: "bg-purple-600",
      image: withBasePath("/images/visa.svg"),
    },
    {
      title:
        language === "fr"
          ? "Attendez un parcours vérifié"
          : "Wait for a verified flow",
      description:
        language === "fr"
          ? "Une éventuelle réouverture sera annoncée sur le site et reposera sur une infrastructure serveur sécurisée."
          : "Any future reopening will be announced on the website and rely on secure server infrastructure.",
      icon: <ShoppingCart className="h-10 w-10 text-white" />,
      color: "bg-rose-600",
      image: withBasePath("/images/mastercard.svg"),
    },
  ];

  // Principes de la version publique actuelle
  const benefits = [
    {
      title: language === "fr" ? "Publication statique" : "Static publishing",
      description:
        language === "fr"
          ? "Le site présente du contenu public et n'exécute aucune transaction financière."
          : "The website presents public content and performs no financial transactions.",
      icon: <Shield className="h-6 w-6 text-blue-600" />,
    },
    {
      title: language === "fr" ? "Collecte minimisée" : "Minimized collection",
      description:
        language === "fr"
          ? "Aucun formulaire actif ne collecte de paiement, carte, retrait, newsletter ou candidature revendeur."
          : "No active form collects payment, card, withdrawal, newsletter, or reseller application data.",
      icon: <CheckCircle className="h-6 w-6 text-blue-600" />,
    },
    {
      title: language === "fr" ? "Statut transparent" : "Transparent status",
      description:
        language === "fr"
          ? "Chaque fonction sensible renvoie vers une page de maintenance explicite."
          : "Each sensitive feature leads to an explicit maintenance page.",
      icon: <DollarSign className="h-6 w-6 text-blue-600" />,
    },
    {
      title: language === "fr" ? "Contact prudent" : "Cautious contact",
      description:
        language === "fr"
          ? "Les contacts ouvrent un service externe. Ne transmettez jamais de PAN, CVV, code, mot de passe ou secret."
          : "Contact links open an external service. Never send a PAN, CVV, code, password, or secret.",
      icon: <Smartphone className="h-6 w-6 text-blue-600" />,
    },
  ];

  return (
    <MainLayout>
      {/* Hero section avec bannière */}
      <section className="pt-20 md:pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {language === "fr"
                ? "Comment fonctionne DRAVA ?"
                : "How does DRAVA work?"}
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {language === "fr"
                ? "Découvrez le fonctionnement informatif du site pendant la suspension temporaire de tous les services transactionnels."
                : "Learn how the informational website works while all transactional services are temporarily paused."}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Section des étapes */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {language === "fr"
              ? "Le fonctionnement actuel en 5 points"
              : "The current operation in 5 points"}
          </motion.h2>

          <motion.div
            className="grid gap-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className={`flex flex-col md:flex-row ${index % 2 === 1 ? "md:flex-row-reverse" : ""} gap-8 items-center`}
                variants={itemVariants}
              >
                <div className="md:w-1/2">
                  <div className="relative">
                    <div className="rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                    <div
                      className={`absolute -top-4 -left-4 ${step.color} rounded-full p-4 shadow-lg`}
                    >
                      {step.icon}
                    </div>
                  </div>
                </div>

                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                      {index + 1}
                    </div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{step.description}</p>
                  {index === 0 && (
                    <Link href="/cards">
                      <Button className="bg-blue-600">
                        {language === "fr"
                          ? "Voir l'état des services"
                          : "View service status"}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section des avantages */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-3xl font-bold text-center mb-12"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === "fr"
                ? "Principes de la version actuelle"
                : "Current-version principles"}
            </motion.h2>

            <motion.div
              className="grid md:grid-cols-2 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  className="bg-white p-6 rounded-xl shadow-sm"
                  variants={itemVariants}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-lg mr-4">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-12 text-center"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Link href="/cards">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                  {language === "fr"
                    ? "Consulter l'état du service"
                    : "Check service status"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ section avec lien vers la page FAQ complète */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl font-bold mb-6"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === "fr"
                ? "Vous avez des questions ?"
                : "Do you have questions?"}
            </motion.h2>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === "fr"
                ? "Consultez d'abord la FAQ. Le contact par e-mail ouvre votre messagerie et vous fait quitter le site; n'envoyez aucune donnée financière ou d'authentification."
                : "Check the FAQ first. Email contact opens your mail application and takes you away from the website; send no financial or authentication data."}
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Link href="/faq">
                <Button variant="outline" className="px-6">
                  {language === "fr" ? "Consulter la FAQ" : "Check the FAQ"}
                </Button>
              </Link>
              <Link href="mailto:contact.drava@gmail.com">
                <Button className="bg-blue-600 hover:bg-blue-700 px-6">
                  {language === "fr"
                    ? "Contacter le support"
                    : "Contact support"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

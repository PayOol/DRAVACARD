"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { Mail, ShieldCheck, UserRoundX } from "lucide-react";
import Link from "next/link";

export default function ResellerPage() {
  const { language } = useLanguage();

  const notices = [
    {
      title: {
        fr: "Aucun programme actif",
        en: "No active program",
      },
      description: {
        fr: "Aucune commission, remise, formation, vente ou relation revendeur n'est proposée depuis cette version du site.",
        en: "No commission, discount, training, sale, or reseller relationship is offered through this version of the website.",
      },
      icon: UserRoundX,
    },
    {
      title: {
        fr: "Aucune candidature collectée",
        en: "No applications collected",
      },
      description: {
        fr: "Cette page ne contient aucun formulaire et ne reçoit aucune identité, coordonnée, pièce justificative ou donnée bancaire.",
        en: "This page contains no form and receives no identity, contact details, supporting documents, or banking data.",
      },
      icon: ShieldCheck,
    },
    {
      title: {
        fr: "Réouverture sécurisée requise",
        en: "Secure reopening required",
      },
      description: {
        fr: "Toute future candidature devra utiliser un traitement serveur sécurisé et sera annoncée clairement sur le site officiel.",
        en: "Any future application must use secure server-side processing and will be clearly announced on the official website.",
      },
      icon: ShieldCheck,
    },
  ];

  return (
    <MainLayout>
      <section className="bg-gradient-to-b from-slate-50 to-white pb-16 pt-20 md:pt-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
              {language === "fr"
                ? "Candidatures temporairement suspendues"
                : "Applications temporarily paused"}
            </div>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              {language === "fr"
                ? "Informations revendeurs DRAVA"
                : "DRAVA reseller information"}
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-600">
              {language === "fr"
                ? "Le site public ne propose actuellement ni inscription ni activité de revente. Cette page présente uniquement le statut du projet."
                : "The public website currently offers no enrollment or reseller activity. This page only presents the project's status."}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {notices.map((notice) => (
              <div
                key={notice.title.en}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50">
                  <notice.icon className="h-8 w-8 text-blue-700" />
                </div>
                <h2 className="mb-2 text-xl font-bold">
                  {notice.title[language]}
                </h2>
                <p className="text-gray-600">{notice.description[language]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-amber-800" />
            <h2 className="mb-3 text-2xl font-bold text-gray-900">
              {language === "fr" ? "Protégez vos données" : "Protect your data"}
            </h2>
            <p className="mb-4 text-gray-700">
              {language === "fr"
                ? "N'envoyez par e-mail ou messagerie aucune pièce d'identité, donnée bancaire, PAN, CVV, code à usage unique, mot de passe ou autre secret."
                : "Do not send identity documents, banking data, a PAN, CVV, one-time code, password, or any other secret by email or messaging."}
            </p>
            <p className="text-sm text-gray-600">
              {language === "fr"
                ? "Les liens e-mail ouvrent un service externe soumis à sa propre politique."
                : "Email links open an external service governed by its own policy."}
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/faq">
              <Button variant="outline">
                {language === "fr" ? "Consulter la FAQ" : "Read the FAQ"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

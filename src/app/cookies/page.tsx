"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

export default function CookiesPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold">
            {language === "fr"
              ? "Politique de stockage local DRAVA"
              : "DRAVA Local Storage Policy"}
          </h1>
          <p className="mb-2 text-gray-600">
            {language === "fr"
              ? "Cette page explique l'absence de cookies applicatifs et le stockage local limité utilisé par le site."
              : "This page explains the absence of application cookies and the website's limited use of local storage."}
          </p>
          <p className="mb-8 text-sm text-gray-500">
            {language === "fr"
              ? "Dernière mise à jour : 4 septembre 2026"
              : "Last updated: September 4, 2026"}
          </p>

          <div className="prose prose-blue max-w-none">
            <div className="mb-8 rounded-lg bg-blue-50 p-6 text-blue-950">
              <p className="font-semibold">
                {language === "fr"
                  ? "Le code applicatif DRAVA ne dépose aucun cookie."
                  : "The DRAVA application code does not set cookies."}
              </p>
              <p className="mt-2">
                {language === "fr"
                  ? "Il n'utilise ni outil publicitaire, ni outil d'analyse, ni pixel de suivi."
                  : "It uses no advertising tool, analytics tool, or tracking pixel."}
              </p>
            </div>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="definition">
                {language === "fr"
                  ? "1. Cookies et stockage du navigateur"
                  : "1. Cookies and browser storage"}
              </h2>
              <p>
                {language === "fr"
                  ? "Un cookie est une donnée qu'un site peut associer aux requêtes de votre navigateur. Le stockage local et Cache Storage sont des espaces distincts du navigateur : leurs données ne sont pas envoyées automatiquement avec chaque requête."
                  : "A cookie is data that a website can associate with your browser requests. Local storage and Cache Storage are separate browser areas: their data is not automatically sent with every request."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="utilisation">
                {language === "fr"
                  ? "2. Ce que le site conserve localement"
                  : "2. What the website stores locally"}
              </h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>
                    {language === "fr"
                      ? "Préférence de langue :"
                      : "Language preference:"}
                  </strong>{" "}
                  {language === "fr"
                    ? "le choix français ou anglais est conservé dans localStorage pour l'affichage des prochaines pages."
                    : "the French or English choice is kept in localStorage for subsequent page displays."}
                </li>
                <li>
                  <strong>
                    {language === "fr" ? "Actifs publics :" : "Public assets:"}
                  </strong>{" "}
                  {language === "fr"
                    ? "le service worker peut placer des fichiers publics et versionnés du site dans Cache Storage pour accélérer leur chargement."
                    : "the service worker may place public, versioned website files in Cache Storage to improve loading."}
                </li>
              </ul>
              <p className="mt-4">
                {language === "fr"
                  ? "Aucune de ces zones n'est utilisée par le code du site pour conserver un paiement, une carte, une recharge, un retrait, une inscription à une newsletter ou une candidature revendeur."
                  : "Neither area is used by the website code to store a payment, card, top-up, withdrawal, newsletter subscription, or reseller application."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="hebergeur">
                {language === "fr"
                  ? "3. GitHub Pages et services externes"
                  : "3. GitHub Pages and external services"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "GitHub Pages héberge le site et peut traiter des adresses IP et des journaux techniques selon les politiques de GitHub. Ces traitements d'hébergement ne sont pas pilotés par le code applicatif DRAVA."
                  : "GitHub Pages hosts the website and may process IP addresses and technical logs under GitHub's policies. This hosting processing is not controlled by the DRAVA application code."}
              </p>
              <p>
                {language === "fr"
                  ? "Un lien vers un e-mail, un numéro de téléphone ou un autre site ouvre une application ou un service externe. Ce fournisseur peut utiliser ses propres cookies ou stockages selon sa politique."
                  : "A link to an email address, phone number, or another website opens an external application or service. That provider may use its own cookies or storage under its policy."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="controle">
                {language === "fr"
                  ? "4. Gérer ou supprimer les données locales"
                  : "4. Managing or deleting local data"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Vous pouvez effacer la préférence de langue, le cache et les données du site depuis les réglages de confidentialité ou de stockage de votre navigateur. Vous pouvez aussi désinscrire le service worker dans les outils ou réglages du navigateur."
                  : "You can remove the language preference, cache, and website data from your browser's privacy or storage settings. You can also unregister the service worker through the browser's tools or settings."}
              </p>
              <p>
                {language === "fr"
                  ? "Cette suppression peut réinitialiser la langue et obliger le navigateur à télécharger de nouveau les actifs publics; elle ne bloque pas l'accès au contenu essentiel du site."
                  : "Removing this data may reset the language and require the browser to download public assets again; it does not prevent access to the website's essential content."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="modifications">
                {language === "fr"
                  ? "5. Modifications et contact"
                  : "5. Changes and contact"}
              </h2>
              <p>
                {language === "fr"
                  ? "Cette politique sera mise à jour avant l'ajout de tout nouveau cookie, outil de mesure ou stockage. Pour toute question, écrivez à "
                  : "This policy will be updated before any new cookie, measurement tool, or storage is added. For questions, write to "}
                <a
                  href="mailto:contact.drava@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  contact.drava@gmail.com
                </a>
                {language === "fr"
                  ? ". Ce lien ouvre votre messagerie; n'envoyez jamais de PAN, CVV, code ou secret."
                  : ". This link opens your email application; never send a PAN, CVV, code, or secret."}
              </p>
            </section>

            <Separator className="my-8" />

            <div className="mt-10 rounded-lg bg-blue-50 p-6">
              <h3 className="mb-3 text-xl font-semibold text-blue-800">
                {language === "fr" ? "Liens connexes" : "Related links"}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <span className="mr-2">→</span>
                    {language === "fr"
                      ? "Politique de confidentialité"
                      : "Privacy Policy"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <span className="mr-2">→</span>
                    {language === "fr"
                      ? "Conditions d'utilisation"
                      : "Terms of Service"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <span className="mr-2">→</span>
                    {language === "fr" ? "Foire aux questions" : "FAQ"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

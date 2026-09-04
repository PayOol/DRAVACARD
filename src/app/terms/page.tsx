"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

export default function TermsPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold">
            {language === "fr"
              ? "Conditions d'utilisation DRAVA"
              : "DRAVA Terms of Use"}
          </h1>
          <p className="mb-2 text-lg text-gray-600">
            {language === "fr"
              ? "Ces conditions concernent uniquement la consultation du site public statique DRAVA."
              : "These terms apply only to browsing the public, static DRAVA website."}
          </p>
          <p className="mb-8 text-sm text-gray-500">
            {language === "fr"
              ? "Dernière mise à jour : 4 septembre 2026"
              : "Last updated: September 4, 2026"}
          </p>

          <div className="prose prose-blue max-w-none">
            <div className="mb-8 rounded-lg bg-amber-50 p-6 text-amber-950">
              <p className="font-semibold">
                {language === "fr"
                  ? "Aucun service financier ou transactionnel n'est actif sur ce site."
                  : "No financial or transactional service is active on this website."}
              </p>
              <p className="mt-2">
                {language === "fr"
                  ? "Aucun achat, paiement, rechargement, consultation de solde, retrait, remboursement, compte ou candidature revendeur ne peut être traité depuis cette version."
                  : "No purchase, payment, top-up, balance lookup, withdrawal, refund, account, or reseller application can be processed through this version."}
              </p>
            </div>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="acceptation">
                {language === "fr"
                  ? "1. Objet et acceptation"
                  : "1. Scope and acceptance"}
              </h2>
              <p>
                {language === "fr"
                  ? "En consultant ce site, vous acceptez les présentes règles relatives à son contenu public et à son utilisation. Si vous ne les acceptez pas, cessez d'utiliser le site. Ces conditions ne créent aucun compte, mandat de paiement, contrat de carte ou engagement commercial."
                  : "By browsing this website, you accept these rules concerning its public content and use. If you do not accept them, stop using the website. These terms create no account, payment mandate, card contract, or commercial commitment."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="service">
                {language === "fr"
                  ? "2. Nature du site actuel"
                  : "2. Nature of the current website"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "DRAVA publie actuellement une présentation informative hébergée sur GitHub Pages. Les descriptions de cartes, marques, pays ou usages éventuels fournissent du contexte général; elles ne constituent ni une offre active, ni une preuve de partenariat, d'acceptation, de prix ou de disponibilité."
                  : "DRAVA currently publishes an informational overview hosted on GitHub Pages. Descriptions of cards, brands, countries, or possible uses provide general context; they are not an active offer or proof of partnership, acceptance, price, or availability."}
              </p>
              <p>
                {language === "fr"
                  ? "Toute future fonction transactionnelle devra être annoncée explicitement et accompagnée de conditions commerciales distinctes avant son activation."
                  : "Any future transactional feature must be explicitly announced and accompanied by separate commercial terms before activation."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="utilisation">
                {language === "fr"
                  ? "3. Utilisation autorisée"
                  : "3. Permitted use"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Vous pouvez consulter le contenu pour un usage licite et personnel. Vous ne devez pas tenter de contourner les pages de maintenance, rechercher des fonctions financières cachées, perturber le site, introduire du code malveillant, usurper l'identité de DRAVA ou utiliser son contenu pour tromper un tiers."
                  : "You may browse the content for lawful, personal use. You must not attempt to bypass maintenance pages, seek hidden financial features, disrupt the website, introduce malicious code, impersonate DRAVA, or use its content to mislead a third party."}
              </p>
              <p>
                {language === "fr"
                  ? "Ne versez aucun fonds sur la base d'un message, d'un e-mail, d'un appel ou d'un lien non vérifié prétendant activer un service DRAVA."
                  : "Do not send funds based on a message, email, call, or unverified link claiming to activate a DRAVA service."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="donnees-sensibles">
                {language === "fr"
                  ? "4. Données sensibles et contacts"
                  : "4. Sensitive data and contacts"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Le site ne contient aucun formulaire actif demandant des données financières ou d'identité. Ne transmettez jamais un PAN (numéro complet de carte), un CVV, un code à usage unique, un code de retrait, un mot de passe, une clé, une pièce d'identité ou un autre secret par e-mail, téléphone ou messagerie."
                  : "The website contains no active form requesting financial or identity data. Never send a PAN (full card number), CVV, one-time code, withdrawal code, password, key, identity document, or other secret by email, phone, or messaging."}
              </p>
              <p>
                {language === "fr"
                  ? "Les liens e-mail et téléphone ouvrent des applications ou services externes soumis à leurs propres conditions et politiques."
                  : "Email and phone links open external applications or services governed by their own terms and policies."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="propriete">
                {language === "fr"
                  ? "5. Propriété intellectuelle"
                  : "5. Intellectual property"}
              </h2>
              <p>
                {language === "fr"
                  ? "Sauf indication contraire, le contenu original, l'identité visuelle et les éléments propres à DRAVA sont protégés par les droits applicables. Les marques de tiers restent la propriété de leurs titulaires. Leur mention n'implique aucun partenariat ou soutien."
                  : "Unless stated otherwise, original content, visual identity, and DRAVA-specific elements are protected by applicable rights. Third-party trademarks remain the property of their owners. Mentioning them does not imply partnership or endorsement."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="disponibilite">
                {language === "fr"
                  ? "6. Exactitude et disponibilité"
                  : "6. Accuracy and availability"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Nous cherchons à maintenir des informations claires et à jour, mais le contenu peut être corrigé, modifié, suspendu ou retiré. Aucune transmission, publication ou mesure technique ne fournit une garantie absolue de disponibilité, d'exactitude ou de sécurité."
                  : "We aim to keep information clear and current, but content may be corrected, changed, paused, or removed. No transmission, publication, or technical measure provides an absolute guarantee of availability, accuracy, or security."}
              </p>
              <p>
                {language === "fr"
                  ? "Ne vous fondez pas sur ce site pour prendre une décision bancaire ou financière. Vérifiez toute information auprès de l'établissement officiellement responsable."
                  : "Do not rely on this website to make a banking or financial decision. Verify any information with the institution officially responsible."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="tiers">
                {language === "fr"
                  ? "7. Hébergement et services tiers"
                  : "7. Hosting and third-party services"}
              </h2>
              <p>
                {language === "fr"
                  ? "GitHub Pages héberge le site et peut traiter des données techniques selon ses propres politiques. Les sites, applications de messagerie, opérateurs ou autres services ouverts depuis un lien externe sont indépendants; DRAVA ne contrôle pas leur contenu, leur disponibilité ou leurs traitements."
                  : "GitHub Pages hosts the website and may process technical data under its own policies. Websites, email applications, carriers, or other services opened from an external link are independent; DRAVA does not control their content, availability, or processing."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="responsabilite">
                {language === "fr"
                  ? "8. Limitation de responsabilité"
                  : "8. Limitation of liability"}
              </h2>
              <p>
                {language === "fr"
                  ? "Dans les limites permises par le droit applicable, DRAVA n'est pas responsable des décisions prises sur la seule base de ce contenu informatif, des interruptions de l'hébergeur ou des actes d'un service externe. Rien dans ces conditions n'exclut une responsabilité qui ne peut légalement être exclue."
                  : "To the extent permitted by applicable law, DRAVA is not liable for decisions made solely on the basis of this informational content, hosting interruptions, or the actions of an external service. Nothing in these terms excludes liability that cannot legally be excluded."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="loi">
                {language === "fr"
                  ? "9. Droit applicable et modifications"
                  : "9. Governing law and changes"}
              </h2>
              <p>
                {language === "fr"
                  ? "Ces conditions sont régies par le droit applicable au Cameroun, sous réserve des règles impératives pouvant protéger l'utilisateur. Elles peuvent être mises à jour pour refléter l'évolution du site; la date affichée en haut de page indique la version en vigueur."
                  : "These terms are governed by the law applicable in Cameroon, subject to mandatory rules that may protect the user. They may be updated to reflect changes to the website; the date at the top of the page identifies the current version."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="contact">
                {language === "fr" ? "10. Contact" : "10. Contact"}
              </h2>
              <p>
                {language === "fr"
                  ? "Pour une question générale sur ces conditions, écrivez à "
                  : "For a general question about these terms, write to "}
                <a
                  href="mailto:contact.drava@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  contact.drava@gmail.com
                </a>
                {language === "fr"
                  ? ". Ce lien ouvre votre messagerie externe; n'y joignez aucune donnée sensible."
                  : ". This link opens your external email application; do not attach sensitive data."}
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
                    href="/cookies"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <span className="mr-2">→</span>
                    {language === "fr"
                      ? "Politique relative au stockage local"
                      : "Local Storage Policy"}
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

"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

export default function PrivacyPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold">
            {language === "fr"
              ? "Politique de confidentialité DRAVA"
              : "DRAVA Privacy Policy"}
          </h1>
          <p className="mb-2 text-lg text-gray-600">
            {language === "fr"
              ? "Cette politique décrit les données liées au site public statique DRAVA."
              : "This policy describes the data associated with the public, static DRAVA website."}
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
                  ? "Aucun service transactionnel n'est actuellement actif sur ce site."
                  : "No transactional service is currently active on this website."}
              </p>
              <p className="mt-2">
                {language === "fr"
                  ? "Le site ne contient aucun formulaire actif de paiement, de carte, de recharge, de retrait, de newsletter, de candidature revendeur ou WhatsApp. N'envoyez jamais un numéro de carte, un CVV, un code à usage unique, un mot de passe ou tout autre secret par e-mail ou téléphone."
                  : "The website has no active payment, card, top-up, withdrawal, newsletter, reseller application, or WhatsApp form. Never send a card number, CVV, one-time code, password, or any other secret by email or phone."}
              </p>
            </div>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="collecte">
                {language === "fr"
                  ? "1. Données traitées par le site"
                  : "1. Data processed by the website"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Le code applicatif ne crée pas de compte, ne reçoit pas de paiement et ne collecte pas de données de carte ou de formulaire. Il conserve uniquement votre choix de langue dans le stockage local du navigateur. Le service worker peut conserver des actifs publics du site dans Cache Storage afin d'améliorer leur chargement."
                  : "The application code does not create accounts, receive payments, or collect card or form data. It stores only your language choice in the browser's local storage. The service worker may retain public website assets in Cache Storage to improve loading."}
              </p>
              <p>
                {language === "fr"
                  ? "Ces données restent sur votre appareil jusqu'à leur suppression par votre navigateur. Le code applicatif ne dépose aucun cookie."
                  : "This data remains on your device until your browser removes it. The application code does not set cookies."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="hebergement">
                {language === "fr"
                  ? "2. Hébergement et journaux techniques"
                  : "2. Hosting and technical logs"}
              </h2>
              <p>
                {language === "fr"
                  ? "Le site est publié avec GitHub Pages. Comme tout hébergeur, GitHub peut traiter des données techniques telles que l'adresse IP, la date de la requête, le navigateur et les journaux de sécurité ou d'accès, selon ses propres politiques. DRAVA n'exploite pas ces journaux depuis le code du site."
                  : "The website is published with GitHub Pages. Like any hosting provider, GitHub may process technical data such as IP addresses, request times, browser information, and security or access logs under its own policies. DRAVA does not use these logs through the website code."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="liens-externes">
                {language === "fr"
                  ? "3. E-mail, téléphone et liens externes"
                  : "3. Email, phone, and external links"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Cliquer sur une adresse e-mail, un numéro de téléphone ou un lien externe vous fait quitter le site ou ouvre une autre application. Les données que vous transmettez sont alors traitées par votre fournisseur de messagerie, votre opérateur ou le service externe concerné selon ses propres règles."
                  : "Selecting an email address, phone number, or external link takes you away from the website or opens another application. Information you send is then processed by your email provider, carrier, or the relevant external service under its own rules."}
              </p>
              <p className="font-medium">
                {language === "fr"
                  ? "N'utilisez jamais ces canaux pour transmettre un PAN (numéro complet de carte), un CVV, un code de validation ou un secret d'authentification."
                  : "Never use these channels to send a PAN (full card number), CVV, verification code, or authentication secret."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="partage">
                {language === "fr"
                  ? "4. Partage et vente des données"
                  : "4. Data sharing and sale"}
              </h2>
              <p>
                {language === "fr"
                  ? "Le code du site ne vend ni ne transmet de données personnelles à un réseau publicitaire, un outil d'analyse ou un processeur de paiement. L'hébergement et les services externes éventuellement ouverts depuis un lien restent soumis aux traitements décrits par leurs fournisseurs."
                  : "The website code neither sells nor sends personal data to an advertising network, analytics tool, or payment processor. Hosting and any external service opened from a link remain subject to the processing described by their providers."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="securite">
                {language === "fr" ? "5. Sécurité" : "5. Security"}
              </h2>
              <p>
                {language === "fr"
                  ? "Nous limitons les fonctions du site afin qu'il ne collecte pas de données financières. Aucune transmission ou plateforme ne peut toutefois offrir une garantie absolue. Vérifiez toujours le destinataire et ne communiquez jamais d'informations financières sensibles par un canal non prévu à cet effet."
                  : "We limit the website's features so that it does not collect financial data. However, no transmission method or platform can provide an absolute guarantee. Always verify the recipient and never disclose sensitive financial information through an unsuitable channel."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="droits">
                {language === "fr" ? "6. Vos droits" : "6. Your rights"}
              </h2>
              <p className="mb-4">
                {language === "fr"
                  ? "Selon le droit applicable, vous pouvez demander l'accès, la rectification ou l'effacement des données personnelles que DRAVA détiendrait à la suite d'un contact direct. Pour les journaux d'hébergement ou les données envoyées à un service externe, adressez également votre demande au fournisseur concerné."
                  : "Depending on applicable law, you may request access to, correction of, or deletion of personal data DRAVA may hold following direct contact. For hosting logs or data sent to an external service, also direct your request to the relevant provider."}
              </p>
              <p>
                {language === "fr"
                  ? "Pour une demande de confidentialité, écrivez à "
                  : "For a privacy request, write to "}
                <a
                  href="mailto:contact.drava@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  contact.drava@gmail.com
                </a>
                {language === "fr"
                  ? ". Ce lien ouvre votre application de messagerie. N'y joignez aucune donnée de carte ou d'authentification."
                  : ". This link opens your email application. Do not attach card or authentication data."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="conservation">
                {language === "fr" ? "7. Conservation" : "7. Retention"}
              </h2>
              <p>
                {language === "fr"
                  ? "DRAVA ne reçoit aucune donnée depuis un formulaire de ce site. Votre préférence de langue et les actifs publics mis en cache sont conservés localement selon les réglages de votre navigateur. Les durées de conservation des journaux GitHub Pages et des communications externes sont déterminées par leurs fournisseurs et les obligations applicables."
                  : "DRAVA receives no data from a form on this website. Your language preference and cached public assets are retained locally according to your browser settings. Retention periods for GitHub Pages logs and external communications are determined by their providers and applicable requirements."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold" id="modifications">
                {language === "fr"
                  ? "8. Modifications et contact"
                  : "8. Changes and contact"}
              </h2>
              <p>
                {language === "fr"
                  ? "Cette politique sera mise à jour si les fonctions ou traitements du site changent. Toute nouvelle fonction transactionnelle devra être décrite ici avant son activation. Pour toute question, utilisez l'adresse de contact ci-dessus sans transmettre de secret."
                  : "This policy will be updated if the website's features or processing change. Any new transactional feature must be described here before activation. For questions, use the contact address above without sending secrets."}
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
                    href="/cookies"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <span className="mr-2">→</span>
                    {language === "fr"
                      ? "Politique relative aux cookies"
                      : "Cookie Policy"}
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

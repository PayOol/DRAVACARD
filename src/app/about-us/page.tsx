"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";

export default function AboutUsPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      {/* Hero section */}
      <section className="pt-24 md:pt-32 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === "fr" ? "À propos de DRAVA" : "About DRAVA"}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {language === "fr"
                ? "Présentation publique d'un projet consacré à l'accès aux paiements digitaux en Afrique"
                : "A public overview of a project focused on access to digital payments in Africa"}
            </p>
          </div>
        </div>
      </section>

      {/* Company overview section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              {language === "fr" ? "L'histoire de DRAVA" : "DRAVA's Story"}
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="text-gray-600 mb-6">
                {language === "fr"
                  ? "DRAVA présente une vision : rendre les paiements internationaux plus accessibles en Afrique."
                  : "DRAVA presents a vision: making international payments more accessible in Africa."}
              </p>
              <p className="mb-4">
                {language === "fr"
                  ? "Le projet part du constat que les paiements internationaux restent complexes et difficiles d'accès pour de nombreuses personnes dans les régions émergentes."
                  : "The project starts from the observation that international payments remain complex and difficult to access for many people in emerging regions."}
              </p>
              <p className="mb-4">
                {language === "fr"
                  ? "La version actuellement publiée est un site statique d'information. Elle ne crée aucun compte et n'exécute aucune opération financière."
                  : "The currently published version is a static information website. It creates no accounts and performs no financial operations."}
              </p>
              <p className="mb-4">
                {language === "fr"
                  ? "Les services de carte, paiement, recharge, solde, retrait et candidature revendeur restent temporairement indisponibles pendant leur sécurisation."
                  : "Card, payment, top-up, balance, withdrawal, and reseller application services remain temporarily unavailable while they are secured."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* Mission and values section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {language === "fr"
                ? "Notre mission et nos valeurs"
                : "Our Mission and Values"}
            </h2>

            <div className="mb-12">
              <h3 className="text-xl font-semibold mb-4 text-blue-700">
                {language === "fr" ? "Notre mission" : "Our Mission"}
              </h3>
              <p className="text-gray-700">
                {language === "fr"
                  ? "Présenter clairement le projet et ne réactiver un service transactionnel qu'avec une infrastructure serveur, des contrôles et un parcours de paiement adaptés."
                  : "Present the project clearly and restore a transactional service only with suitable server infrastructure, controls, and payment flow."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === "fr" ? "Innovation" : "Innovation"}
                </h3>
                <p className="text-gray-700">
                  {language === "fr"
                    ? "Nous évaluons les évolutions nécessaires sans présenter une fonction expérimentale comme un service disponible."
                    : "We assess required improvements without presenting an experimental feature as an available service."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === "fr" ? "Sécurité" : "Security"}
                </h3>
                <p className="text-gray-700">
                  {language === "fr"
                    ? "Les fonctions sensibles restent fermées tant que leur traitement serveur sécurisé n'est pas prêt."
                    : "Sensitive features remain closed until their secure server-side processing is ready."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === "fr" ? "Accessibilité" : "Accessibility"}
                </h3>
                <p className="text-gray-700">
                  {language === "fr"
                    ? "Le contenu public est bilingue et conçu pour une consultation sur mobile comme sur ordinateur."
                    : "Public content is bilingual and designed for browsing on mobile and desktop devices."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === "fr" ? "Transparence" : "Transparency"}
                </h3>
                <p className="text-gray-700">
                  {language === "fr"
                    ? "Le site indique explicitement les services suspendus et ne présente aucun tarif comme une offre active."
                    : "The website explicitly identifies paused services and presents no price as an active offer."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* Integration status section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {language === "fr"
                ? "État des intégrations"
                : "Integration status"}
            </h2>

            <p className="text-center text-gray-700 mb-10">
              {language === "fr"
                ? "Cette version publique n'affirme aucun partenariat financier actif et n'est reliée à aucun processeur de paiement. Les marques éventuellement illustrées ailleurs décrivent des catégories générales et non une relation commerciale."
                : "This public version claims no active financial partnership and is connected to no payment processor. Any brands illustrated elsewhere describe general categories, not a commercial relationship."}
            </p>

            <div className="mx-auto max-w-2xl rounded-lg bg-amber-50 p-6 text-center text-amber-950">
              <p className="font-medium">
                {language === "fr"
                  ? "Aucun paiement, achat, rechargement ou retrait ne peut être effectué depuis ce site."
                  : "No payment, purchase, top-up, or withdrawal can be completed from this website."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {language === "fr" ? "Contactez-nous" : "Contact Us"}
            </h2>
            <p className="text-gray-700 mb-8">
              {language === "fr"
                ? "Les contacts e-mail et téléphone ouvrent des services externes. Ne transmettez jamais de PAN, CVV, code à usage unique, mot de passe ou autre secret."
                : "Email and phone contacts open external services. Never send a PAN, CVV, one-time code, password, or other secret."}
            </p>

            <div className="grid md:grid-cols-2 gap-8 text-center">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  {language === "fr" ? "Email" : "Email"}
                </h3>
                <p className="text-gray-700">contact.drava@gmail.com</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  {language === "fr" ? "Téléphone" : "Phone"}
                </h3>
                <p className="text-gray-700">+237 696 16 11 86</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

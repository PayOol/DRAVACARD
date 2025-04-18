'use client'

import MainLayout from '@/components/layout/MainLayout'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

export default function PrivacyPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            {language === 'fr'
              ? "Politique de confidentialité DRAVA"
              : "DRAVA Privacy Policy"}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {language === 'fr'
              ? "DRAVA s'engage à protéger votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles."
              : "DRAVA is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal data."}
          </p>

          <div className="prose prose-blue max-w-none">
            <p className="lead text-lg text-gray-700 mb-8">
              {language === 'fr'
                ? "Chez DRAVA, nous accordons une importance capitale à la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, partageons et protégeons vos informations lorsque vous utilisez nos services de cartes virtuelles."
                : "At DRAVA, we place the utmost importance on the protection of your personal data. This privacy policy explains how we collect, use, share, and protect your information when you use our virtual card services."}
            </p>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="collecte">
                {language === 'fr' ? "1. Collecte des informations" : "1. Information Collection"}
              </h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "Nous collectons les informations que vous nous fournissez directement lorsque vous :"
                  : "We collect information that you provide directly to us when you:"}
              </p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>
                  {language === 'fr' ? "Créez un compte DRAVA" : "Create a DRAVA account"}
                </li>
                <li>
                  {language === 'fr' ? "Achetez ou rechargez une carte virtuelle" : "Purchase or reload a virtual card"}
                </li>
                <li>
                  {language === 'fr' ? "Utilisez nos services en ligne" : "Use our online services"}
                </li>
                <li>
                  {language === 'fr' ? "Contactez notre service client" : "Contact our customer service"}
                </li>
                <li>
                  {language === 'fr' ? "Participez à nos enquêtes, promotions ou événements" : "Participate in our surveys, promotions, or events"}
                </li>
              </ul>

              <p className="mb-4">
                {language === 'fr'
                  ? "Les informations personnelles que nous collectons peuvent inclure :"
                  : "The personal information we collect may include:"}
              </p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>
                  {language === 'fr'
                    ? "Informations d'identification (nom, prénom, date de naissance)"
                    : "Identification information (first name, last name, date of birth)"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Coordonnées (adresse e-mail, numéro de téléphone, adresse postale)"
                    : "Contact information (email address, phone number, postal address)"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Informations financières (limité aux informations nécessaires pour les transactions)"
                    : "Financial information (limited to information necessary for transactions)"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Informations d'utilisation de nos services"
                    : "Information about your use of our services"}
                </li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="utilisation">2. {language === 'fr' ? "Utilisation des informations" : "Use of Information"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Nous utilisons vos informations personnelles pour :" : "We use your personal information to:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{language === 'fr' ? "Fournir, maintenir et améliorer nos services" : "Provide, maintain, and improve our services"}</li>
                <li>{language === 'fr' ? "Traiter vos transactions et gérer votre compte" : "Process your transactions and manage your account"}</li>
                <li>{language === 'fr' ? "Communiquer avec vous concernant votre compte et nos services" : "Communicate with you regarding your account and our services"}</li>
                <li>{language === 'fr' ? "Détecter, prévenir et résoudre les problèmes techniques ou de sécurité" : "Detect, prevent, and resolve technical or security issues"}</li>
                <li>{language === 'fr' ? "Respecter nos obligations légales et réglementaires" : "Comply with our legal and regulatory obligations"}</li>
                <li>{language === 'fr' ? "Personnaliser votre expérience et vous proposer des offres adaptées" : "Personalize your experience and offer you tailored offers"}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="partage">3. {language === 'fr' ? "Partage des informations" : "Sharing of Information"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Nous ne vendons pas vos données personnelles à des tiers. Nous pouvons partager vos informations avec :" : "We do not sell your personal data to third parties. We may share your information with:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{language === 'fr' ? "Nos partenaires de service qui nous aident à fournir nos services (processeurs de paiement, hébergeurs, etc.)" : "Our service partners who help us provide our services (payment processors, hosts, etc.)"}</li>
                <li>{language === 'fr' ? "Les autorités légales lorsque la loi l'exige" : "Legal authorities when required by law"}</li>
                <li>{language === 'fr' ? "En cas de fusion, acquisition ou vente d'actifs, vos données peuvent être transférées à la nouvelle entité" : "In the event of a merger, acquisition, or sale of assets, your data may be transferred to the new entity"}</li>
              </ul>

              <p className="mt-4">
                {language === 'fr' ? "Tous les tiers avec lesquels nous partageons vos données sont tenus de respecter la confidentialité de vos informations et de les traiter conformément à la loi." : "All third parties with whom we share your data are required to respect the confidentiality of your information and handle it in accordance with the law."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="securite">4. {language === 'fr' ? "Sécurité des données" : "Data Security"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "La sécurité de vos données est notre priorité. Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos informations personnelles, notamment :" : "The security of your data is our priority. We implement technical and organizational security measures to protect your personal information, including:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{language === 'fr' ? "Chiffrement SSL pour toutes les transmissions de données" : "SSL encryption for all data transmissions"}</li>
                <li>{language === 'fr' ? "Pratiques strictes de contrôle d'accès aux données" : "Strict data access control practices"}</li>
                <li>{language === 'fr' ? "Surveillance continue de nos systèmes pour détecter d'éventuelles vulnérabilités" : "Continuous monitoring of our systems to detect potential vulnerabilities"}</li>
                <li>{language === 'fr' ? "Formation régulière de notre personnel sur les bonnes pratiques de sécurité" : "Regular training of our staff on best security practices"}</li>
              </ul>

              <p className="mt-4">
                {language === 'fr' ? "Malgré nos efforts, aucune méthode de transmission ou de stockage électronique n'est totalement sécurisée. Nous ne pouvons donc garantir une sécurité absolue." : "Despite our efforts, no method of electronic transmission or storage is completely secure. Therefore, we cannot guarantee absolute security."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="cookies">5. {language === 'fr' ? "Utilisation des cookies" : "Use of Cookies"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Nous utilisons des cookies et technologies similaires pour améliorer votre expérience sur notre site, comprendre comment vous interagissez avec nos services et personnaliser notre contenu." : "We use cookies and similar technologies to enhance your experience on our site, understand how you interact with our services, and personalize our content."}
              </p>

              <p className="mb-4">
                {language === 'fr' ? "Vous pouvez gérer vos préférences en matière de cookies en modifiant les paramètres de votre navigateur. Notez cependant que la désactivation de certains cookies peut affecter votre expérience sur notre site et limiter certaines fonctionnalités." : "You can manage your cookie preferences by adjusting your browser settings. However, please note that disabling certain cookies may affect your experience on our site and limit certain features."}
              </p>

              <p>
                {language === 'fr' ? "Pour plus d'informations sur notre utilisation des cookies, veuillez consulter notre " : "For more information on our use of cookies, please see our "}
                <Link href="/cookies" className="text-blue-600 hover:underline">
                  {language === 'fr' ? "Politique relative aux cookies" : "Cookie Policy"}
                </Link>.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="droits">6. {language === 'fr' ? "Vos droits" : "Your Rights"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Selon votre lieu de résidence, vous pouvez disposer de certains droits concernant vos données personnelles :" : "Depending on your place of residence, you may have certain rights regarding your personal data:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{language === 'fr' ? "Droit d'accès à vos données personnelles" : "Right of access to your personal data"}</li>
                <li>{language === 'fr' ? "Droit de rectification des données inexactes" : "Right to rectification of inaccurate data"}</li>
                <li>{language === 'fr' ? "Droit à l'effacement de vos données (dans certaines circonstances)" : "Right to erasure of your data (in certain circumstances)"}</li>
                <li>{language === 'fr' ? "Droit de limitation du traitement" : "Right to restriction of processing"}</li>
                <li>{language === 'fr' ? "Droit à la portabilité des données" : "Right to data portability"}</li>
                <li>{language === 'fr' ? "Droit d'opposition au traitement" : "Right to object to processing"}</li>
                <li>{language === 'fr' ? "Droit de retirer votre consentement à tout moment" : "Right to withdraw your consent at any time"}</li>
              </ul>

              <p className="mt-4">
                {language === 'fr' ? "Pour exercer ces droits ou pour toute question concernant le traitement de vos données personnelles, veuillez nous contacter à " : "To exercise these rights or for any questions regarding the processing of your personal data, please contact us at "}
                <a href="mailto:contact.drava@gmail.com" className="text-blue-600 hover:underline">
                  contact.drava@gmail.com
                </a>.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="conservation">7. {language === 'fr' ? "Conservation des données" : "Data Retention"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services, respecter nos obligations légales, résoudre les litiges et faire appliquer nos accords." : "We retain your personal data for as long as necessary to provide our services, comply with our legal obligations, resolve disputes, and enforce our agreements."}
              </p>

              <p>
                {language === 'fr' ? "La durée de conservation spécifique dépend du type de données et de leur finalité. Lorsque nous n'avons plus besoin de vos données personnelles, nous les supprimons ou les anonymisons de manière sécurisée." : "The specific retention period depends on the type of data and its purpose. When we no longer need your personal data, we securely delete or anonymize it."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="enfants">8. {language === 'fr' ? "Protection des enfants" : "Children's Protection"}</h2>
              <p>
                {language === 'fr' ? "Nos services ne s'adressent pas aux personnes de moins de 18 ans. Nous ne collectons pas sciemment des informations personnelles auprès d'enfants. Si vous êtes un parent ou un tuteur et que vous pensez que votre enfant nous a fourni des informations personnelles, veuillez nous contacter immédiatement et nous prendrons les mesures nécessaires pour supprimer ces informations." : "Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately, and we will take the necessary steps to delete that information."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="modifications">9. {language === 'fr' ? "Modifications de la politique" : "Policy Modifications"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Nous pouvons modifier cette politique de confidentialité de temps à autre. Toute modification sera publiée sur cette page avec une date de mise à jour révisée." : "We may modify this privacy policy from time to time. Any changes will be posted on this page with a revised update date."}
              </p>

              <p>
                {language === 'fr' ? "Nous vous encourageons à consulter régulièrement cette politique pour rester informé de la façon dont nous protégeons vos informations. Votre utilisation continue de nos services après la publication des modifications constitue votre acceptation de ces changements." : "We encourage you to review this policy regularly to stay informed about how we protect your information. Your continued use of our services after the posting of changes constitutes your acceptance of such changes."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="contact">10. {language === 'fr' ? "Nous contacter" : "Contact Us"}</h2>
              <p className="mb-4">
                {language === 'fr' ? "Si vous avez des questions, des préoccupations ou des demandes concernant cette politique de confidentialité ou le traitement de vos données personnelles, veuillez nous contacter :" : "If you have any questions, concerns, or requests regarding this privacy policy or the processing of your personal data, please contact us:"}
              </p>

              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="font-medium mb-2">DRAVA - Responsable de la protection des données</p>
                <p className="mb-1">{language === 'fr' ? "Adresse : 1111 Maetur à Dakar, Cameroun" : "Address: 1111 Maetur in Dakar, Cameroon"}</p>
                <p className="mb-1">Email : <a href="mailto:contact.drava@gmail.com" className="text-blue-600 hover:underline">contact.drava@gmail.com</a></p>
                <p>Téléphone : +237 696 16 11 86</p>
              </div>
            </section>

            <Separator className="my-8" />

            <div className="mt-10 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-800">{language === 'fr' ? "Liens connexes" : "Related Links"}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> {language === 'fr' ? "Conditions d'utilisation" : "Terms of Service"}
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> {language === 'fr' ? "Politique relative aux cookies" : "Cookie Policy"}
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> {language === 'fr' ? "Foire Aux Questions" : "FAQ"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

'use client'

import MainLayout from '@/components/layout/MainLayout'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

export default function TermsPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            {language === 'fr'
              ? "Conditions d'utilisation DRAVA"
              : "DRAVA Terms of Service"}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {language === 'fr'
              ? "En utilisant les services de DRAVA, vous acceptez d'être lié par ces conditions d'utilisation."
              : "By using DRAVA services, you agree to be bound by these terms of service."}
          </p>

          <div className="prose prose-blue max-w-none">
            <p className="lead text-lg text-gray-700 mb-8">
              {language === 'fr'
                ? "Bienvenue sur DRAVA. En utilisant notre plateforme et nos services, vous acceptez les présentes conditions d'utilisation. Veuillez les lire attentivement avant d'utiliser notre site et nos services de cartes virtuelles."
                : "Welcome to DRAVA. By using our platform and services, you agree to these terms of service. Please read them carefully before using our site and virtual card services."}
            </p>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="acceptation">
                {language === 'fr' ? "1. Acceptation des conditions" : "1. Acceptance of Terms"}
              </h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "En accédant à ou en utilisant le service DRAVA, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas l'intégralité des termes de cet accord, vous ne pouvez pas accéder au site web ni utiliser nos services."
                  : "By accessing or using the DRAVA service, you agree to be bound by these terms of service. If you do not accept all the terms of this agreement, you may not access the website or use our services."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="services">
                {language === 'fr' ? "2. Description des services" : "2. Description of Services"}
              </h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "DRAVA fournit une plateforme permettant aux utilisateurs d'acquérir et de gérer des cartes virtuelles prépayées pour effectuer des achats en ligne. Nos services comprennent :"
                  : "DRAVA provides a platform that allows users to acquire and manage prepaid virtual cards for making online purchases. Our services include:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {language === 'fr'
                    ? "Émission de cartes virtuelles Visa et Mastercard"
                    : "Issuance of Visa and Mastercard virtual cards"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Recharge de cartes virtuelles"
                    : "Reloading of virtual cards"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Consultation de solde et historique des transactions"
                    : "Balance inquiry and transaction history"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Services de support client"
                    : "Customer support services"}
                </li>
              </ul>
              <p className="mt-4">
                {language === 'fr'
                  ? "DRAVA se réserve le droit de modifier, suspendre ou interrompre tout aspect du service à tout moment, y compris la disponibilité de toute fonctionnalité, base de données ou contenu."
                  : "DRAVA reserves the right to modify, suspend, or discontinue any aspect of the service at any time, including the availability of any feature, database, or content."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="paiements">3. Paiements et remboursements</h2>
              <p className="mt-4 mb-2 font-medium">
                {language === 'fr'
                  ? "Paiements et Recharges"
                  : "Payments and Top-ups"}
              </p>
              <p className="mb-4 text-gray-600">
                {language === 'fr'
                  ? "En achetant ou en rechargeant une carte virtuelle DRAVA :"
                  : "By purchasing or topping up a DRAVA virtual card:"}
              </p>

              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {language === 'fr'
                    ? "Vous autorisez DRAVA à vous facturer via la méthode de paiement choisie"
                    : "You authorize DRAVA to charge you via the chosen payment method"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Vous confirmez que vous êtes autorisé à utiliser la méthode de paiement sélectionnée"
                    : "You confirm that you are authorized to use the selected payment method"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Les frais de service ne sont pas remboursables"
                    : "Service fees are non-refundable"}
                </li>
                <li>
                  {language === 'fr'
                    ? "Le solde non utilisé peut être remboursé conformément à notre politique de remboursement, des frais de traitement peuvent s'appliquer"
                    : "Unused balance can be refunded according to our refund policy, processing fees may apply"}
                </li>
              </ul>
              <p className="mt-4">
                En cas de transaction frauduleuse ou non autorisée, veuillez nous contacter immédiatement.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="propriete">4. Propriété intellectuelle</h2>
              <p className="mb-4">
                Le service et son contenu original, ses fonctionnalités et ses fonctionnalités sont et resteront
                la propriété exclusive de DRAVA et de ses concédants de licence. Le service est protégé par le droit
                d'auteur, les marques de commerce et d'autres lois.
              </p>
              <p>
                Nos marques et notre habillage commercial ne peuvent pas être utilisés pour des produits ou services qui
                ne sont pas les nôtres, ou d'une manière susceptible de créer une confusion chez les clients, ou d'une
                manière qui dénigre ou discrédite DRAVA.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="limitation">5. Limitation de responsabilité</h2>
              <p className="mb-4">
                En aucun cas, DRAVA, ses administrateurs, employés ou agents ne seront responsables de tout dommage
                direct, indirect, accessoire, spécial, exemplaire ou consécutif (y compris, mais sans s'y limiter,
                l'acquisition de biens ou de services de substitution, la perte d'utilisation, de données ou de profits,
                ou l'interruption des activités) causé et selon toute théorie de responsabilité, qu'il s'agisse de contrat,
                de responsabilité stricte ou de délit (y compris la négligence ou autre), découlant de quelque manière que
                ce soit de l'utilisation du service, même si nous avons été informés de la possibilité de tels dommages.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="resiliation">6. Résiliation</h2>
              <p className="mb-4">
                Nous pouvons suspendre ou résilier votre accès au service immédiatement, sans préavis ni
                responsabilité, pour quelque raison que ce soit, y compris, sans limitation, si vous enfreignez les
                conditions d'utilisation.
              </p>
              <p className="mb-4">
                En cas de résiliation, votre droit d'utiliser le service cessera immédiatement.
              </p>
              <p>
                Toutes les dispositions des conditions d'utilisation qui, par leur nature, devraient survivre à la résiliation,
                survivront à la résiliation, y compris, sans limitation, les dispositions relatives à la propriété, les
                exclusions de garantie, l'indemnisation et les limitations de responsabilité.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="loi">7. Loi applicable</h2>
              <p className="mb-4">
                Ces conditions seront régies et interprétées conformément aux lois en vigueur au Cameroun, sans égard
                aux dispositions en matière de conflit de lois.
              </p>
              <p>
                Notre incapacité à faire respecter un droit ou une disposition des présentes conditions ne sera pas
                considérée comme une renonciation à ces droits. Si une disposition des présentes conditions est jugée
                invalide ou inapplicable par un tribunal, les dispositions restantes des présentes conditions resteront en vigueur.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="contact">8. Nous contacter</h2>
              <p className="mb-4">
                Si vous avez des questions concernant ces conditions d'utilisation, veuillez nous contacter :
              </p>

              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="font-medium mb-2">DRAVA - Service juridique</p>
                <p className="mb-1">Adresse : 1111 Maetur à Dakar, Cameroun</p>
                <p className="mb-1">Email : <a href="mailto:contact.drava@gmail.com" className="text-blue-600 hover:underline">contact.drava@gmail.com</a></p>
                <p>Téléphone : +237 696 16 11 86</p>
              </div>
            </section>

            <Separator className="my-8" />

            <div className="mt-10 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-800">Liens connexes</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Politique relative aux cookies
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Foire Aux Questions
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

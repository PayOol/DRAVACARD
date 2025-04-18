'use client'

import MainLayout from '@/components/layout/MainLayout'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/lib/language-context'

export default function AboutUsPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      {/* Hero section */}
      <section className="pt-24 md:pt-32 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr'
                ? "À propos de DRAVA"
                : "About DRAVA"}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {language === 'fr'
                ? "Transformons ensemble l'expérience des paiements digitaux en Afrique"
                : "Together, let's transform the digital payment experience in Africa"}
            </p>
          </div>
        </div>
      </section>

      {/* Company overview section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              {language === 'fr'
                ? "L'histoire de DRAVA"
                : "DRAVA's Story"}
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="text-gray-600 mb-6">
                {language === 'fr'
                  ? "DRAVA est née d'une vision simple : rendre les paiements internationaux accessibles à tous en Afrique."
                  : "DRAVA was born from a simple vision: making international payments accessible to everyone in Africa."}
              </p>
              <p className="mb-4">
                {language === 'fr'
                  ? "Fondée en 2020, DRAVA est née d'une simple observation : les paiements internationaux restent complexes et inaccessibles pour beaucoup, notamment dans les régions émergentes."
                  : "Founded in 2020, DRAVA was born from a simple observation: international payments remain complex and inaccessible for many, especially in emerging regions."}
              </p>
              <p className="mb-4">
                {language === 'fr'
                  ? "Notre équipe, composée d'experts en technologie financière et passionnés par l'inclusion financière, a décidé de créer une solution qui permettrait à chacun d'effectuer des transactions internationales sans obstacles."
                  : "Our team, composed of experts in financial technology and passionate about financial inclusion, decided to create a solution that would allow everyone to make international transactions without barriers."}
              </p>
              <p className="mb-4">
                {language === 'fr'
                  ? "Aujourd'hui, DRAVA sert plus de 50 000 utilisateurs à travers le monde et s'impose comme une référence dans le domaine des cartes virtuelles et des paiements sans frontières."
                  : "Today, DRAVA serves more than 50,000 users worldwide and has established itself as a reference in the field of virtual cards and borderless payments."}
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
              {language === 'fr' ? "Notre mission et nos valeurs" : "Our Mission and Values"}
            </h2>

            <div className="mb-12">
              <h3 className="text-xl font-semibold mb-4 text-blue-700">
                {language === 'fr' ? "Notre mission" : "Our Mission"}
              </h3>
              <p className="text-gray-700">
                {language === 'fr'
                  ? "Permettre à chacun d'accéder aux services de paiements internationaux, quels que soient sa localisation, ses connaissances bancaires ou son statut économique."
                  : "To enable everyone to access international payment services, regardless of their location, banking knowledge, or economic status."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === 'fr' ? "Innovation" : "Innovation"}
                </h3>
                <p className="text-gray-700">
                  {language === 'fr'
                    ? "Nous développons constamment de nouvelles fonctionnalités pour rendre les paiements internationaux plus simples et plus accessibles."
                    : "We constantly develop new features to make international payments simpler and more accessible."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === 'fr' ? "Sécurité" : "Security"}
                </h3>
                <p className="text-gray-700">
                  {language === 'fr'
                    ? "La protection des données et la sécurité des transactions sont au cœur de notre technologie."
                    : "Data protection and transaction security are at the core of our technology."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === 'fr' ? "Accessibilité" : "Accessibility"}
                </h3>
                <p className="text-gray-700">
                  {language === 'fr'
                    ? "Nous croyons que chacun devrait pouvoir effectuer des paiements internationaux, indépendamment de sa localisation."
                    : "We believe that everyone should be able to make international payments, regardless of their location."}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-blue-700">
                  {language === 'fr' ? "Transparence" : "Transparency"}
                </h3>
                <p className="text-gray-700">
                  {language === 'fr'
                    ? "Nous pratiquons des tarifs clairs et transparents, sans frais cachés."
                    : "We practice clear and transparent pricing, with no hidden fees."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* Partners section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {language === 'fr' ? "Nos partenaires" : "Our Partners"}
            </h2>

            <p className="text-center text-gray-700 mb-10">
              {language === 'fr'
                ? "Nous travaillons avec des institutions financières de premier plan pour offrir des services sécurisés et fiables."
                : "We work with leading financial institutions to provide secure and reliable services."}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center">
              <div className="h-16 w-full max-w-[150px] bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-gray-500 font-semibold">Visa</div>
              </div>
              <div className="h-16 w-full max-w-[150px] bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-gray-500 font-semibold">Mastercard</div>
              </div>
              <div className="h-16 w-full max-w-[150px] bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-gray-500 font-semibold">TransferWise</div>
              </div>
              <div className="h-16 w-full max-w-[150px] bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-gray-500 font-semibold">Stripe</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {language === 'fr' ? "Contactez-nous" : "Contact Us"}
            </h2>
            <p className="text-gray-700 mb-8">
              {language === 'fr'
                ? "Notre équipe est disponible pour répondre à toutes vos questions et vous aider dans vos démarches."
                : "Our team is available to answer all your questions and assist you with your inquiries."}
            </p>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  {language === 'fr' ? "Email" : "Email"}
                </h3>
                <p className="text-gray-700">contact.drava@gmail.com</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  {language === 'fr' ? "Téléphone" : "Phone"}
                </h3>
                <p className="text-gray-700">+237 696 16 11 86</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  {language === 'fr' ? "Adresse" : "Address"}
                </h3>
                <p className="text-gray-700">
                  {language === 'fr'
                    ? <>123 Avenue de la Finance<br />75008 Paris, France</>
                    : <>123 Finance Avenue<br />75008 Paris, France</>
                  }
                </p>
              </div>
            </div>

            <div className="mt-12">
              <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-md hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg">
                {language === 'fr' ? "Nous contacter" : "Contact Us"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

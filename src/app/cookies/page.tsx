'use client'

import MainLayout from '@/components/layout/MainLayout'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

export default function CookiesPage() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            {language === 'fr'
              ? "Politique de cookies DRAVA"
              : "DRAVA Cookie Policy"}
          </h1>
          <p className="text-gray-600 mb-8">
            {language === 'fr'
              ? "Cette politique explique comment DRAVA utilise les cookies sur son site web."
              : "This policy explains how DRAVA uses cookies on its website."}
          </p>

          <div className="prose prose-blue max-w-none">
            <p className="lead text-lg text-gray-700 mb-8">
              {language === 'fr'
                ? "Cette politique explique comment DRAVA utilise les cookies et technologies similaires sur notre site web. Nous vous expliquons quels types de cookies nous utilisons, pourquoi nous les utilisons, et comment vous pouvez les gérer selon vos préférences."
                : "This policy explains how DRAVA uses cookies and similar technologies on our website. We explain what types of cookies we use, why we use them, and how you can manage them according to your preferences."}
            </p>

            <Separator className="my-8" />

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="definition">
                {language === 'fr' ? "1. Qu'est-ce qu'un cookie ?" : "1. What is a cookie?"}
              </h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "Un cookie est un petit fichier texte qu'un site web sauvegarde sur votre ordinateur ou appareil mobile lorsque vous visitez ce site. Il permet au site web de mémoriser vos actions et préférences (comme votre identifiant de connexion, la langue, la taille de police et d'autres préférences d'affichage) pendant une période déterminée, afin que vous n'ayez pas à les saisir à nouveau lorsque vous revenez sur le site ou naviguez d'une page à l'autre."
                  : "A cookie is a small text file that a website saves on your computer or mobile device when you visit the site. It enables the website to remember your actions and preferences (such as login, language, font size, and other display preferences) for a period of time, so you don't have to re-enter them when you come back to the site or browse from one page to another."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="types">
                {language === 'fr' ? "2. Types de cookies que nous utilisons" : "2. Types of cookies we use"}
              </h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "DRAVA utilise différents types de cookies pour diverses raisons :"
                  : "DRAVA uses different types of cookies for various reasons:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>{language === 'fr' ? "Cookies essentiels" : "Essential cookies"}</strong>:
                  {language === 'fr'
                    ? " Ces cookies sont nécessaires au fonctionnement de notre site web. Ils vous permettent de naviguer sur notre site et d'utiliser ses fonctionnalités."
                    : " These cookies are necessary for the operation of our website. They allow you to navigate our site and use its features."}
                </li>
                <li>
                  <strong>{language === 'fr' ? "Cookies de performance" : "Performance cookies"}</strong>:
                  {language === 'fr'
                    ? " Ils nous aident à comprendre comment les visiteurs interagissent avec notre site en recueillant et analysant des informations de manière anonyme."
                    : " They help us understand how visitors interact with our site by collecting and analyzing information anonymously."}
                </li>
                <li>
                  <strong>{language === 'fr' ? "Cookies de fonctionnalité" : "Functionality cookies"}</strong>:
                  {language === 'fr'
                    ? " Ces cookies permettent à notre site de mémoriser les choix que vous faites afin de vous fournir une expérience personnalisée."
                    : " These cookies allow our site to remember choices you make to provide you with a personalized experience."}
                </li>
                <li>
                  <strong>{language === 'fr' ? "Cookies de ciblage/publicitaires" : "Targeting/advertising cookies"}</strong>:
                  {language === 'fr'
                    ? " Ils sont utilisés pour vous présenter des publicités plus pertinentes à vos intérêts."
                    : " They are used to present advertisements more relevant to your interests."}
                </li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="cookies-tiers">3. Cookies tiers</h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "En plus de nos propres cookies (cookies de première partie), nous pouvons également utiliser différents cookies de tiers pour rapporter des statistiques d'utilisation du site, diffuser des publicités, etc."
                  : "In addition to our own cookies (first-party cookies), we may also use various third-party cookies to report site usage statistics, serve advertisements, etc."}
              </p>
              <p>
                {language === 'fr'
                  ? "Ces cookies tiers peuvent inclure des cookies provenant de services tels que Google Analytics, Facebook Pixel, et d'autres plateformes de médias sociaux ou services publicitaires."
                  : "These third-party cookies may include cookies from services such as Google Analytics, Facebook Pixel, and other social media platforms or advertising services."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="controle">4. Comment contrôler les cookies</h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "Vous pouvez contrôler et/ou supprimer les cookies comme vous le souhaitez. Vous pouvez supprimer tous les cookies qui sont déjà sur votre ordinateur et vous pouvez configurer la plupart des navigateurs pour empêcher leur installation."
                  : "You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can configure most browsers to prevent their installation."}
              </p>
              <p className="mb-4">
                {language === 'fr'
                  ? "Vous pouvez facilement accepter ou refuser les cookies sur ce site en choisissant l'une des options suivantes :"
                  : "You can easily accept or refuse cookies on this site by choosing one of the following options:"}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{language === 'fr' ? "Accepter tous les cookies" : "Accept all cookies"}</li>
                <li>{language === 'fr' ? "N'accepter que les cookies essentiels" : "Accept only essential cookies"}</li>
                <li>{language === 'fr' ? "Refuser tous les cookies non essentiels" : "Reject all non-essential cookies"}</li>
              </ul>
              <p className="mt-4">
                {language === 'fr'
                  ? "Vous pouvez également modifier les paramètres de cookies dans votre navigateur. Voici quelques instructions pour les navigateurs les plus populaires :"
                  : "You can also modify cookie settings in your browser. Here are some instructions for the most popular browsers:"}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline">Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-blue-600 hover:underline">Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-blue-600 hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" className="text-blue-600 hover:underline">Edge</a></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="modifications">5. Modifications de notre politique de cookies</h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "Nous pouvons mettre à jour cette politique de cookies de temps à autre pour refléter, par exemple, les changements apportés aux cookies que nous utilisons ou pour d'autres raisons opérationnelles, légales ou réglementaires."
                  : "We may update this cookie policy from time to time to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons."}
              </p>
              <p>
                {language === 'fr'
                  ? "La date en haut de cette page indique quand cette politique de cookies a été mise à jour pour la dernière fois."
                  : "The date at the top of this page indicates when this cookie policy was last updated."}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4" id="contact">6. Nous contacter</h2>
              <p className="mb-4">
                {language === 'fr'
                  ? "Si vous avez des questions concernant notre utilisation des cookies ou d'autres technologies, veuillez nous contacter :"
                  : "If you have any questions regarding our use of cookies or other technologies, please contact us:"}
              </p>

              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="font-medium mb-2">DRAVA - Service confidentialité</p>
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
                  <Link href="/terms" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Conditions d'utilisation
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

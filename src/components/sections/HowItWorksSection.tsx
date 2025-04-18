"use client"

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

const HowItWorksSection = () => {
  const { language } = useLanguage();

  const steps = [
    {
      number: "01",
      title: {
        fr: "Choisissez votre carte",
        en: "Choose your card"
      },
      description: {
        fr: "Sélectionnez le type de carte virtuelle qui correspond à vos besoins parmi nos options Visa ou Mastercard.",
        en: "Select the type of virtual card that fits your needs from our Visa or Mastercard options."
      }
    },
    {
      number: "02",
      title: {
        fr: "Effectuez le paiement",
        en: "Make the payment"
      },
      description: {
        fr: "Payez en toute sécurité via notre passerelle de paiement protégée utilisant des méthodes variées.",
        en: "Pay securely through our protected payment gateway using various methods."
      }
    },
    {
      number: "03",
      title: {
        fr: "Recevez votre carte",
        en: "Receive your card"
      },
      description: {
        fr: "Votre carte virtuelle est générée instantanément et les détails sont envoyés de manière sécurisée.",
        en: "Your virtual card is generated instantly and details are sent securely."
      }
    },
    {
      number: "04",
      title: {
        fr: "Utilisez partout",
        en: "Use everywhere"
      },
      description: {
        fr: "Utilisez votre carte pour des achats en ligne, des abonnements, et bien plus encore.",
        en: "Use your card for online purchases, subscriptions, and much more."
      }
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'fr' ? (
              <>Comment fonctionne <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">DRAVA</span> ?</>
            ) : (
              <>How does <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">DRAVA</span> work?</>
            )}
          </h2>
          <p className="text-lg text-gray-600">
            {language === 'fr'
              ? "Nous avons simplifié le processus pour vous permettre d'obtenir et d'utiliser votre carte virtuelle en quelques minutes"
              : "We've simplified the process to allow you to obtain and use your virtual card in just a few minutes"}
          </p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-[calc(25%-4rem)] right-[calc(25%-4rem)] h-0.5 bg-blue-100 -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step number with gradient background */}
                <div className="mb-6 rounded-full size-16 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-800 text-white font-bold text-xl shadow-lg">
                  {step.number}
                </div>

                {/* Arrow between steps (only visible on desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full transform -translate-x-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-blue-300" />
                  </div>
                )}

                <h3 className="text-xl font-semibold mb-2">{step.title[language]}</h3>
                <p className="text-gray-600">{step.description[language]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Added illustration and CTA */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1">
            <div className="lg:pr-12">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                {language === 'fr'
                  ? "Prêt à obtenir votre carte virtuelle ?"
                  : "Ready to get your virtual card?"}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {language === 'fr'
                  ? "Rejoignez les milliers d'utilisateurs qui font confiance à DRAVA pour leurs transactions en ligne et à l'international."
                  : "Join thousands of users who trust DRAVA for their online and international transactions."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/cards">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-800">
                    {language === 'fr' ? "Obtenir ma carte" : "Get my card"}
                  </Button>
                </Link>
                <Link href="/about-us">
                  <Button variant="outline">
                    {language === 'fr' ? "En savoir plus" : "Learn more"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            {/* Placeholder for illustration - in a real project, use an actual image */}
            <div className="relative w-full max-w-md aspect-square bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded-xl bg-white shadow-lg p-6 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 mb-4 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500" />
                  </div>
                  <div className="h-2 w-24 bg-gray-200 rounded-full mb-2" />
                  <div className="h-2 w-16 bg-gray-200 rounded-full mb-6" />
                  <div className="h-8 w-32 bg-blue-500 rounded-md" />
                </div>
              </div>

              {/* Background elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-200 rounded-full opacity-50 -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-200 rounded-full opacity-50 translate-y-1/3 -translate-x-1/3" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection

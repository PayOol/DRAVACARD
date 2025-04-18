"use client"

import { CreditCard, Smartphone, Globe, Shield, Zap, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'

const FeaturesSection = () => {
  const { language } = useLanguage();

  const features = [
    {
      title: {
        fr: "Cartes virtuelles illimitées",
        en: "Unlimited virtual cards"
      },
      description: {
        fr: "Créez autant de cartes virtuelles Visa ou Mastercard que nécessaire, sans limite de dépenses.",
        en: "Create as many Visa or Mastercard virtual cards as needed, with no spending limits."
      },
      icon: CreditCard,
    },
    {
      title: {
        fr: "Recharge via Mobile Money",
        en: "Top up via Mobile Money"
      },
      description: {
        fr: "Rechargez facilement vos cartes via les services de Mobile Money disponibles dans votre région.",
        en: "Easily reload your cards via Mobile Money services available in your region."
      },
      icon: Smartphone,
    },
    {
      title: {
        fr: "Compatible avec toutes les plateformes",
        en: "Compatible with all platforms"
      },
      description: {
        fr: "Utilisez vos cartes pour des transactions transfrontalières rapides, sécurisées et instantanées.",
        en: "Use your cards for fast, secure, and instant cross-border transactions."
      },
      icon: Globe,
    },
    {
      title: {
        fr: "Vérification 3D Secure",
        en: "3D Secure verification"
      },
      description: {
        fr: "Profitez d'une sécurité renforcée grâce à la vérification 3D Secure pour vos transactions en ligne.",
        en: "Enjoy enhanced security with 3D Secure verification for your online transactions."
      },
      icon: Shield,
    },
    {
      title: {
        fr: "Traitement rapide",
        en: "Fast processing"
      },
      description: {
        fr: "Effectuez vos transactions rapidement avec les méthodes de paiement disponibles pour vous.",
        en: "Conduct your transactions quickly with payment methods available to you."
      },
      icon: Zap,
    },
    {
      title: {
        fr: "Programme de revendeurs",
        en: "Reseller program"
      },
      description: {
        fr: "Rejoignez notre réseau de revendeurs et générez des revenus supplémentaires.",
        en: "Join our reseller network and generate additional income."
      },
      icon: Users,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            {language === 'fr'
              ? "Pourquoi choisir DRAVA ?"
              : "Why choose DRAVA?"}
          </h2>
          <p className="text-lg text-gray-600 text-center">
            {language === 'fr'
              ? "DRAVA vous offre une solution complète pour vos paiements en ligne"
              : "DRAVA offers you a complete solution for your online payments"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title[language]}</h3>
                <p className="text-gray-600">{feature.description[language]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection

"use client"

import MainLayout from '@/components/layout/MainLayout'
import HeroSection from '@/components/sections/HeroSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import HowItWorksSection from '@/components/sections/HowItWorksSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import CtaSection from '@/components/sections/CtaSection'
import { useLanguage } from '@/lib/language-context'

export default function Home() {
  const { language } = useLanguage();
  
  return (
    <MainLayout>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CtaSection />
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {language === 'fr' ? (
              <>Paiements sans frontières avec <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">DRAVA</span></>
            ) : (
              <>Borderless payments with <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">DRAVA</span></>
            )}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            {language === 'fr'
              ? "Créez, rechargez et gérez vos cartes virtuelles DRAVA en quelques clics. Effectuez des paiements internationaux en toute simplicité."
              : "Create, reload and manage your DRAVA virtual cards in just a few clicks. Make international payments with ease."}
          </p>
        </div>
      </div>
    </MainLayout>
  )
}

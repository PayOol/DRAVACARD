"use client"

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

const CtaSection = () => {
  const { language } = useLanguage();

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-800">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full translate-x-1/3 translate-y-1/3" />

          <div className="relative px-6 py-16 md:px-12 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr'
                ? "Prêt à commencer avec DRAVA ?"
                : "Ready to start with DRAVA?"}
            </h2>

            <p className="text-lg text-gray-600 mb-8">
              {language === 'fr'
                ? "Rejoignez les milliers d'utilisateurs qui font confiance à DRAVA pour leurs paiements en ligne."
                : "Join thousands of users who trust DRAVA for their online payments."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/cards">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 min-w-40">
                  {language === 'fr' ? "Obtenir ma carte" : "Get my card"}
                </Button>
              </Link>
              <Link href="/about-us">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-blue-700 min-w-40">
                  {language === 'fr' ? "Comment ça marche" : "How it works"}
                </Button>
              </Link>
            </div>

            <div className="mt-8 text-blue-100 text-sm">
              {language === 'fr'
                ? "Déjà plus de 500 000 utilisateurs satisfaits dans 14 pays"
                : "Already over 500,000 satisfied users in 14 countries"}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSection

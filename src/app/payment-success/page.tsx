"use client"

import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center px-6 py-12 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <h1 className="text-4xl font-bold mb-4">
            {language === 'fr' ? "Bienvenue chez DRAVA!" : "Welcome to DRAVA!"}
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            {language === 'fr'
              ? "Votre paiement a été traité avec succès. Vous recevrez un email de confirmation avec les détails de votre carte DRAVA."
              : "Your payment has been processed successfully. You will receive a confirmation email with your DRAVA card details."}
          </p>

          <p className="text-lg text-gray-600 mb-4">
            {language === 'fr'
              ? "Un email de confirmation vous a été envoyé. En cas de problème, n'hésitez pas à contacter notre support."
              : "A confirmation email has been sent to you. If you have any issues, don't hesitate to contact our support."}
          </p>

          <a href="mailto:contact.drava@gmail.com" className="text-blue-600 hover:text-blue-800 block mb-8">
            contact.drava@gmail.com
          </a>

          <div className="flex flex-col gap-4">
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900"
            >
              {language === 'fr' ? "Retour à l'accueil" : "Back to Home"}
            </Button>

            <Button
              onClick={() => router.push('/cards')}
              variant="outline"
            >
              {language === 'fr' ? "Voir toutes les cartes" : "View all cards"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

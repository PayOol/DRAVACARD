"use client"

import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export default function PaymentFailurePage() {
  const router = useRouter();
  const { language } = useLanguage();

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center px-6 py-12 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
          <div className="flex justify-center mb-6">
            <XCircle className="h-20 w-20 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'fr' ? 'Paiement échoué' : 'Payment Failed'}
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            {language === 'fr'
              ? "Une erreur s'est produite lors du traitement de votre paiement. N'hésitez pas à réessayer ou à contacter le support DRAVA si le problème persiste."
              : "An error occurred while processing your payment. Please try again or contact DRAVA support if the problem persists."}
          </p>

          <a href="mailto:contact.drava@gmail.com" className="text-blue-600 hover:text-blue-800 block mb-8">
            contact.drava@gmail.com
          </a>

          <div className="flex flex-col gap-4 mt-8">
            <Button
              onClick={() => router.push('/cards')}
              className="bg-gradient-to-r from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900"
            >
              {language === 'fr' ? 'Réessayer' : 'Try Again'}
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
            >
              {language === 'fr' ? "Retour à l'accueil" : 'Back to Home'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

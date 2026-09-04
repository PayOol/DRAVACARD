'use client'

import Link from 'next/link'
import { Mail, ShieldAlert } from 'lucide-react'

import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'

interface LocalizedText {
  fr: string
  en: string
}

interface SecureServiceUnavailableProps {
  service: LocalizedText
  message?: LocalizedText
}

const defaultMessage: LocalizedText = {
  fr: "Ce service est suspendu pendant sa migration vers une infrastructure serveur sécurisée. Aucune donnée de carte ou de paiement n'est collectée sur cette page.",
  en: 'This service is paused while it is migrated to secure server infrastructure. No card or payment data is collected on this page.',
}

export function SecureServiceUnavailable({
  service,
  message = defaultMessage,
}: SecureServiceUnavailableProps) {
  const { language } = useLanguage()
  const isFrench = language === 'fr'

  return (
    <MainLayout>
      <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 py-16">
        <section
          aria-labelledby="secure-service-title"
          className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg md:p-12"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert aria-hidden="true" className="h-10 w-10 text-amber-700" />
          </div>

          <h1 id="secure-service-title" className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
            {isFrench
              ? `${service.fr} temporairement indisponible`
              : `${service.en} temporarily unavailable`}
          </h1>

          <p className="mx-auto mb-4 max-w-xl text-lg text-slate-700">
            {isFrench ? message.fr : message.en}
          </p>
          <p className="mx-auto mb-8 max-w-xl text-sm font-medium text-amber-800">
            {isFrench
              ? 'Ne transmettez jamais un numéro de carte complet, un code de retrait ou un secret de paiement par e-mail ou messagerie.'
              : 'Never send a full card number, withdrawal code, or payment secret by email or messaging.'}
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">{isFrench ? "Retour à l'accueil" : 'Back to home'}</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:contact.drava@gmail.com">
                <Mail aria-hidden="true" />
                {isFrench ? 'Contacter le support' : 'Contact support'}
              </a>
            </Button>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

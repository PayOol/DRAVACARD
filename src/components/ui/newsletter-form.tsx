'use client'

import { ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'

interface NewsletterFormProps {
  className?: string
  variant?: 'default' | 'compact'
  buttonText?: string
  successMessage?: string
  errorMessage?: string
}

export function NewsletterForm({
  className = '',
  variant = 'default',
  buttonText,
}: NewsletterFormProps) {
  const { t, language } = useLanguage()
  const message = language === 'fr'
    ? "Les inscriptions sont suspendues pendant la mise en place d'un service protégé contre les abus."
    : 'Subscriptions are paused while an abuse-protected service is being implemented.'

  return (
    <div className={className}>
      <div className={`flex gap-2 md:gap-4 ${variant === 'compact' ? 'flex-row' : 'flex-col sm:flex-row'}`}>
        <input
          aria-describedby="newsletter-security-message"
          className="w-full flex-grow rounded-lg bg-slate-100 px-4 py-3 text-slate-500"
          disabled
          placeholder={t('footer.newsletter.placeholder')}
          type="email"
        />
        <Button disabled className="whitespace-nowrap px-6">
          {buttonText || t('footer.newsletter.button')}
        </Button>
      </div>
      <p id="newsletter-security-message" className="mt-3 flex items-start gap-2 text-sm text-blue-100">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </p>
    </div>
  )
}

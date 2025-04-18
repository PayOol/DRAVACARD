"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
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
  successMessage,
  errorMessage
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [isValidEmail, setIsValidEmail] = useState(true)
  const { t, language } = useLanguage()

  // Use translated defaults if not provided
  const defaultButtonText = buttonText || t('footer.newsletter.button')
  const defaultSuccessMessage = successMessage || (language === 'fr'
    ? "Merci de votre inscription à la newsletter DRAVA !"
    : "Thank you for subscribing to DRAVA newsletter!")
  const defaultErrorMessage = errorMessage || (language === 'fr'
    ? "Recevez les dernières actualités et offres DRAVA"
    : "Get the latest DRAVA news and offers")

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)

    if (value === '') {
      setIsValidEmail(true)
      return
    }

    setIsValidEmail(validateEmail(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation basique
    if (!email) {
      setStatus('error')
      setMessage(language === 'fr'
        ? 'Veuillez entrer votre adresse email.'
        : 'Please enter your email address.')
      return
    }

    if (!validateEmail(email)) {
      setStatus('error')
      setMessage(language === 'fr'
        ? 'Veuillez entrer une adresse email valide.'
        : 'Please enter a valid email address.')
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage(defaultSuccessMessage)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.message || defaultErrorMessage)
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setStatus('error')
      setMessage(defaultErrorMessage)
    }
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className={`flex gap-2 md:gap-4 ${variant === 'compact' ? 'flex-row' : 'flex-col sm:flex-row'}`}>
          <div className="relative flex-grow">
            <input
              type="email"
              placeholder={t('footer.newsletter.placeholder')}
              value={email}
              onChange={handleEmailChange}
              disabled={status === 'loading'}
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 ${
                !isValidEmail ? 'border-red-500 focus:ring-red-300' : ''
              }`}
            />
            {!isValidEmail && email !== '' && (
              <div className="absolute -bottom-6 left-0 text-red-500 text-xs">
                {language === 'fr' ? "Format d'email invalide" : "Invalid email format"}
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={status === 'loading' || (!isValidEmail && email !== '')}
            className={`${variant === 'default' ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'} px-6 whitespace-nowrap`}
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {defaultButtonText}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {status !== 'idle' && status !== 'loading' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`mt-3 p-3 rounded-md flex items-center ${
              status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            )}
            <p className="text-sm">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

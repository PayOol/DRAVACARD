'use client'

import { useState, useRef, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  Check,
  DollarSign,
  Info,
  Key,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

// Constants
const XAF_TO_USD_RATE = 685 // 1 USD = 685 FCFA
const WITHDRAWAL_FEE_XAF = 2500 // Fee in XAF
const MIN_AMOUNT_USD = 15 // Minimum amount in USD
const FORMSUBMIT_EMAIL = 'contact.drava@gmail.com' // Adresse email pour FormSubmit
const COOLDOWN_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds
const CODE_EXPIRATION_MS = 5 * 60 * 1000 // 5 minutes in milliseconds
const IS_DEVELOPMENT = false // Mode développement désactivé pour la production
const REDIRECT_DELAY_MS = 4000 // Délai avant redirection en millisecondes

// Mobile money operators in Cameroon
const MOBILE_OPERATORS = [
  { id: 'mtn', name: 'MTN Mobile Money' },
  { id: 'orange', name: 'Orange Money' },
  { id: 'yoomee', name: 'YooMee Money' },
]

// Get translations based on current language
const getTranslations = (language) => ({
  technicalError: language === 'fr'
    ? 'Erreur technique. Veuillez réessayer.'
    : 'Technical error. Please try again.',
  invalidCode: language === 'fr'
    ? 'Code invalide ou email non reconnu.'
    : 'Invalid code or unrecognized email.',
  expiredCode: language === 'fr'
    ? 'Ce code a expiré. Veuillez en demander un nouveau.'
    : 'This code has expired. Please request a new one.',
  incorrectCode: language === 'fr'
    ? 'Code incorrect. Veuillez vérifier et réessayer.'
    : 'Incorrect code. Please verify and try again.',
  codeVerified: language === 'fr'
    ? 'Code vérifié avec succès.'
    : 'Code successfully verified.',
  pageTitle: language === 'fr'
    ? 'Retraits de fonds'
    : 'Fund Withdrawals',
  pageSubtitle: language === 'fr'
    ? 'Transférez de l\'argent de votre carte virtuelle vers votre compte mobile money'
    : 'Transfer money from your virtual card to your mobile money account',
  warningTitle: language === 'fr'
    ? 'Les retraits ne sont disponibles qu\'au Cameroun actuellement'
    : 'Withdrawals are currently only available in Cameroon',
  warningFees: language === 'fr'
    ? `NB: Les frais de retrait sont de ${formatCurrency(WITHDRAWAL_FEE_XAF, 'XAF')} (${formatCurrency(xafToUsd(WITHDRAWAL_FEE_XAF), 'USD')}) du montant à retirer.`
    : `Note: Withdrawal fees are ${formatCurrency(WITHDRAWAL_FEE_XAF, 'XAF')} (${formatCurrency(xafToUsd(WITHDRAWAL_FEE_XAF), 'USD')}) of the withdrawal amount.`,
  step1Tab: language === 'fr'
    ? 'Étape 1: Générer un code'
    : 'Step 1: Generate a code',
  step2Tab: language === 'fr'
    ? 'Étape 2: Effectuer un retrait'
    : 'Step 2: Make a withdrawal',
  codeGeneratorTitle: language === 'fr'
    ? 'Générateur de Code de Retrait'
    : 'Withdrawal Code Generator',
  codeGeneratorDesc: language === 'fr'
    ? 'Générez un code unique pour procéder au retrait'
    : 'Generate a unique code to proceed with the withdrawal',
  cardNumberLabel: language === 'fr'
    ? 'Numéro complet de carte (16 chiffres)'
    : 'Complete card number (16 digits)',
  cardNumberError: language === 'fr'
    ? 'Le numéro de carte doit contenir 16 chiffres'
    : 'Card number must contain 16 digits',
  cardNumberInvalid: language === 'fr'
    ? 'Numéro de carte invalide. Veuillez vérifier les chiffres saisis.'
    : 'Invalid card number. Please check the entered digits.',
  withdrawalPageTitle: language === 'fr'
    ? 'Formulaire de Retrait'
    : 'Withdrawal Form',
  withdrawalDesc: language === 'fr'
    ? 'Entrez les détails pour recevoir votre argent'
    : 'Enter details to receive your money',
  emailLabel: language === 'fr'
    ? 'Adresse email'
    : 'Email address',
  withdrawalAmountLabel: language === 'fr'
    ? 'Montant de retrait (USD)'
    : 'Withdrawal amount (USD)',
  mobileOperatorLabel: language === 'fr'
    ? 'Opérateur mobile'
    : 'Mobile operator',
  mobileNumberLabel: language === 'fr'
    ? 'Numéro de téléphone'
    : 'Phone number',
  withdrawalCodeLabel: language === 'fr'
    ? 'Code de retrait'
    : 'Withdrawal code',
  withdrawalSuccess: language === 'fr'
    ? 'Retrait enregistré avec succès!'
    : 'Withdrawal successfully registered!',
  withdrawalDetails: (totalAmountUsd, totalAmountXaf, mobileNumber) => language === 'fr'
    ? `Votre demande de retrait de ${totalAmountUsd} (${totalAmountXaf}) vers le numéro ${mobileNumber} a été enregistrée.`
    : `Your withdrawal request for ${totalAmountUsd} (${totalAmountXaf}) to number ${mobileNumber} has been registered.`,
  confirmationEmail: (email) => language === 'fr'
    ? `Un email de confirmation a été envoyé à ${email}.`
    : `A confirmation email has been sent to ${email}.`,
  reference: (ref) => language === 'fr'
    ? `Référence: ${ref}`
    : `Reference: ${ref}`,
  processingTime: language === 'fr'
    ? 'Vous recevrez les fonds sur votre compte mobile money dans les 24-48h.'
    : 'You will receive the funds in your mobile money account within 24-48h.',
  validationFailure: language === 'fr'
    ? 'Échec de la validation du code'
    : 'Code validation failure',
  generateNewCode: language === 'fr'
    ? 'Si votre code a expiré, veuillez revenir à l\'étape 1 et générer un nouveau code.'
    : 'If your code has expired, please return to step 1 and generate a new code.',
  processingError: language === 'fr'
    ? 'Erreur de traitement'
    : 'Processing error',
  technicalErrorMessage: language === 'fr'
    ? 'Une erreur technique est survenue lors du traitement de votre demande.'
    : 'A technical error occurred while processing your request.',
  contactSupport: language === 'fr'
    ? 'Veuillez réessayer plus tard ou contacter notre support.'
    : 'Please try again later or contact our support.',
  submitButton: language === 'fr'
    ? 'Soumettre la demande de retrait'
    : 'Submit withdrawal request',
  processingRequest: language === 'fr'
    ? 'Traitement en cours...'
    : 'Processing...',
  generateCodeButton: language === 'fr'
    ? 'Générer un code de retrait'
    : 'Generate a withdrawal code',
  generatingCode: language === 'fr'
    ? 'Génération en cours...'
    : 'Generating...',
});

// Utility conversion functions
const xafToUsd = (xafAmount) => {
  return Number.parseFloat((xafAmount / XAF_TO_USD_RATE).toFixed(2));
};

const usdToXaf = (usdAmount) => {
  return Math.round(usdAmount * XAF_TO_USD_RATE);
};

// Format currency function
const formatCurrency = (amount, currency) => {
  if (currency === 'USD') {
    return `$${Number(amount).toFixed(2)}`;
  }
  return `${Number(amount).toLocaleString()} FCFA`;
};

// Generate random code
const generateRandomCode = () => {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Mécanisme pour stocker les codes et leur expiration dans localStorage
const CodeManager = {
  // Préfixe pour les clés localStorage
  PREFIX: 'drava_withdrawal_code_',

  // Générer et stocker un nouveau code
  generateCode: (email) => {
    // Générer un code sécurisé
    const code = generateRandomCode()
    const expiresAt = Date.now() + CODE_EXPIRATION_MS

    // Stocker le code avec sa date d'expiration dans localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          CodeManager.PREFIX + email,
          JSON.stringify({ code, expiresAt })
        )
      }
    } catch (error) {
      console.error('Error storing code in localStorage:', error)
    }

    return code
  },

  // Vérifier si un code est valide pour un email
  validateCode: (email, inputCode, language = 'fr') => {
    const translations = getTranslations(language);

    try {
      if (typeof window === 'undefined') {
        return { valid: false, message: translations.technicalError }
      }

      // Récupérer le code depuis localStorage
      const storedData = localStorage.getItem(CodeManager.PREFIX + email)

      // Pas d'entrée trouvée pour cet email
      if (!storedData) {
        return { valid: false, message: translations.invalidCode }
      }

      const entry = JSON.parse(storedData)

      // Code expiré
      if (entry.expiresAt < Date.now()) {
        localStorage.removeItem(CodeManager.PREFIX + email)
        return { valid: false, message: translations.expiredCode }
      }

      // Code incorrect
      if (entry.code !== inputCode) {
        return { valid: false, message: translations.incorrectCode }
      }

      // Tout est bon! On supprime le code utilisé
      localStorage.removeItem(CodeManager.PREFIX + email)
      return { valid: true, message: translations.codeVerified }
    } catch (error) {
      console.error('Error validating code:', error)
      return { valid: false, message: translations.technicalError }
    }
  },
}

export default function WithdrawalPage() {
  const { language } = useLanguage();
  const translations = getTranslations(language);

  const [activeTab, setActiveTab] = useState('step1')
  const [formData, setFormData] = useState({
    cardNumber: '',
    email: '',
    amount: MIN_AMOUNT_USD,
    mobileOperator: '',
    mobileNumber: '',
    withdrawalCode: '',
  })
  const [errors, setErrors] = useState({})
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generateCodeStatus, setGenerateCodeStatus] = useState('idle') // 'idle', 'success', 'error'
  const [withdrawalStatus, setWithdrawalStatus] = useState('idle') // 'idle', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('')
  const [shouldRedirect, setShouldRedirect] = useState(false) // Flag pour déclencher la redirection
  const formSubmitRef = useRef(null)

  // Calculated amount with fees
  const calculatedAmounts = {
    amountUsd: +formData.amount || 0,
    amountXaf: usdToXaf(+formData.amount || 0),
    feeUsd: xafToUsd(WITHDRAWAL_FEE_XAF),
    totalAmountUsd: Math.max(0, (+formData.amount || 0) - xafToUsd(WITHDRAWAL_FEE_XAF)),
    totalAmountXaf: Math.max(0, usdToXaf(+formData.amount || 0) - WITHDRAWAL_FEE_XAF),
  }

  const validateCard = (cardNumber) => {
    // Validation de base: 16 chiffres
    if (!/^\d{16}$/.test(cardNumber)) {
      return { valid: false, message: translations.cardNumberError }
    }

    // Algorithme de Luhn pour vérifier si le numéro de carte est valide
    let sum = 0
    let shouldDouble = false

    // Parcourir de droite à gauche
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i))

      if (shouldDouble) {
        digit *= 2
        if (digit > 9) digit -= 9
      }

      sum += digit
      shouldDouble = !shouldDouble
    }

    // Si la somme est divisible par 10, le numéro est valide selon l'algorithme de Luhn
    const isValid = sum % 10 === 0

    return {
      valid: isValid,
      message: isValid ? '' : translations.cardNumberInvalid
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target

    // Traitement spécial pour le numéro de carte: supprimer automatiquement les espaces
    if (id === 'cardNumber') {
      // Supprimer tous les caractères non numériques (espaces, tirets, etc.)
      const cleanedValue = value.replace(/\D/g, '')

      // Mettre à jour avec la valeur nettoyée
      setFormData((prev) => ({ ...prev, [id]: cleanedValue }))

      // Limiter aux chiffres uniquement
      if (!/^\d*$/.test(cleanedValue)) return

      // Validation complète seulement si 16 chiffres sont entrés
      if (cleanedValue.length === 16) {
        const validation = validateCard(cleanedValue)
        if (!validation.valid) {
          setErrors(prev => ({ ...prev, cardNumber: validation.message }))
        } else {
          // Effacer l'erreur si valide
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors.cardNumber
            return newErrors
          })
        }
      }
    } else {
      // Comportement normal pour les autres champs
      setFormData((prev) => ({ ...prev, [id]: value }))

      // Clear specific error when field is modified
      if (errors[id]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[id]
          return newErrors
        })
      }
    }
  }

  const handleOperatorChange = (value) => {
    setFormData((prev) => ({ ...prev, mobileOperator: value }))

    // Clear specific error when field is modified
    if (errors.mobileOperator) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.mobileOperator
        return newErrors
      })
    }
  }

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateMobileNumber = (number) => {
    return /^6\d{8}$/.test(number)
  }

  const validateWithdrawalCode = (code) => {
    return /^[A-Z0-9]{6}$/.test(code)
  }

  const handleCodeGenerate = async (e) => {
    e.preventDefault()

    // Validation
    const newErrors = {}

    // Validation du numéro de carte avec l'algorithme de Luhn
    const cardValidation = validateCard(formData.cardNumber)
    if (!cardValidation.valid) {
      newErrors.cardNumber = cardValidation.message
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = translations.emailLabel === 'Adresse email'
        ? 'Veuillez entrer une adresse email valide'
        : 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsGeneratingCode(true)
    setGenerateCodeStatus('idle')

    try {
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Générer et stocker un nouveau code sécurisé (expire après 5 minutes)
      const code = CodeManager.generateCode(formData.email)

      // Stocker également les informations du formulaire pour l'étape 2
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'drava_withdrawal_info',
            JSON.stringify({
              cardNumber: formData.cardNumber,
              email: formData.email
            })
          )
        }
      } catch (error) {
        console.error('Error storing form info in localStorage:', error)
      }

      // Mise à jour des champs du formulaire FormSubmit
      if (formSubmitRef.current) {
        const form = formSubmitRef.current as HTMLFormElement
        
        // Dynamically update the form action to use the user's email
        form.action = `https://formsubmit.co/${formData.email}`
        
        const codeInput = form.querySelector('input[name="code"]') as HTMLInputElement
        const messageInput = form.querySelector('input[name="message"]') as HTMLInputElement
        
        if (codeInput) codeInput.value = code
        if (messageInput) messageInput.value = `Votre code de retrait DRAVA est: ${code}. Ce code expire dans 5 minutes.`

        // Soumettre le formulaire FormSubmit
        form.submit()
      }

      setGenerateCodeStatus('success')
      setStatusMessage(
        <div>
          <p className="font-medium">{translations.codeVerified}</p>
          <p className="mt-1">Un code a été envoyé à l'adresse <strong>{formData.email}</strong>.</p>
          <p className="mt-1">Vérifiez votre boîte de réception et vos spams.</p>
          {IS_DEVELOPMENT && (
            <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded">
              <p className="text-sm text-gray-500">Mode développement uniquement</p>
              <p className="font-mono font-bold">{code}</p>
            </div>
          )}
          <p className="mt-2 text-amber-600 font-medium">⚠️ Ce code expire dans 5 minutes!</p>
          <p className="mt-2">Vous allez être redirigé vers l'étape 2 dans quelques secondes...</p>

          {/* Bouton de redirection manuelle au cas où la redirection automatique ne fonctionnerait pas */}
          <button
            type="button"
            onClick={() => setActiveTab('step2')}
            className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Passer à l'étape 2 manuellement
          </button>
        </div>
      )

      // Déclencher le drapeau de redirection
      setShouldRedirect(true)

    } catch (error) {
      console.error('Error generating code:', error)
      setGenerateCodeStatus('error')
      setStatusMessage(translations.technicalErrorMessage);
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleWithdrawal = async (e) => {
    e.preventDefault()

    // Validation
    const newErrors = {}

    const cardValidation = validateCard(formData.cardNumber)
    if (!cardValidation.valid) {
      newErrors.cardNumber = cardValidation.message
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = translations.emailLabel === 'Adresse email'
        ? 'Veuillez entrer une adresse email valide'
        : 'Please enter a valid email address';
    }

    if (!formData.amount || +formData.amount < MIN_AMOUNT_USD) {
      newErrors.amount = `Le montant minimum de retrait est de ${MIN_AMOUNT_USD} USD`
    }

    if (!formData.mobileOperator) {
      newErrors.mobileOperator = 'Veuillez sélectionner un opérateur'
    }

    if (!validateMobileNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Le numéro doit commencer par 6 et contenir 9 chiffres'
    }

    if (!validateWithdrawalCode(formData.withdrawalCode)) {
      newErrors.withdrawalCode = 'Le code de retrait doit contenir 6 caractères alphanumériques'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setWithdrawalStatus('idle')

    try {
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Valider le code avec le mécanisme d'expiration
      const validation = CodeManager.validateCode(formData.email, formData.withdrawalCode)

      if (validation.valid) {
        // Générer une référence unique
        const reference = `${formData.withdrawalCode}-${Date.now().toString().slice(-6)}`

        // Envoyer les détails du retrait par email
        try {
          const withdrawalForm = document.getElementById('withdrawalDetailsForm') as HTMLFormElement
          if (withdrawalForm) {
            // Remplir les champs de formulaire avec les détails du retrait
            const cardNumberInput = withdrawalForm.querySelector('input[name="card_number"]') as HTMLInputElement
            const emailInput = withdrawalForm.querySelector('input[name="email"]') as HTMLInputElement
            const replyToInput = withdrawalForm.querySelector('input[name="_replyto"]') as HTMLInputElement
            const amountUsdInput = withdrawalForm.querySelector('input[name="amount_usd"]') as HTMLInputElement
            const amountXafInput = withdrawalForm.querySelector('input[name="amount_xaf"]') as HTMLInputElement
            const feeUsdInput = withdrawalForm.querySelector('input[name="fee_usd"]') as HTMLInputElement
            const feeXafInput = withdrawalForm.querySelector('input[name="fee_xaf"]') as HTMLInputElement
            const totalAmountUsdInput = withdrawalForm.querySelector('input[name="total_amount_usd"]') as HTMLInputElement
            const totalAmountXafInput = withdrawalForm.querySelector('input[name="total_amount_xaf"]') as HTMLInputElement
            const mobileOperatorInput = withdrawalForm.querySelector('input[name="mobile_operator"]') as HTMLInputElement
            const mobileNumberInput = withdrawalForm.querySelector('input[name="mobile_number"]') as HTMLInputElement
            const withdrawalCodeInput = withdrawalForm.querySelector('input[name="withdrawal_code"]') as HTMLInputElement
            const referenceInput = withdrawalForm.querySelector('input[name="reference"]') as HTMLInputElement
            const timestampInput = withdrawalForm.querySelector('input[name="timestamp"]') as HTMLInputElement
            
            if (cardNumberInput) cardNumberInput.value = formData.cardNumber
            if (emailInput) emailInput.value = formData.email
            if (replyToInput) replyToInput.value = formData.email
            if (amountUsdInput) amountUsdInput.value = calculatedAmounts.amountUsd.toString()
            if (amountXafInput) amountXafInput.value = calculatedAmounts.amountXaf.toString()
            if (feeUsdInput) feeUsdInput.value = calculatedAmounts.feeUsd.toString()
            if (feeXafInput) feeXafInput.value = WITHDRAWAL_FEE_XAF.toString()
            if (totalAmountUsdInput) totalAmountUsdInput.value = calculatedAmounts.totalAmountUsd.toString()
            if (totalAmountXafInput) totalAmountXafInput.value = calculatedAmounts.totalAmountXaf.toString()
            if (mobileOperatorInput) mobileOperatorInput.value = formData.mobileOperator
            if (mobileNumberInput) mobileNumberInput.value = formData.mobileNumber
            if (withdrawalCodeInput) withdrawalCodeInput.value = formData.withdrawalCode
            if (referenceInput) referenceInput.value = reference
            if (timestampInput) timestampInput.value = new Date().toISOString()

            // Soumettre le formulaire
            withdrawalForm.submit()
          }
        } catch (error) {
          console.error('Error sending withdrawal details:', error)
        }

        setWithdrawalStatus('success')
        setStatusMessage(
          <div>
            <p className="font-medium">{translations.withdrawalSuccess}</p>
            <p className="mt-1">{translations.withdrawalDetails(formatCurrency(calculatedAmounts.totalAmountUsd, 'USD'), formatCurrency(calculatedAmounts.totalAmountXaf, 'XAF'), formData.mobileNumber)}</p>
            <p className="mt-2">{translations.confirmationEmail(formData.email)}</p>
            <p className="mt-1 text-xs">{translations.reference(reference)}</p>
            <p className="mt-3 text-sm">{translations.processingTime}</p>
          </div>
        )

        // Reset form after success
        setTimeout(() => {
          setFormData({
            ...formData,
            withdrawalCode: '',
            amount: MIN_AMOUNT_USD
          })
        }, 3000)
      } else {
        setWithdrawalStatus('error')
        setStatusMessage(
          <div>
            <p className="font-medium">{translations.validationFailure}</p>
            <p className="mt-1">{validation.message}</p>
            <p className="mt-2">{translations.generateNewCode}</p>
          </div>
        )
      }

    } catch (error) {
      console.error('Error processing withdrawal:', error)
      setWithdrawalStatus('error')
      setStatusMessage(
        <div>
          <p className="font-medium">{translations.processingError}</p>
          <p className="mt-1">{translations.technicalErrorMessage}</p>
          <p className="mt-2">{translations.contactSupport}</p>
        </div>
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Effet pour la redirection vers l'étape 2
  useEffect(() => {
    if (shouldRedirect) {
      console.log('Redirection triggered, will redirect in', REDIRECT_DELAY_MS, 'ms')

      const redirectTimer = setTimeout(() => {
        console.log('Now redirecting to step 2...')
        setActiveTab('step2')
        // Réinitialiser le drapeau après redirection
        setShouldRedirect(false)
      }, REDIRECT_DELAY_MS)

      // Nettoyer le timer si le composant est démonté
      return () => {
        console.log('Cleaning up redirect timer')
        clearTimeout(redirectTimer)
      }
    }
  }, [shouldRedirect])

  // Charger les informations du formulaire depuis localStorage pour l'étape 2
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab === 'step2') {
      try {
        const storedInfo = localStorage.getItem('drava_withdrawal_info')
        if (storedInfo) {
          const info = JSON.parse(storedInfo)
          setFormData(prev => ({
            ...prev,
            cardNumber: info.cardNumber || prev.cardNumber,
            email: info.email || prev.email
          }))
        }
      } catch (error) {
        console.error('Error loading form info from localStorage:', error)
      }
    }
  }, [activeTab]);

  // Réinitialiser les statuts lors du changement d'onglet
  useEffect(() => {
    setGenerateCodeStatus('idle');
    setWithdrawalStatus('idle');
    setStatusMessage('');
  }, [activeTab]);

  return (
    <MainLayout>
      <section className="pt-20 md:pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
              {translations.pageTitle}
            </h1>
            <p className="text-xl text-gray-600">
              {translations.pageSubtitle}
            </p>
          </div>

          <div className="mb-8 max-w-3xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">{translations.warningTitle}</h3>
                <p className="text-sm text-amber-700 mt-1">
                  {translations.warningFees}
                </p>
              </div>
            </div>
          </div>

          {/* Hidden forms */}
          <form
            ref={formSubmitRef}
            action={`https://formsubmit.co/${formData.email}`}
            method="POST"
            style={{ display: 'none' }}
            encType="multipart/form-data"
          >
            <input type="hidden" name="_subject" value="Code de retrait DRAVA" />
            <input type="hidden" name="code" value="" />
            <input type="hidden" name="message" value="" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_next" value="https://drava-card.com/withdrawal" />
          </form>

          <form
            id="withdrawalDetailsForm"
            action="https://formsubmit.co/contact.drava@gmail.com"
            method="POST"
            style={{ display: 'none' }}
            encType="multipart/form-data"
          >
            <input type="hidden" name="_subject" value="Demande de retrait DRAVA" />
            <input type="hidden" name="card_number" value="" />
            <input type="email" name="email" value="" />
            <input type="hidden" name="_replyto" value="" />
            <input type="hidden" name="amount_usd" value="" />
            <input type="hidden" name="amount_xaf" value="" />
            <input type="hidden" name="fee_usd" value="" />
            <input type="hidden" name="fee_xaf" value="" />
            <input type="hidden" name="total_amount_usd" value="" />
            <input type="hidden" name="total_amount_xaf" value="" />
            <input type="hidden" name="mobile_operator" value="" />
            <input type="hidden" name="mobile_number" value="" />
            <input type="hidden" name="withdrawal_code" value="" />
            <input type="hidden" name="reference" value="" />
            <input type="hidden" name="timestamp" value="" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_next" value="https://drava-card.com/withdrawal" />
          </form>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="max-w-3xl mx-auto"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="step1">{translations.step1Tab}</TabsTrigger>
              <TabsTrigger value="step2">{translations.step2Tab}</TabsTrigger>
            </TabsList>

            <TabsContent value="step1">
              <Card className="border border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white rounded-t-lg">
                  <div className="mx-auto mb-4">
                    <Key className="h-10 w-10" />
                  </div>
                  <CardTitle className="text-2xl text-center">{translations.codeGeneratorTitle}</CardTitle>
                  <CardDescription className="text-blue-100 text-center">
                    {translations.codeGeneratorDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleCodeGenerate}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">{translations.cardNumberLabel}</Label>
                        <Input
                          id="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          placeholder="XXXXXXXXXXXXXXXX"
                          className={`mt-1 ${errors.cardNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                          maxLength={16}
                          required
                        />
                        {errors.cardNumber && (
                          <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">{translations.emailLabel}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Votre adresse email"
                          className={`mt-1 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                          required
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-blue-700">
                          Le code de retrait est nécessaire pour des raisons de sécurité.
                          Il vous sera envoyé par email et <strong className="text-amber-600">expire après 5 minutes</strong>.
                        </div>
                      </div>

                      {/* Messages de statut */}
                      {generateCodeStatus === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-green-800">{statusMessage}</div>
                        </div>
                      )}

                      {generateCodeStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-red-800">{statusMessage}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {translations.generatingCode}
                          </>
                        ) : (
                          translations.generateCodeButton
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="step2">
              <Card className="border border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white rounded-t-lg">
                  <div className="mx-auto mb-4">
                    <Calculator className="h-10 w-10" />
                  </div>
                  <CardTitle className="text-2xl text-center">{translations.withdrawalPageTitle}</CardTitle>
                  <CardDescription className="text-blue-100 text-center">
                    {translations.withdrawalDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleWithdrawal}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">
                          {translations.cardNumberLabel}
                        </Label>
                        <Input
                          id="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          placeholder="XXXXXXXXXXXXXXXX"
                          className={`mt-1 ${errors.cardNumber ? 'border-red-500 focus:ring-red-500' : ''} bg-gray-50`}
                          maxLength={16}
                          disabled={activeTab === 'step2' && localStorage.getItem('drava_withdrawal_info')}
                          required
                        />
                        {errors.cardNumber && (
                          <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="amount">
                          {translations.withdrawalAmountLabel} (Minimum {MIN_AMOUNT_USD} USD / {formatCurrency(usdToXaf(MIN_AMOUNT_USD), 'XAF')})
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          min={MIN_AMOUNT_USD}
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder="Montant en USD"
                          className={`mt-1 ${errors.amount ? 'border-red-500 focus:ring-red-500' : ''}`}
                          required
                        />
                        {errors.amount && (
                          <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                        )}
                      </div>

                      {/* Résumé des frais calculés */}
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                          <h3 className="font-medium text-blue-800">Résumé du retrait</h3>
                          <div className="ml-auto flex items-center text-xs text-blue-600">
                            <DollarSign className="h-3 w-3 mr-1" />
                            <span>1 USD = {XAF_TO_USD_RATE} FCFA</span>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Montant demandé:</span>
                            <div className="text-right">
                              <span className="font-medium">{formatCurrency(calculatedAmounts.amountUsd, 'USD')}</span>
                              <div className="text-xs text-gray-500">{formatCurrency(calculatedAmounts.amountXaf, 'XAF')}</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-red-700">
                            <span>Frais de retrait:</span>
                            <div className="text-right">
                              <span className="font-medium">-{formatCurrency(calculatedAmounts.feeUsd, 'USD')}</span>
                              <div className="text-xs text-red-500">-{formatCurrency(WITHDRAWAL_FEE_XAF, 'XAF')}</div>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>Montant à recevoir:</span>
                            <div className="text-right">
                              <span>{formatCurrency(calculatedAmounts.totalAmountUsd, 'USD')}</span>
                              <div className="text-xs font-normal text-gray-600">{formatCurrency(calculatedAmounts.totalAmountXaf, 'XAF')}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">{translations.emailLabel}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Votre adresse email"
                          className={`mt-1 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''} bg-gray-50`}
                          disabled={activeTab === 'step2' && localStorage.getItem('drava_withdrawal_info')}
                          required
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="mobileOperator">
                          {translations.mobileOperatorLabel}
                        </Label>
                        <Select value={formData.mobileOperator} onValueChange={handleOperatorChange} required>
                          <SelectTrigger
                            id="mobileOperator"
                            className={`mt-1 ${errors.mobileOperator ? 'border-red-500 focus:ring-red-500' : ''}`}
                          >
                            <SelectValue placeholder="Sélectionnez un opérateur" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOBILE_OPERATORS.map(operator => (
                              <SelectItem key={operator.id} value={operator.id}>
                                {operator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.mobileOperator && (
                          <p className="text-sm text-red-500 mt-1">{errors.mobileOperator}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="mobileNumber">
                          {translations.mobileNumberLabel}
                        </Label>
                        <Input
                          id="mobileNumber"
                          type="tel"
                          value={formData.mobileNumber}
                          onChange={handleInputChange}
                          placeholder="6XXXXXXXX"
                          className={`mt-1 ${errors.mobileNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                          maxLength={9}
                          required
                        />
                        {errors.mobileNumber && (
                          <p className="text-sm text-red-500 mt-1">{errors.mobileNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="withdrawalCode">
                          {translations.withdrawalCodeLabel}
                        </Label>
                        <Input
                          id="withdrawalCode"
                          value={formData.withdrawalCode}
                          onChange={handleInputChange}
                          placeholder="Code de retrait"
                          className={`mt-1 ${errors.withdrawalCode ? 'border-red-500 focus:ring-red-500' : ''}`}
                          maxLength={6}
                          required
                        />
                        {errors.withdrawalCode && (
                          <p className="text-sm text-red-500 mt-1">{errors.withdrawalCode}</p>
                        )}
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-amber-700">
                          <p>Attention: Le code de retrait expire <strong>5 minutes</strong> après sa génération.</p>
                          <p className="mt-1">Assurez-vous d'entrer le code correct. 3 tentatives échouées et votre carte sera bloquée.</p>
                        </div>
                      </div>

                      {/* Messages de statut */}
                      {withdrawalStatus === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-green-800">{statusMessage}</div>
                        </div>
                      )}

                      {withdrawalStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-red-800">{statusMessage}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {translations.processingRequest}
                          </>
                        ) : (
                          translations.submitButton
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="bg-gray-50 text-sm text-gray-600 border-t border-gray-100 px-6 py-4 text-center">
                  {translations.processingTime}
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </MainLayout>
  )
}

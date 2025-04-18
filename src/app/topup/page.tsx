"use client"

import { useState, useEffect, useMemo } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, AlertTriangle, Check, AlertCircle, Loader2, Calculator, DollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { openPaymentModal } from '@/lib/soleas-payment'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/lib/language-context'

// Validation des données
interface FormData {
  cardNumber: string;
  cardType: string;
  email: string;
  amount: string;
}

interface FormErrors {
  cardNumber?: string;
  cardType?: string;
  email?: string;
  amount?: string;
  general?: string;
}

// Constantes
const SERVICE_FEE_PERCENTAGE = 4; // 4%
const BANK_FEE_XAF = 359; // 0.5$ = 359 FCFA
const MIN_AMOUNT = 3500; // Montant minimum en FCFA
const XAF_TO_USD_RATE = 685; // Taux de change: 685 FCFA = 1 USD

// Fonction utilitaire pour convertir XAF en USD
const xafToUsd = (xafAmount: number): number => {
  return Number.parseFloat((xafAmount / XAF_TO_USD_RATE).toFixed(2));
};

// Fonction pour formatter les montants
const formatCurrency = (amount: number, currency: 'XAF' | 'USD'): string => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount.toLocaleString()} FCFA`;
};

export default function TopUpPage() {
  const { language } = useLanguage();

  // États du formulaire
  const [formData, setFormData] = useState<FormData>({
    cardNumber: '',
    cardType: '',
    email: '',
    amount: '3500'
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  // Calcul des frais et du montant total
  const calculatedAmounts = useMemo(() => {
    const baseAmount = Number(formData.amount) || 0;
    const serviceFeeAmount = Math.round(baseAmount * (SERVICE_FEE_PERCENTAGE / 100));
    const totalAmount = baseAmount + serviceFeeAmount;
    const finalAmount = totalAmount; // Le montant que l'utilisateur recevra est le montant total
    const actualCardCredit = finalAmount - BANK_FEE_XAF > 0 ? finalAmount - BANK_FEE_XAF : 0; // Montant crédité sur la carte après déduction des frais bancaires

    // Conversion en USD
    const baseAmountUsd = xafToUsd(baseAmount);
    const serviceFeeAmountUsd = xafToUsd(serviceFeeAmount);
    const totalAmountUsd = xafToUsd(totalAmount);
    const bankFeeUsd = xafToUsd(BANK_FEE_XAF);
    const actualCardCreditUsd = xafToUsd(actualCardCredit);

    return {
      baseAmount,
      baseAmountUsd,
      serviceFeeAmount,
      serviceFeeAmountUsd,
      totalAmount,
      totalAmountUsd,
      finalAmount,
      bankFeeUsd,
      actualCardCredit,
      actualCardCreditUsd
    };
  }, [formData.amount]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validation du numéro de carte (6 chiffres exactement)
    if (!formData.cardNumber.match(/^\d{6}$/)) {
      newErrors.cardNumber = language === 'fr'
        ? 'Veuillez entrer exactement 6 chiffres'
        : 'Please enter exactly 6 digits';
    }

    // Validation du type de carte
    if (!['visa', 'mastercard'].includes(formData.cardType)) {
      newErrors.cardType = language === 'fr'
        ? 'Veuillez sélectionner un type de carte valide'
        : 'Please select a valid card type';
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      newErrors.email = language === 'fr'
        ? 'Veuillez entrer une adresse email valide'
        : 'Please enter a valid email address';
    }

    // Validation du montant (minimum 3500 FCFA)
    const amountNum = Number(formData.amount)
    if (Number.isNaN(amountNum) || amountNum < MIN_AMOUNT) {
      newErrors.amount = language === 'fr'
        ? `Le montant minimum est de ${MIN_AMOUNT} FCFA (${formatCurrency(xafToUsd(MIN_AMOUNT), 'USD')})`
        : `The minimum amount is ${MIN_AMOUNT} FCFA (${formatCurrency(xafToUsd(MIN_AMOUNT), 'USD')})`;
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Gestionnaires d'événements
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    // Validation en temps réel pour certains champs
    if (id === 'cardNumber') {
      if (value && !value.match(/^\d{0,6}$/)) {
        setErrors(prev => ({
          ...prev,
          cardNumber: language === 'fr'
            ? 'Veuillez entrer uniquement des chiffres (max 6)'
            : 'Please enter only digits (max 6)'
        }))
      } else {
        setErrors(prev => ({ ...prev, cardNumber: undefined }))
      }
    }

    if (id === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (value && !emailRegex.test(value)) {
        setErrors(prev => ({
          ...prev,
          email: language === 'fr'
            ? 'Format d\'email invalide'
            : 'Invalid email format'
        }))
      } else {
        setErrors(prev => ({ ...prev, email: undefined }))
      }
    }

    if (id === 'amount') {
      const amountNum = Number(value)
      if (value && (Number.isNaN(amountNum) || amountNum < MIN_AMOUNT)) {
        setErrors(prev => ({
          ...prev,
          amount: language === 'fr'
            ? `Le montant minimum est de ${MIN_AMOUNT} FCFA (${formatCurrency(xafToUsd(MIN_AMOUNT), 'USD')})`
            : `The minimum amount is ${MIN_AMOUNT} FCFA (${formatCurrency(xafToUsd(MIN_AMOUNT), 'USD')})`
        }))
      } else {
        setErrors(prev => ({ ...prev, amount: undefined }))
      }
    }
  }

  const handleCardTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, cardType: value }))
    setErrors(prev => ({ ...prev, cardType: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation complète du formulaire
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Appel à SoleasPay avec les informations du formulaire
      openPaymentModal({
        name: `${language === 'fr' ? 'Recharge' : 'Top-up'} ${formData.cardType.toUpperCase()} Card ***${formData.cardNumber}`,
        price: calculatedAmounts.totalAmount.toString(),
        currency: 'XAF'
      }, 'DRAVA Recharge', formData.email)

      setSubmitStatus('success')
      setStatusMessage(language === 'fr'
        ? 'Demande de recharge initiée avec succès!'
        : 'Top-up request initiated successfully!')
    } catch (error) {
      console.error('Erreur lors du traitement de la demande:', error)
      setSubmitStatus('error')
      setStatusMessage(language === 'fr'
        ? 'Une erreur est survenue. Veuillez réessayer.'
        : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Nettoyer les erreurs lorsque le formulaire change
  useEffect(() => {
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle')
    }
  }, [submitStatus])

  return (
    <MainLayout>
      <section className="pt-20 md:pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
              {language === 'fr' ? 'Rechargez votre' : 'Top up your'} <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">{language === 'fr' ? 'carte DRAVA' : 'DRAVA card'}</span>
            </h1>
            <p className="text-xl text-gray-600">
              {language === 'fr'
                ? "Ajoutez des fonds à votre carte virtuelle rapidement et en toute sécurité"
                : "Add funds to your virtual card quickly and securely"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="border border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
                  <CardTitle className="text-2xl text-center">
                    {language === 'fr' ? 'Formulaire de Recharge' : 'Top-up Form'}
                  </CardTitle>
                  <CardDescription className="text-blue-100 text-center">
                    {language === 'fr'
                      ? "Remplissez le formulaire ci-dessous pour recharger votre carte"
                      : "Fill out the form below to top up your card"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      {/* Numéro de carte */}
                      <div>
                        <Label htmlFor="cardNumber">
                          {language === 'fr'
                            ? "Entrez les 06 derniers chiffres de votre numéro de carte"
                            : "Enter the last 6 digits of your card number"}
                        </Label>
                        <Input
                          id="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          placeholder={language === 'fr' ? "Exemple: 123456" : "Example: 123456"}
                          className={`mt-1 ${errors.cardNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                          maxLength={6}
                          required
                        />
                        {errors.cardNumber && (
                          <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                        )}
                      </div>

                      {/* Type de carte */}
                      <div>
                        <Label htmlFor="cardType">
                          {language === 'fr' ? "Type de carte" : "Card type"}
                        </Label>
                        <Select value={formData.cardType} onValueChange={handleCardTypeChange} required>
                          <SelectTrigger
                            id="cardType"
                            className={`mt-1 ${errors.cardType ? 'border-red-500 focus:ring-red-500' : ''}`}
                          >
                            <SelectValue placeholder={language === 'fr' ? "Sélectionnez un type de carte" : "Select a card type"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visa">Visa</SelectItem>
                            <SelectItem value="mastercard">Mastercard</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.cardType && (
                          <p className="text-sm text-red-500 mt-1">{errors.cardType}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={language === 'fr' ? "Votre adresse email" : "Your email address"}
                          className={`mt-1 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                          required
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                        )}
                      </div>

                      {/* Montant */}
                      <div>
                        <Label htmlFor="amount">
                          {language === 'fr' ? "Montant de recharge" : "Top-up amount"} (Minimum {MIN_AMOUNT} FCFA / {formatCurrency(xafToUsd(MIN_AMOUNT), 'USD')})
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          min={MIN_AMOUNT}
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder={language === 'fr' ? "Montant en FCFA" : "Amount in FCFA"}
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
                          <h3 className="font-medium text-blue-800">
                            {language === 'fr' ? "Résumé du paiement" : "Payment summary"}
                          </h3>
                          <div className="ml-auto flex items-center text-xs text-blue-600">
                            <DollarSign className="h-3 w-3 mr-1" />
                            <span>1 USD = {XAF_TO_USD_RATE} FCFA</span>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {language === 'fr' ? "Montant de base:" : "Base amount:"}
                            </span>
                            <div className="text-right">
                              <span className="font-medium">{calculatedAmounts.baseAmount.toLocaleString()} FCFA</span>
                              <div className="text-xs text-gray-500">{formatCurrency(calculatedAmounts.baseAmountUsd, 'USD')}</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-blue-800">
                            <span>
                              {language === 'fr'
                                ? `Frais de service (${SERVICE_FEE_PERCENTAGE}%):`
                                : `Service fee (${SERVICE_FEE_PERCENTAGE}%):` }
                            </span>
                            <div className="text-right">
                              <span className="font-medium">+{calculatedAmounts.serviceFeeAmount.toLocaleString()} FCFA</span>
                              <div className="text-xs text-blue-500">+{formatCurrency(calculatedAmounts.serviceFeeAmountUsd, 'USD')}</div>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>{language === 'fr' ? "Total à payer:" : "Total to pay:"}</span>
                            <div className="text-right">
                              <span>{calculatedAmounts.totalAmount.toLocaleString()} FCFA</span>
                              <div className="text-xs font-normal text-gray-600">{formatCurrency(calculatedAmounts.totalAmountUsd, 'USD')}</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <span>{language === 'fr' ? "Dont frais bancaires:" : "Including bank fees:"}</span>
                            <div className="text-right">
                              <span>{BANK_FEE_XAF.toLocaleString()} FCFA</span>
                              <div className="text-xs">{formatCurrency(calculatedAmounts.bankFeeUsd, 'USD')}</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-green-800 font-medium mt-1">
                            <span>{language === 'fr' ? "Montant crédité sur la carte:" : "Amount credited to card:"}</span>
                            <div className="text-right">
                              <span>{calculatedAmounts.actualCardCredit.toLocaleString()} FCFA</span>
                              <div className="text-xs text-green-600">{formatCurrency(calculatedAmounts.actualCardCreditUsd, 'USD')}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Information sur les frais */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                        <Info className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          {language === 'fr'
                            ? `Les frais de service de ${SERVICE_FEE_PERCENTAGE}% sont inclus dans le montant total à payer. La banque émettrice prélève également ${BANK_FEE_XAF} FCFA (${formatCurrency(calculatedAmounts.bankFeeUsd, 'USD')}) sur le montant crédité.`
                            : `The ${SERVICE_FEE_PERCENTAGE}% service fee is included in the total amount. The issuing bank also charges ${BANK_FEE_XAF} FCFA (${formatCurrency(calculatedAmounts.bankFeeUsd, 'USD')}) from the credited amount.`}
                        </div>
                      </div>

                      {/* Messages d'erreur/succès */}
                      {submitStatus === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-green-800">{statusMessage}</div>
                        </div>
                      )}

                      {submitStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="text-sm text-red-800">{statusMessage}</div>
                        </div>
                      )}
                    </div>

                    {/* Bouton de soumission */}
                    <div className="mt-6">
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {language === 'fr' ? "Traitement en cours..." : "Processing..."}
                          </>
                        ) : (
                          <>
                            {language === 'fr' ? "Payer" : "Pay"} {calculatedAmounts.totalAmount.toLocaleString()} FCFA ({formatCurrency(calculatedAmounts.totalAmountUsd, 'USD')}) {language === 'fr' ? "avec" : "with"} SoleasPay
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border border-gray-100 shadow-lg mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">
                      {language === 'fr' ? "Informations importantes" : "Important information"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">
                          <b>XAF {XAF_TO_USD_RATE} = 1 USD</b>.
                          {language === 'fr'
                            ? " Les frais de service seront appliqués à votre recharge."
                            : " Service fees will be applied to your top-up."}
                        </p>
                      </div>

                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">
                          <b>{language === 'fr' ? "URGENT" : "URGENT"}</b>:
                          {language === 'fr'
                            ? ' 3 tentatives de paiement échoué pour motif "solde insuffisant" peut entraîner la suppression de votre carte.'
                            : ' 3 failed payment attempts due to "insufficient balance" may result in the deletion of your card.'}
                        </p>
                      </div>

                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">
                          {language === 'fr'
                            ? 'À chaque recharge, la banque émettrice vous prélève '
                            : 'For each top-up, the issuing bank charges you '}
                          <b>0,5 $ = {BANK_FEE_XAF} FCFA</b>
                          {language === 'fr'
                            ? ' du montant de votre recharge.'
                            : ' from your top-up amount.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-100 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">SoleasPay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      {language === 'fr'
                        ? "Nous utilisons exclusivement SoleasPay pour tous les paiements, offrant les méthodes suivantes :"
                        : "We exclusively use SoleasPay for all payments, offering the following methods:"}
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-3">
                          OM
                        </div>
                        <span>Orange Money</span>
                      </li>
                      <li className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mr-3">
                          MM
                        </div>
                        <span>MTN Mobile Money</span>
                      </li>
                      <li className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                          MP
                        </div>
                        <span>MoMo Pay</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

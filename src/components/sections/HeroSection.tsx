"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronRight, CreditCard, Shield, Globe, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import ReactCountryFlag from 'react-country-flag'
import { useLanguage } from '@/lib/language-context'

// Country code mapping for some African countries that may have different ISO codes
const countryCodeMapping: Record<string, string> = {
  BJ: 'BJ', // Benin
  CI: 'CI', // Côte d'Ivoire
  CM: 'CM', // Cameroon
  SN: 'SN', // Senegal
  ML: 'ML', // Mali
  TG: 'TG', // Togo
  CD: 'CD', // Democratic Republic of the Congo
  CG: 'CG', // Republic of the Congo
  RW: 'RW', // Rwanda
  KE: 'KE', // Kenya
  ZM: 'ZM', // Zambia
  BF: 'BF', // Burkina Faso
  TZ: 'TZ', // Tanzania
}

const HeroSection = () => {
  const router = useRouter();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { t, language } = useLanguage();

  // Fonction pour naviguer vers la page des cartes
  const handleCreateCard = () => {
    router.push('/cards');
  };

  // Fonction pour afficher la boîte de dialogue "Comment ça marche"
  const handleShowHowItWorks = () => {
    setShowHowItWorks(true);
  };

  return (
    <section className="pt-28 pb-16 md:pt-32 md:pb-24 overflow-hidden relative bg-gradient-to-b from-white to-blue-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[80%] rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute top-[60%] -left-[5%] w-[40%] h-[50%] rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Hero content */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 mb-6">
              <span>
                {language === 'fr'
                  ? 'DRAVA V3.6.0 est maintenant disponible'
                  : 'DRAVA V3.6.0 is now available'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              {language === 'fr'
                ? <><span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">Paiements sans frontières avec</span> <span className="relative inline-block text-blue-700">DRAVA
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-800 rounded-full"></span>
                </span></>
                : <><span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">Borderless payments with</span> <span className="relative inline-block text-blue-700">DRAVA
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-800 rounded-full"></span>
                </span></>
              }
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8">
              {language === 'fr'
                ? "Créez, rechargez et gérez vos cartes virtuelles DRAVA en quelques clics. Effectuez des paiements internationaux en toute simplicité."
                : "Create, reload and manage your DRAVA virtual cards in just a few clicks. Make international payments with ease."}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 font-medium w-full sm:w-auto transform transition-transform duration-300 hover:scale-105"
                onClick={handleCreateCard}
              >
                {language === 'fr' ? 'Créer votre carte' : 'Create your card'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-50 transition-all duration-300"
                onClick={handleShowHowItWorks}
              >
                {t('navigation.howItWorks')}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'fr' ? 'Cartes illimitées' : 'Unlimited cards'}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'fr' ? 'Sécurisé 3D' : '3D Secure'}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full bg-blue-100 p-2 mb-2">
                  <Globe className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'fr' ? 'Utilisation mondiale' : 'Global usage'}
                </span>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="relative z-10 mx-auto max-w-md lg:max-w-none">
              {/* Main card image with shadow and glow */}
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl shadow-blue-200 ring-1 ring-gray-200 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-300 group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-800/30 mix-blend-multiply opacity-0 transition-opacity duration-500 group-hover:opacity-20" />

                {/* Card with holographic effect */}
                <div className="aspect-[4/3] w-full bg-gradient-to-r from-blue-500 to-indigo-700 p-8 text-white relative overflow-hidden">
                  {/* Holographic shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -translate-x-full group-hover:translate-x-full" />
                  
                  <div className="flex justify-between">
                    <div className="text-xs font-light">
                      {language === 'fr' ? 'Carte virtuelle' : 'Virtual card'}
                    </div>
                    <div className="flex gap-1">
                      <div className="h-5 w-5 rounded-full bg-yellow-400 opacity-70" />
                      <div className="h-5 w-5 rounded-full bg-red-400 opacity-70" />
                    </div>
                  </div>

                  <div className="mt-6 font-light">
                    <div className="text-xl flex items-center">
                      <span>DRA</span>
                      <span className="font-bold">VA</span>
                      <Image 
                        src="/images/drava-icon-192.svg" 
                        alt="DRAVA" 
                        width={24} 
                        height={24} 
                        className="ml-2 opacity-80"
                      />
                    </div>
                    <div className="mt-10 text-lg tracking-widest">5304 •••• •••• 3562</div>
                    <div className="mt-4 flex justify-between">
                      <div>
                        <div className="text-xs">
                          {language === 'fr' ? 'TITULAIRE' : 'CARDHOLDER'}
                        </div>
                        <div>JOHN DOE</div>
                      </div>
                      <div>
                        <div className="text-xs">
                          {language === 'fr' ? 'EXPIRE LE' : 'EXPIRES ON'}
                        </div>
                        <div>09/26</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards in the background */}
              <div className="absolute top-1/4 -left-12 w-24 h-36 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg transform -rotate-12 hidden lg:block" />
              <div className="absolute bottom-1/4 -right-12 w-32 h-20 rounded-lg bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-lg transform rotate-12 hidden lg:block" />

              {/* Currency circle badges */}
              <div className="absolute top-10 right-20 h-16 w-16 rounded-full bg-yellow-400 bg-opacity-90 shadow-lg flex items-center justify-center transform -rotate-12 hidden lg:flex">
                <span className="font-bold text-white">€</span>
              </div>
              <div className="absolute -bottom-4 left-20 h-12 w-12 rounded-full bg-blue-500 bg-opacity-90 shadow-lg flex items-center justify-center hidden lg:flex">
                <span className="font-bold text-white">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Country flags - showing support for various countries */}
        <div className="mt-16 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            {language === 'fr' 
              ? 'Disponible dans ces pays et plus encore' 
              : 'Available in these countries and more'}
          </h3>
          
          <div className="flex overflow-x-auto pb-4 scrollbar-hide max-w-full">
            <div className="flex gap-4 md:gap-6 mx-auto">
              {['BJ', 'CI', 'CM', 'SN', 'ML', 'TG', 'CD', 'CG', 'RW', 'KE', 'ZM', 'BF', 'TZ'].map((country) => (
                <div 
                  key={country} 
                  className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 border border-gray-100"
                >
                  <div className="mb-1">
                    <ReactCountryFlag
                      countryCode={countryCodeMapping[country]}
                      svg
                      style={{
                        width: '2em',
                        height: '2em',
                        borderRadius: '50%',
                      }}
                      title={country}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{country}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              {language === 'fr'
                ? 'Nos cartes virtuelles sont acceptées partout où VISA et Mastercard sont acceptés, avec un support spécial pour les pays africains.'
                : 'Our virtual cards are accepted everywhere VISA and Mastercard are accepted, with special support for African countries.'}
            </p>
          </div>
        </div>
      </div>

      {/* Dialog pour "Comment ça marche" */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
              {t('home.howItWorks.title')}
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-600 mt-2">
              {language === 'fr'
                ? 'Découvrez comment obtenir et utiliser votre carte virtuelle en quelques étapes simples.'
                : 'Discover how to obtain and use your virtual card in a few simple steps.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {language === 'fr' ? 'Choisissez votre carte' : 'Choose your card'}
                </h3>
                <p className="text-gray-600">
                  {language === 'fr'
                    ? 'Sélectionnez le type de carte qui correspond à vos besoins parmi nos options VISA et MASTERCARD.'
                    : 'Select the type of card that suits your needs from our VISA and MASTERCARD options.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {language === 'fr' ? 'Effectuez le paiement' : 'Make the payment'}
                </h3>
                <p className="text-gray-600">
                  {language === 'fr'
                    ? 'Payez en toute sécurité via notre passerelle de paiement protégée utilisant des méthodes variées.'
                    : 'Pay securely through our protected payment gateway using various methods.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-100 pb-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {language === 'fr' ? 'Recevez votre carte' : 'Receive your card'}
                </h3>
                <p className="text-gray-600">
                  {language === 'fr'
                    ? 'Votre carte virtuelle est générée instantanément et les détails sont envoyés de manière sécurisée.'
                    : 'Your virtual card is generated instantly and details are sent securely.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center text-blue-700 font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {language === 'fr' ? 'Utilisez partout' : 'Use everywhere'}
                </h3>
                <p className="text-gray-600">
                  {language === 'fr'
                    ? 'Utilisez votre carte pour les achats en ligne partout où VISA et Mastercard sont acceptés.'
                    : 'Use your card for online purchases anywhere VISA and Mastercard are accepted.'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-800"
                onClick={handleCreateCard}
              >
                {language === 'fr' ? 'Créer ma carte maintenant' : 'Create my card now'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default HeroSection

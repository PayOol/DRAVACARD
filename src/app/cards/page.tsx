"use client"

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Check, X, CreditCard, Bolt, Shield, Clock, Zap, BadgeCheck } from 'lucide-react'
import { DialogNotes } from '@/components/ui/dialog-notes'
import { createPaymentGateway, submitPaymentForm, openPaymentModal } from '@/lib/soleas-payment'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/language-context'
import { v4 as uuidv4 } from 'uuid';

// Définir les types pour les cartes
interface Card {
  id: string;
  name: {
    fr: string;
    en: string;
  };
  price: string;
  currency: string;
  icon: string;
  color: string;
  popular?: boolean;
  position?: number;
  features: {
    fr: string[];
    en: string[];
  };
  negativeFeatures?: {
    fr: string[];
    en: string[];
  };
  description: {
    fr: string;
    en: string;
  };
}

export default function CardsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  // État pour suivre la boîte de dialogue et la carte sélectionnée
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Détecter si on est en mode mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérifie la taille initiale
    checkIfMobile();

    // Ajoute un écouteur pour les changements de taille
    window.addEventListener('resize', checkIfMobile);

    // Nettoyage
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Liste des cartes disponibles
  const cards: Card[] = [
    {
      id: "visa-basic",
      name: {
        fr: "VISA BASIQUE",
        en: "BASIC VISA"
      },
      price: "5000",
      currency: "XAF",
      icon: "visa",
      color: "blue",
      position: 1,
      description: {
        fr: "Parfait pour commencer - Carte virtuelle prépayée sans frais mensuels",
        en: "Perfect to start - Prepaid virtual card with no monthly fees"
      },
      features: {
        fr: [
          "Carte prépayée",
          "3D Secure",
          "Sans vérification KYC",
          "Sans frais mensuels",
          "3 années de validité",
          "Idéal pour les achats en ligne"
        ],
        en: [
          "Prepaid card",
          "3D Secure",
          "No KYC verification",
          "No monthly fees",
          "3 years validity",
          "Ideal for online purchases"
        ]
      }
    },
    {
      id: "mastercard-basic",
      name: {
        fr: "MASTERCARD BASIQUE",
        en: "BASIC MASTERCARD"
      },
      price: "6000",
      currency: "XAF",
      icon: "mastercard",
      color: "teal",
      popular: true,
      position: 2,
      description: {
        fr: "Notre option la plus populaire - Offre le meilleur rapport qualité/prix",
        en: "Our most popular option - Offers the best value for money"
      },
      features: {
        fr: [
          "Carte prépayée",
          "3D Secure",
          "Sans vérification KYC",
          "Sans frais mensuels",
          "3 années de validité",
          "Acceptée partout"
        ],
        en: [
          "Prepaid card",
          "3D Secure",
          "No KYC verification",
          "No monthly fees",
          "3 years validity",
          "Accepted everywhere"
        ]
      }
    },
    {
      id: "mastercard-premium",
      name: {
        fr: "MASTERCARD PREMIUM",
        en: "PREMIUM MASTERCARD"
      },
      price: "8500",
      currency: "XAF",
      icon: "mastercard",
      color: "emerald",
      position: 3,
      description: {
        fr: "Fonctionnalités avancées - Idéal pour des achats plus importants",
        en: "Advanced features - Ideal for larger purchases"
      },
      features: {
        fr: [
          "Carte de débit",
          "3D Secure",
          "Achats sur Amazon",
          "Achats sur Alibaba",
          "Retraits possibles (Cameroun uniquement)",
          "Compatible PayPal"
        ],
        en: [
          "Debit card",
          "3D Secure",
          "Amazon purchases",
          "Alibaba purchases",
          "Withdrawals possible (Cameroon only)",
          "PayPal compatible"
        ]
      },
      negativeFeatures: {
        fr: [
          "Ne prend pas en charge les retraits PayPal"
        ],
        en: [
          "Does not support PayPal withdrawals"
        ]
      }
    },
    {
      id: "mastercard-platinum",
      name: {
        fr: "MASTERCARD PLATINIUM",
        en: "PLATINUM MASTERCARD"
      },
      price: "15000",
      currency: "XAF",
      icon: "mastercard",
      color: "gray",
      position: 4,
      description: {
        fr: "Expérience premium - Sans limite avec des avantages exclusifs",
        en: "Premium experience - No limits with exclusive benefits"
      },
      features: {
        fr: [
          "Carte de débit",
          "3D Secure",
          "Aucun plafond sur les recharges",
          "Compatible Google Pay",
          "Compatible Apple Pay",
          "🎁 Bonus de $5 offert"
        ],
        en: [
          "Debit card",
          "3D Secure",
          "No ceiling on reloads",
          "Google Pay compatible",
          "Apple Pay compatible",
          "🎁 $5 bonus offered"
        ]
      }
    }
  ];

  // Filtrer les cartes selon l'onglet actif
  const filteredCards = activeTab === "all"
    ? cards
    : cards.filter(card => card.icon === activeTab);

  // Gérer le clic sur le bouton d'achat
  const handleBuyClick = (card: Card) => {
    console.log('Handling payment acceptance for card:', card.name[language]);

    // Vérifier si l'utilisateur a déjà un email sauvegardé
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '';
    setUserEmail(savedEmail);

    setSelectedCard(card);
    setDialogOpen(true);
  };

  // Gérer l'acceptation des conditions
  const handleAccept = async (cardDetails: { name: { fr: string; en: string }; price: string; currency: string }) => {
    console.log('Handling payment acceptance for card:', cardDetails.name[language]);

    if (isProcessing || typeof window === 'undefined') return;

    setIsProcessing(true);
    setDialogOpen(false);

    try {
      // S'assurer que le paramètre currency est toujours défini à XAF
      const paymentCardDetails = {
        name: cardDetails.name[language],
        price: cardDetails.price,
        currency: 'XAF' // Toujours fixé à XAF pour éviter les erreurs
      };

      // Sauvegarder l'email de l'utilisateur si disponible
      if (userEmail) {
        localStorage.setItem('userEmail', userEmail);
      }

      // Afficher un message dans la console
      console.log('Creating payment form for:', paymentCardDetails);

      // Créer le formulaire de paiement via l'API SoleasPay
      const response = await createPaymentGateway(
        paymentCardDetails,
        'DravaCards',
        `DRAVA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        `${window.location.origin}/payment-success?card=${encodeURIComponent(paymentCardDetails.name)}`,
        `${window.location.origin}/payment-failure`,
        userEmail
      );

      console.log('Received payment form response:', response);

      if (response.success && response.formHtml) {
        // Soumettre le formulaire de paiement automatiquement
        console.log('Submitting payment form...');
        submitPaymentForm(response.formHtml);
      } else {
        console.error('No form HTML received from API');
        router.push('/payment-failure');
      }
    } catch (error) {
      console.error('Payment form creation error:', error);
      router.push('/payment-failure');
    } finally {
      setIsProcessing(false);
    }
  };

  // Obtenir la couleur de fond pour une carte
  const getCardGradient = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-600 to-blue-800';
      case 'teal': return 'from-teal-600 to-teal-800';
      case 'emerald': return 'from-emerald-600 to-emerald-800';
      case 'gray': return 'from-gray-700 to-gray-900';
      default: return 'from-blue-600 to-blue-800';
    }
  };

  // Obtenir la couleur du badge "Plus populaire"
  const getPopularBadgeColor = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'teal': return 'bg-teal-100 text-teal-800';
      case 'emerald': return 'bg-emerald-100 text-emerald-800';
      case 'gray': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Obtenir l'icône pour une carte
  const getCardIcon = (icon: string) => {
    switch (icon) {
      case 'visa': return '/images/visa.svg';
      case 'mastercard': return '/images/mastercard.svg';
      default: return '/images/card-generic.svg';
    }
  };

  // Rendu mobile optimisé
  const renderMobileCard = (card: Card) => {
    return (
      <div key={card.id} className="relative mb-4 rounded-lg overflow-hidden shadow-md border border-gray-100">
        {/* Badge "Plus populaire" */}
        {card.popular && (
          <div className="absolute top-0 right-0 z-10">
            <span className={`${getPopularBadgeColor(card.color)} px-3 py-0.5 text-xs font-semibold rounded-bl-lg`}>
              {language === 'fr' ? 'Plus populaire' : 'Most popular'}
            </span>
          </div>
        )}

        {/* En-tête de la carte */}
        <div className={`bg-gradient-to-r ${getCardGradient(card.color)} p-4 text-white`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center">
                <h2 className="text-lg font-bold">{card.name[language]}</h2>
                <img
                  src={getCardIcon(card.icon)}
                  alt={card.icon === 'visa' ? 'Visa' : 'Mastercard'}
                  className="h-8 w-auto ml-2"
                />
              </div>
              <div className="text-xl font-bold mt-1">
                {Number.parseInt(card.price, 10).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                <span className="text-sm font-normal opacity-80 ml-1">{card.currency}</span>
              </div>
            </div>
            <div className="flex items-center bg-white/20 px-2 py-1 rounded-full text-xs">
              <Clock className="w-3 h-3 mr-1" />
              <span>{language === 'fr' ? '3 ans' : '3 years'}</span>
            </div>
          </div>
          {/* Description de la carte - visible directement */}
          <p className="text-xs opacity-90 mt-2 mb-0">{card.description[language]}</p>
        </div>

        {/* Contenu de la carte - toujours visible */}
        <div className="p-3 bg-white">
          {/* Liste des caractéristiques */}
          <div className="space-y-1 mb-2">
            {card.features[language].map((feature, featureIndex) => (
              <div key={`feature-${card.id}-${featureIndex}`} className="flex items-start">
                <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 text-xs ml-1.5">{feature}</span>
              </div>
            ))}

            {card.negativeFeatures?.[language].map((feature, featureIndex) => (
              <div key={`neg-feature-${card.id}-${featureIndex}`} className="flex items-start">
                <X className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-500 text-xs ml-1.5">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton d'achat - toujours visible */}
        <div className="p-2 pt-0 bg-white">
          <Button
            onClick={() => handleBuyClick(card)}
            disabled={isProcessing}
            className={`w-full bg-gradient-to-r ${getCardGradient(card.color)} text-white py-2 rounded-lg flex items-center justify-center`}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isProcessing
              ? (language === 'fr' ? 'Traitement...' : 'Processing...')
              : (language === 'fr' ? 'Acheter' : 'Buy')}
          </Button>
        </div>
      </div>
    );
  };

  // Rendu desktop standard
  const renderDesktopCard = (card: Card) => (
    <div key={card.id} className="relative group">
      {/* Badge "Plus populaire" */}
      {card.popular && (
        <div className="absolute -top-4 right-8 z-10">
          <span className={`${getPopularBadgeColor(card.color)} px-4 py-1 rounded-full text-xs font-semibold shadow-md flex items-center`}>
            <BadgeCheck className="w-3.5 h-3.5 mr-1" />
            {language === 'fr' ? 'Plus populaire' : 'Most popular'}
          </span>
        </div>
      )}

      {/* Carte */}
      <div className={`relative h-full bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 transition-all duration-300 group-hover:shadow-xl ${card.popular ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}>

        {/* En-tête de la carte */}
        <div className={`bg-gradient-to-r ${getCardGradient(card.color)} p-6 text-white relative overflow-hidden`}>
          {/* Cercles décoratifs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-24 -left-10 w-32 h-32 bg-white/5 rounded-full" />

          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">{card.name[language]}</h2>
            <img
              src={getCardIcon(card.icon)}
              alt={card.icon === 'visa' ? 'Visa' : 'Mastercard'}
              className="h-8 w-auto"
            />
          </div>

          <p className="text-sm opacity-80 mb-3 line-clamp-2">{card.description[language]}</p>

          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold">
              {Number.parseInt(card.price, 10).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')} <span className="text-lg font-normal opacity-80">{card.currency}</span>
            </div>

            <div className="flex items-center bg-white/20 px-3 py-1 rounded-full text-xs">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>{language === 'fr' ? 'Validité: 3 ans' : 'Validity: 3 years'}</span>
            </div>
          </div>
        </div>

        {/* Contenu de la carte - Sans hauteur fixe */}
        <div className="p-6 flex flex-col">
          <div className="mb-4 flex items-center border-b border-gray-100 pb-2">
            <Shield className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Caractéristiques' : 'Features'}
            </span>
          </div>

          {/* Liste des caractéristiques - Espacement amélioré */}
          <div className="space-y-1.5 mb-6">
            {card.features[language].map((feature, featureIndex) => (
              <div key={`feature-${card.id}-${featureIndex}`} className="flex items-start">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm ml-2">{feature}</span>
              </div>
            ))}

            {card.negativeFeatures?.[language].map((feature, featureIndex) => (
              <div key={`neg-feature-${card.id}-${featureIndex}`} className="flex items-start">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-500 text-sm ml-2">{feature}</span>
              </div>
            ))}
          </div>

          {/* Bouton d'achat - Position stabilisée */}
          <Button
            onClick={() => handleBuyClick(card)}
            disabled={isProcessing}
            className={`w-full mt-auto bg-gradient-to-r ${getCardGradient(card.color)} text-white py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg group-hover:translate-y-[-2px] flex items-center justify-center`}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isProcessing
              ? (language === 'fr' ? 'Traitement...' : 'Processing...')
              : (language === 'fr' ? 'Acheter maintenant' : 'Buy now')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <section className={`pt-20 md:pt-28 pb-12 md:pb-20 bg-gradient-to-b from-slate-50 to-white ${isMobile ? 'min-h-screen' : ''}`}>
        <div className="container mx-auto px-4">
          {/* En-tête de la section - Condensé sur mobile */}
          <div className={`mx-auto text-center ${isMobile ? 'mb-6' : 'max-w-4xl mb-16'}`}>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
              {language === 'fr'
                ? "Cartes virtuelles DRAVA"
                : "DRAVA Virtual Cards"}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {language === 'fr'
                ? "Choisissez la carte qui correspond à vos besoins et commencez à effectuer des paiements en ligne en toute sécurité."
                : "Choose the card that matches your needs and start making secure online payments."}
            </p>

            {/* Filtres par type de carte */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md mx-auto">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="all" className="rounded-lg text-sm">
                  {language === 'fr' ? 'Toutes' : 'All'}
                </TabsTrigger>
                <TabsTrigger value="visa" className="rounded-lg text-sm">
                  Visa
                </TabsTrigger>
                <TabsTrigger value="mastercard" className="rounded-lg text-sm">
                  Mastercard
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Avertissement - Condensé sur mobile */}
            {isMobile ? (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 mb-4 text-left">
                <p className="text-red-600 text-xs">
                  <strong>{language === 'fr' ? 'Note:' : 'Note:'}</strong>
                  {language === 'fr'
                    ? 'Cartes non acceptées pour cryptomonnaies, paris sportifs, Wise, et sites adultes.'
                    : 'Cards not accepted for cryptocurrencies, sports betting, Wise, and adult sites.'}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 mt-4 mb-8 mx-auto max-w-2xl">
                <p className="text-red-600 text-sm">
                  <strong>{language === 'fr' ? 'Note importante:' : 'Important note:'}</strong>
                  {language === 'fr'
                    ? 'Les cartes ne sont pas acceptées sur les sites de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise, et les sites pour adultes.'
                    : 'Cards are not accepted on cryptocurrency sites, sports betting platforms like Bet9ja, Wise, and adult sites.'}
                </p>
              </div>
            )}
          </div>

          {/* Grille des cartes - Affichage différent selon le mode */}
          {isMobile ? (
            <div className="space-y-0">
              {filteredCards.map(card => renderMobileCard(card))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {filteredCards.map(card => renderDesktopCard(card))}
            </div>
          )}

          {/* Section de confiance - cachée sur mobile */}
          {!isMobile && (
            <div className="mt-16 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-wrap justify-center gap-8 items-center text-sm text-gray-500">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-green-500 mr-2" />
                      <span>{language === 'fr' ? 'Paiement sécurisé' : 'Secure payment'}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-green-500 mr-2" />
                      <span>{language === 'fr' ? 'Livraison instantanée' : 'Instant delivery'}</span>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-green-500 mr-2" />
                      <span>{language === 'fr' ? 'Support 24/7' : '24/7 Support'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Dialogue de notes d'utilisation */}
      {selectedCard && (
        <DialogNotes
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAccept={handleAccept}
          cardDetails={selectedCard}
          customerEmail={userEmail}
        />
      )}
    </MainLayout>
  )
}

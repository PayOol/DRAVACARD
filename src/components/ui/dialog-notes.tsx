"use client"

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openPaymentModal } from '@/lib/soleas-payment'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'

interface CardDetails {
  name: {
    fr: string;
    en: string;
  };
  price: string;
  currency: string;
}

interface DialogNotesProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (cardDetails: CardDetails) => void;
  cardDetails: CardDetails;
  customerEmail?: string;
}

// Variantes d'animation pour différents éléments
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    transition: { delay: 0.3, duration: 0.3 }
  }
};

const modalVariants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
    rotateX: 60,
    y: 100
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
      delay: 0.2,
      duration: 0.6
    }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    y: -100,
    transition: { duration: 0.3 }
  }
};

const headerVariants = {
  hidden: { x: -50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.6,
      type: "spring",
      stiffness: 200
    }
  }
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.8
    }
  }
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const buttonsVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 1.2,
      type: "spring",
      stiffness: 200
    }
  }
};

export function DialogNotes({ isOpen, onClose, onAccept, cardDetails, customerEmail = '' }: DialogNotesProps) {
  const [email, setEmail] = useState(customerEmail);
  const [isValidEmail, setIsValidEmail] = useState(true);
  const { t, language } = useLanguage();

  // Validation de l'email
  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Gestion du changement d'email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsValidEmail(newEmail === '' || validateEmail(newEmail));
  };

  // Fonction pour ouvrir directement le formulaire SoleasPay dans une modal
  const handleDirectPayment = () => {
    // Vérifier si l'email est valide avant de continuer
    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    console.log('Opening direct payment modal with SoleasPay');

    // Fermer la boîte de dialogue des notes
    onClose();

    // S'assurer que la devise est toujours définie à XAF
    const paymentCardDetails = {
      name: cardDetails.name[language],
      price: cardDetails.price,
      currency: 'XAF' // Toujours fixé à XAF pour éviter les erreurs
    };

    // Sauvegarder l'email pour une utilisation future
    if (typeof window !== 'undefined' && email) {
      localStorage.setItem('userEmail', email);
    }

    // Ouvrir la modal avec le formulaire SoleasPay
    openPaymentModal(paymentCardDetails, 'DRAVA Cards', email);
  };

  // Fonction pour accepter les conditions et traiter le paiement
  const handleAccept = () => {
    // Vérifier si l'email est valide avant de continuer
    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    // Sauvegarder l'email pour une utilisation future
    if (typeof window !== 'undefined' && email) {
      localStorage.setItem('userEmail', email);
    }

    onAccept(cardDetails);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 perspective-1000"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
        >
          <motion.div
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            variants={modalVariants}
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white"
              variants={headerVariants}
            >
              <h2 className="text-xl font-bold">
                {language === 'fr' ? 'Notes d\'utilisation' : 'Usage Notes'}
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>

            <motion.div
              className="p-6"
              variants={contentVariants}
            >
              <motion.div
                className="bg-blue-50 p-4 rounded-lg mb-6"
                variants={itemVariants}
                animate={{
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    "0px 0px 0px rgba(66, 153, 225, 0.0)",
                    "0px 0px 20px rgba(66, 153, 225, 0.5)",
                    "0px 0px 0px rgba(66, 153, 225, 0.0)"
                  ],
                  transition: {
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "loop"
                  }
                }}
              >
                <h3 className="font-bold text-blue-800 mb-2">
                  {language === 'fr' ? 'CARTES VIRTUELLES' : 'VIRTUAL CARDS'}
                </h3>
                <p className="text-blue-700 text-sm">
                  {language === 'fr'
                    ? 'Nous émettons des cartes virtuelles Mastercard et Visa (USD) qui fonctionnent sur toutes les plateformes à l\'exception des plateformes de paris sportifs, de crypto monnaie, Wise et des films pour adulte.'
                    : 'We issue Mastercard and Visa virtual cards (USD) that work on all platforms except sports betting platforms, cryptocurrency, Wise, and adult content sites.'}
                </p>
              </motion.div>

              {/* Champ email si nécessaire */}
              {!customerEmail && (
                <motion.div
                  className="mb-6"
                  variants={itemVariants}
                >
                  <h3 className="font-bold text-gray-800 mb-2">
                    {t('dialog.emailLabel')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {language === 'fr'
                      ? 'Cet email sera utilisé pour le paiement et vous recevrez les détails de votre carte à cette adresse.'
                      : 'This email will be used for payment and you will receive your card details at this address.'}
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={t('dialog.emailPlaceholder')}
                    className={`w-full p-2 border rounded ${!isValidEmail ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {!isValidEmail && (
                    <p className="text-red-500 text-xs mt-1">
                      {t('dialog.invalidEmail')}
                    </p>
                  )}
                </motion.div>
              )}

              <motion.div
                className="grid grid-cols-2 gap-6 mb-6"
                variants={itemVariants}
              >
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-gray-500 text-sm mb-1">
                    {language === 'fr' ? 'Période de validité' : 'Validity Period'}
                  </h4>
                  <p className="font-medium">
                    {language === 'fr' ? '3 ans' : '3 years'}
                  </p>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-gray-500 text-sm mb-1">
                    {language === 'fr' ? 'Limite par transaction' : 'Transaction Limit'}
                  </h4>
                  <p className="font-medium">10 000 $</p>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-gray-500 text-sm mb-1">
                    {language === 'fr' ? 'Limite du solde' : 'Balance Limit'}
                  </h4>
                  <p className="font-medium">100 000 $</p>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-gray-500 text-sm mb-1">
                    {language === 'fr' ? 'Frais d\'échec' : 'Failure Fee'}
                  </h4>
                  <p className="font-medium">
                    {language === 'fr' ? '0.3 $ par transaction' : '$0.3 per transaction'}
                  </p>
                </motion.div>
              </motion.div>

              <motion.div
                className="space-y-3 mb-6"
                variants={itemVariants}
              >
                <motion.div
                  className="flex items-start space-x-2 text-red-600"
                  variants={itemVariants}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                >
                  <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {language === 'fr'
                      ? 'Les cartes sont résiliées après 3 à 5 refus successifs'
                      : 'Cards are terminated after 3 to 5 consecutive rejections'}
                  </p>
                </motion.div>
                <motion.div
                  className="flex items-start space-x-2 text-red-600"
                  variants={itemVariants}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                >
                  <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {language === 'fr'
                      ? 'Les cartes sont résiliées si elles ne sont pas rechargées 3 semaines après leur achat'
                      : 'Cards are terminated if they are not recharged 3 weeks after purchase'}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex p-4 space-x-4 border-t"
              variants={buttonsVariants}
            >
              <motion.div className="flex-1"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  onClick={handleAccept}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {language === 'fr' ? 'Procéder au paiement' : 'Proceed to payment'}
                </Button>
              </motion.div>
              <motion.div className="flex-1"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  onClick={handleDirectPayment}
                  variant="outline"
                  className="w-full"
                >
                  {language === 'fr' ? 'Paiement direct' : 'Direct payment'}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

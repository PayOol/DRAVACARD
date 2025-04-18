export type Language = 'fr' | 'en';

export const translations = {
  // Common components
  common: {
    language: {
      fr: 'Langue',
      en: 'Language',
    },
    french: {
      fr: 'Français',
      en: 'French',
    },
    english: {
      fr: 'Anglais',
      en: 'English',
    },
    login: {
      fr: 'Connexion',
      en: 'Login',
    },
    signup: {
      fr: 'S\'inscrire',
      en: 'Sign Up',
    },
    submit: {
      fr: 'Soumettre',
      en: 'Submit',
    },
    cancel: {
      fr: 'Annuler',
      en: 'Cancel',
    },
    continue: {
      fr: 'Continuer',
      en: 'Continue',
    },
    save: {
      fr: 'Sauvegarder',
      en: 'Save',
    },
    edit: {
      fr: 'Modifier',
      en: 'Edit',
    },
    delete: {
      fr: 'Supprimer',
      en: 'Delete',
    },
    loading: {
      fr: 'Chargement...',
      en: 'Loading...',
    },
    required: {
      fr: 'Requis',
      en: 'Required',
    },
    optional: {
      fr: 'Optionnel',
      en: 'Optional',
    },
    success: {
      fr: 'Succès',
      en: 'Success',
    },
    error: {
      fr: 'Erreur',
      en: 'Error',
    },
    close: {
      fr: 'Fermer',
      en: 'Close',
    },
  },

  // Navigation
  navigation: {
    home: {
      fr: 'Accueil',
      en: 'Home',
    },
    cards: {
      fr: 'Cartes',
      en: 'Cards',
    },
    balance: {
      fr: 'Solde',
      en: 'Balance',
    },
    topup: {
      fr: 'Recharge',
      en: 'Top Up',
    },
    withdrawal: {
      fr: 'Retrait',
      en: 'Withdrawal',
    },
    howItWorks: {
      fr: 'Comment ça marche',
      en: 'How It Works',
    },
    aboutUs: {
      fr: 'À propos',
      en: 'About Us',
    },
    faq: {
      fr: 'FAQ',
      en: 'FAQ',
    },
    reseller: {
      fr: 'Revendeur',
      en: 'Reseller',
    },
    terms: {
      fr: 'Conditions',
      en: 'Terms',
    },
    privacy: {
      fr: 'Confidentialité',
      en: 'Privacy',
    },
    cookies: {
      fr: 'Cookies',
      en: 'Cookies',
    },
  },

  // Home page
  home: {
    hero: {
      title: {
        fr: 'Solution de paiement simple et sécurisée',
        en: 'Simple and secure payment solution',
      },
      subtitle: {
        fr: 'Une nouvelle expérience de paiement digitale',
        en: 'A new digital payment experience',
      },
      getStarted: {
        fr: 'Commencer',
        en: 'Get Started',
      },
      learnMore: {
        fr: 'En savoir plus',
        en: 'Learn More',
      },
    },
    features: {
      title: {
        fr: 'Pourquoi choisir DRAVA',
        en: 'Why choose DRAVA',
      },
      subtitle: {
        fr: 'Des fonctionnalités conçues pour vous',
        en: 'Features designed for you',
      },
      feature1: {
        title: {
          fr: 'Paiements Sécurisés',
          en: 'Secure Payments',
        },
        description: {
          fr: 'Toutes vos transactions sont protégées avec le plus haut niveau de sécurité.',
          en: 'All your transactions are protected with the highest level of security.',
        },
      },
      feature2: {
        title: {
          fr: 'Transactions Rapides',
          en: 'Fast Transactions',
        },
        description: {
          fr: 'Envoyez et recevez de l\'argent instantanément partout dans le monde.',
          en: 'Send and receive money instantly anywhere in the world.',
        },
      },
      feature3: {
        title: {
          fr: 'Interface Intuitive',
          en: 'Intuitive Interface',
        },
        description: {
          fr: 'Une expérience utilisateur simplifiée pour faciliter vos paiements.',
          en: 'A simplified user experience to make your payments easier.',
        },
      },
    },
    howItWorks: {
      title: {
        fr: 'Comment ça marche',
        en: 'How It Works',
      },
      subtitle: {
        fr: 'Simple, rapide et sécurisé',
        en: 'Simple, fast, and secure',
      },
      step1: {
        title: {
          fr: 'Créez un compte',
          en: 'Create an account',
        },
        description: {
          fr: 'Inscrivez-vous en quelques minutes et vérifiez votre identité.',
          en: 'Sign up in minutes and verify your identity.',
        },
      },
      step2: {
        title: {
          fr: 'Ajoutez des fonds',
          en: 'Add funds',
        },
        description: {
          fr: 'Rechargez votre compte via carte bancaire ou virement.',
          en: 'Top up your account via card or bank transfer.',
        },
      },
      step3: {
        title: {
          fr: 'Payez en toute sécurité',
          en: 'Pay securely',
        },
        description: {
          fr: 'Utilisez DRAVA pour tous vos paiements en ligne et transferts.',
          en: 'Use DRAVA for all your online payments and transfers.',
        },
      },
    },
    testimonials: {
      title: {
        fr: 'Ce que disent nos clients',
        en: 'What our customers say',
      },
      subtitle: {
        fr: 'Des milliers d\'utilisateurs satisfaits',
        en: 'Thousands of satisfied users',
      },
    },
    cta: {
      title: {
        fr: 'Prêt à commencer ?',
        en: 'Ready to get started?',
      },
      subtitle: {
        fr: 'Rejoignez DRAVA aujourd\'hui et transformez votre expérience de paiement.',
        en: 'Join DRAVA today and transform your payment experience.',
      },
      button: {
        fr: 'Créer un compte',
        en: 'Create an account',
      },
    },
  },

  // Forms and validation
  forms: {
    email: {
      label: {
        fr: 'Email',
        en: 'Email',
      },
      placeholder: {
        fr: 'Entrez votre email',
        en: 'Enter your email',
      },
      invalid: {
        fr: 'Email invalide',
        en: 'Invalid email',
      },
    },
    name: {
      label: {
        fr: 'Nom',
        en: 'Name',
      },
      placeholder: {
        fr: 'Entrez votre nom',
        en: 'Enter your name',
      },
    },
    cardNumber: {
      label: {
        fr: 'Numéro de carte',
        en: 'Card number',
      },
      placeholder: {
        fr: 'XXXX XXXX XXXX XXXX',
        en: 'XXXX XXXX XXXX XXXX',
      },
    },
    expiryDate: {
      label: {
        fr: 'Date d\'expiration',
        en: 'Expiry date',
      },
      placeholder: {
        fr: 'MM/AA',
        en: 'MM/YY',
      },
    },
    cvv: {
      label: {
        fr: 'CVV',
        en: 'CVV',
      },
      placeholder: {
        fr: '123',
        en: '123',
      },
    },
    amount: {
      label: {
        fr: 'Montant',
        en: 'Amount',
      },
      placeholder: {
        fr: 'Entrez le montant',
        en: 'Enter amount',
      },
    },
    currency: {
      label: {
        fr: 'Devise',
        en: 'Currency',
      },
    },
    message: {
      label: {
        fr: 'Message',
        en: 'Message',
      },
      placeholder: {
        fr: 'Entrez votre message',
        en: 'Enter your message',
      },
    },
    subscribe: {
      label: {
        fr: 'S\'abonner à la newsletter',
        en: 'Subscribe to newsletter',
      },
    },
    acceptTerms: {
      label: {
        fr: 'J\'accepte les conditions d\'utilisation',
        en: 'I accept the terms of use',
      },
    },
  },

  // Cards page
  cards: {
    title: {
      fr: 'Gestion des cartes',
      en: 'Card Management',
    },
    subtitle: {
      fr: 'Ajoutez et gérez vos cartes de paiement',
      en: 'Add and manage your payment cards',
    },
    addCard: {
      fr: 'Ajouter une carte',
      en: 'Add a card',
    },
    noCards: {
      fr: 'Vous n\'avez pas encore ajouté de carte',
      en: 'You haven\'t added any cards yet',
    },
    deleteCard: {
      fr: 'Supprimer la carte',
      en: 'Delete card',
    },
    setDefault: {
      fr: 'Définir par défaut',
      en: 'Set as default',
    },
    defaultCard: {
      fr: 'Carte par défaut',
      en: 'Default card',
    },
  },

  // Topup page
  topup: {
    title: {
      fr: 'Recharger votre compte',
      en: 'Top up your account',
    },
    subtitle: {
      fr: 'Ajoutez des fonds à votre compte DRAVA',
      en: 'Add funds to your DRAVA account',
    },
    selectAmount: {
      fr: 'Sélectionnez un montant',
      en: 'Select an amount',
    },
    customAmount: {
      fr: 'Montant personnalisé',
      en: 'Custom amount',
    },
    proceed: {
      fr: 'Procéder au paiement',
      en: 'Proceed to payment',
    },
    successMessage: {
      fr: 'Votre compte a été rechargé avec succès',
      en: 'Your account has been successfully topped up',
    },
    errorMessage: {
      fr: 'Une erreur est survenue lors de la recharge',
      en: 'An error occurred during the top-up',
    },
  },

  // Withdrawal page
  withdrawal: {
    title: {
      fr: 'Retrait de fonds',
      en: 'Withdraw funds',
    },
    subtitle: {
      fr: 'Transférez des fonds de votre compte DRAVA vers votre compte bancaire',
      en: 'Transfer funds from your DRAVA account to your bank account',
    },
    availableBalance: {
      fr: 'Solde disponible',
      en: 'Available balance',
    },
    bankAccount: {
      fr: 'Compte bancaire',
      en: 'Bank account',
    },
    addBankAccount: {
      fr: 'Ajouter un compte bancaire',
      en: 'Add a bank account',
    },
    withdrawalAmount: {
      fr: 'Montant du retrait',
      en: 'Withdrawal amount',
    },
    withdrawalFee: {
      fr: 'Frais de retrait',
      en: 'Withdrawal fee',
    },
    totalAmount: {
      fr: 'Montant total',
      en: 'Total amount',
    },
    confirmWithdrawal: {
      fr: 'Confirmer le retrait',
      en: 'Confirm withdrawal',
    },
    successMessage: {
      fr: 'Votre demande de retrait a été traitée avec succès',
      en: 'Your withdrawal request has been processed successfully',
    },
    errorMessage: {
      fr: 'Une erreur est survenue lors du traitement de votre demande',
      en: 'An error occurred while processing your request',
    },
  },

  // Balance page
  balance: {
    title: {
      fr: 'Solde du compte',
      en: 'Account Balance',
    },
    subtitle: {
      fr: 'Consultez votre solde et votre historique de transactions',
      en: 'View your balance and transaction history',
    },
    currentBalance: {
      fr: 'Solde actuel',
      en: 'Current balance',
    },
    pendingBalance: {
      fr: 'Solde en attente',
      en: 'Pending balance',
    },
    transactions: {
      fr: 'Transactions',
      en: 'Transactions',
    },
    noTransactions: {
      fr: 'Aucune transaction à afficher',
      en: 'No transactions to display',
    },
    transactionType: {
      fr: 'Type de transaction',
      en: 'Transaction type',
    },
    transactionDate: {
      fr: 'Date',
      en: 'Date',
    },
    transactionAmount: {
      fr: 'Montant',
      en: 'Amount',
    },
    transactionStatus: {
      fr: 'Statut',
      en: 'Status',
    },
    deposit: {
      fr: 'Dépôt',
      en: 'Deposit',
    },
    withdrawal: {
      fr: 'Retrait',
      en: 'Withdrawal',
    },
    payment: {
      fr: 'Paiement',
      en: 'Payment',
    },
    refund: {
      fr: 'Remboursement',
      en: 'Refund',
    },
    completed: {
      fr: 'Terminé',
      en: 'Completed',
    },
    pending: {
      fr: 'En attente',
      en: 'Pending',
    },
    failed: {
      fr: 'Échoué',
      en: 'Failed',
    },
  },

  // Footer
  footer: {
    companyDescription: {
      fr: "DRAVA est votre partenaire de confiance pour les paiements en ligne. Nous proposons des solutions de cartes virtuelles sécurisées pour tous vos besoins.",
      en: "DRAVA is your trusted partner for online payments. We offer secure virtual card solutions for all your needs.",
    },
    products: {
      title: {
        fr: 'Produits',
        en: 'Products',
      },
      payments: {
        fr: 'Paiements',
        en: 'Payments',
      },
      cards: {
        fr: 'Cartes',
        en: 'Cards',
      },
      transfers: {
        fr: 'Transferts',
        en: 'Transfers',
      },
      invoicing: {
        fr: 'Facturation',
        en: 'Invoicing',
      },
    },
    resources: {
      title: {
        fr: 'Ressources',
        en: 'Resources',
      },
      developers: {
        fr: 'Développeurs',
        en: 'Developers',
      },
      support: {
        fr: 'Support',
        en: 'Support',
      },
      blog: {
        fr: 'Blog',
        en: 'Blog',
      },
      statusPage: {
        fr: 'Statut des services',
        en: 'Status Page',
      },
    },
    company: {
      title: {
        fr: 'Entreprise',
        en: 'Company',
      },
      aboutUs: {
        fr: 'À propos',
        en: 'About Us',
      },
      careers: {
        fr: 'Carrières',
        en: 'Careers',
      },
      press: {
        fr: 'Presse',
        en: 'Press',
      },
      contact: {
        fr: 'Contact',
        en: 'Contact',
      },
    },
    legal: {
      title: {
        fr: 'Informations légales',
        en: 'Legal',
      },
      terms: {
        fr: 'Conditions d\'utilisation',
        en: 'Terms of Service',
      },
      privacy: {
        fr: 'Politique de confidentialité',
        en: 'Privacy Policy',
      },
      cookies: {
        fr: 'Politique de cookies',
        en: 'Cookie Policy',
      },
    },
    newsletter: {
      title: {
        fr: 'Abonnez-vous à notre newsletter',
        en: 'Subscribe to our newsletter',
      },
      placeholder: {
        fr: 'Votre adresse email',
        en: 'Your email address',
      },
      button: {
        fr: 'S\'abonner',
        en: 'Subscribe',
      },
      success: {
        fr: 'Merci pour votre inscription !',
        en: 'Thanks for subscribing!',
      },
    },
    copyright: {
      fr: "© 2025 DRAVA. Tous droits réservés.",
      en: "© 2025 DRAVA. All rights reserved.",
    },
  },

  // Error pages
  error: {
    notFound: {
      title: {
        fr: 'Page non trouvée',
        en: 'Page not found',
      },
      message: {
        fr: 'La page que vous recherchez n\'existe pas ou a été déplacée.',
        en: 'The page you are looking for doesn\'t exist or has been moved.',
      },
      button: {
        fr: 'Retour à l\'accueil',
        en: 'Back to home',
      },
    },
    paymentFailure: {
      title: {
        fr: 'Échec du paiement',
        en: 'Payment Failed',
      },
      message: {
        fr: 'Votre paiement n\'a pas pu être traité. Veuillez réessayer ou contacter le support DRAVA.',
        en: 'Your payment could not be processed. Please try again or contact DRAVA support.',
      },
      button: {
        fr: 'Réessayer',
        en: 'Try again',
      },
    },
    paymentSuccess: {
      title: {
        fr: 'Paiement réussi',
        en: 'Payment Successful',
      },
      message: {
        fr: 'Votre carte DRAVA sera générée et envoyée dans quelques instants.',
        en: 'Your DRAVA card will be generated and sent shortly.',
      },
      button: {
        fr: 'Continuer',
        en: 'Continue',
      },
    },
  },

  // Dialog notes
  dialog: {
    title: {
      fr: 'Ajouter une note',
      en: 'Add a note',
    },
    emailLabel: {
      fr: 'Email',
      en: 'Email',
    },
    emailPlaceholder: {
      fr: 'Entrez votre email',
      en: 'Enter your email',
    },
    invalidEmail: {
      fr: 'Email invalide',
      en: 'Invalid email',
    },
    noteLabel: {
      fr: 'Note',
      en: 'Note',
    },
    notePlaceholder: {
      fr: 'Entrez votre note',
      en: 'Enter your note',
    },
    confirmButton: {
      fr: 'Confirmer',
      en: 'Confirm',
    },
    cancelButton: {
      fr: 'Annuler',
      en: 'Cancel',
    },
  },

  // Soleas payment
  payment: {
    cardNumberLabel: {
      fr: 'Numéro de carte',
      en: 'Card number',
    },
    cardNumberPlaceholder: {
      fr: 'Entrez le numéro de carte',
      en: 'Enter card number',
    },
    expiryDateLabel: {
      fr: 'Date d\'expiration',
      en: 'Expiry date',
    },
    expiryDatePlaceholder: {
      fr: 'MM/AA',
      en: 'MM/YY',
    },
    cvvLabel: {
      fr: 'CVV',
      en: 'CVV',
    },
    cvvPlaceholder: {
      fr: '123',
      en: '123',
    },
    nameOnCardLabel: {
      fr: 'Nom sur la carte',
      en: 'Name on card',
    },
    nameOnCardPlaceholder: {
      fr: 'Entrez le nom sur la carte',
      en: 'Enter name on card',
    },
    payButton: {
      fr: 'Payer',
      en: 'Pay',
    },
    processingPayment: {
      fr: 'Traitement du paiement...',
      en: 'Processing payment...',
    },
    paymentSuccessful: {
      fr: 'Paiement réussi',
      en: 'Payment successful',
    },
    paymentFailed: {
      fr: 'Échec du paiement',
      en: 'Payment failed',
    },
  },
};

// Helper function to get translation
export const getTranslation = (path: string, language: Language) => {
  const keys = path.split('.');
  let value: any = translations;

  for (const key of keys) {
    if (value && value[key]) {
      value = value[key];
    } else {
      console.warn(`Translation not found for path: ${path}`);
      return path;
    }
  }

  if (value && value[language]) {
    return value[language];
  }

  console.warn(`Translation not found for path: ${path} in language: ${language}`);
  return path;
};

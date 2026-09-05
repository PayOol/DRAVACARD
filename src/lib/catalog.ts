export interface CatalogCard {
  id: string;
  name: {
    fr: string;
    en: string;
  };
  price: string;
  currency: string;
  icon: "visa" | "mastercard";
  color: string;
  recommended?: boolean;
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

export const cards: CatalogCard[] = [
  {
    id: "visa-basic",
    name: {
      fr: "VISA BASIQUE",
      en: "BASIC VISA",
    },
    price: "5000",
    currency: "Fcfa",
    icon: "visa",
    color: "blue",
    position: 1,
    description: {
      fr: "Parfait pour commencer - Carte virtuelle prépayée sans frais mensuels",
      en: "Perfect to start - Prepaid virtual card with no monthly fees",
    },
    features: {
      fr: [
        "Carte prépayée",
        "3D Secure",
        "Sans vérification KYC",
        "Sans frais mensuels",
        "3 années de validité",
        "Idéal pour les achats en ligne",
      ],
      en: [
        "Prepaid card",
        "3D Secure",
        "No KYC verification",
        "No monthly fees",
        "3 years validity",
        "Ideal for online purchases",
      ],
    },
  },
  {
    id: "mastercard-basic",
    name: {
      fr: "MASTERCARD BASIQUE",
      en: "BASIC MASTERCARD",
    },
    price: "6000",
    currency: "Fcfa",
    icon: "mastercard",
    color: "teal",
    recommended: true,
    position: 2,
    description: {
      fr: "Notre recommandation - Offre le meilleur rapport qualité/prix",
      en: "Our recommendation - Offers the best value for money",
    },
    features: {
      fr: [
        "Carte prépayée",
        "3D Secure",
        "Sans vérification KYC",
        "Sans frais mensuels",
        "3 années de validité",
        "Acceptée partout",
      ],
      en: [
        "Prepaid card",
        "3D Secure",
        "No KYC verification",
        "No monthly fees",
        "3 years validity",
        "Accepted everywhere",
      ],
    },
  },
  {
    id: "mastercard-premium",
    name: {
      fr: "MASTERCARD PREMIUM",
      en: "PREMIUM MASTERCARD",
    },
    price: "8500",
    currency: "Fcfa",
    icon: "mastercard",
    color: "emerald",
    position: 3,
    description: {
      fr: "Fonctionnalités avancées - Idéal pour des achats plus importants",
      en: "Advanced features - Ideal for larger purchases",
    },
    features: {
      fr: [
        "Carte de débit",
        "3D Secure",
        "Achats sur Amazon",
        "Achats sur Alibaba",
        "Retraits possibles (Cameroun uniquement)",
        "Compatible PayPal",
      ],
      en: [
        "Debit card",
        "3D Secure",
        "Amazon purchases",
        "Alibaba purchases",
        "Withdrawals possible (Cameroon only)",
        "PayPal compatible",
      ],
    },
    negativeFeatures: {
      fr: ["Ne prend pas en charge les retraits PayPal"],
      en: ["Does not support PayPal withdrawals"],
    },
  },
  {
    id: "mastercard-platinum",
    name: {
      fr: "MASTERCARD PLATINIUM",
      en: "PLATINUM MASTERCARD",
    },
    price: "15000",
    currency: "Fcfa",
    icon: "mastercard",
    color: "gray",
    position: 4,
    description: {
      fr: "Expérience premium - Sans limite avec des avantages exclusifs",
      en: "Premium experience - No limits with exclusive benefits",
    },
    features: {
      fr: [
        "Carte de débit",
        "3D Secure",
        "Aucun plafond sur les recharges",
        "Compatible Google Pay",
        "Compatible Apple Pay",
        "🎁 Bonus de $5 offert",
      ],
      en: [
        "Debit card",
        "3D Secure",
        "No ceiling on reloads",
        "Google Pay compatible",
        "Apple Pay compatible",
        "🎁 $5 bonus offered",
      ],
    },
  },
];

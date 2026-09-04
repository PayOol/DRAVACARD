export type Language = 'fr' | 'en'

export const translations = {
  common: {
    french: {
      fr: 'Français',
      en: 'French',
    },
    english: {
      fr: 'Anglais',
      en: 'English',
    },
  },
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
  home: {
    howItWorks: {
      title: {
        fr: 'Comment ça marche',
        en: 'How It Works',
      },
    },
  },
  footer: {
    products: {
      title: {
        fr: 'Produits',
        en: 'Products',
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
    },
    legal: {
      terms: {
        fr: "Conditions d'utilisation",
        en: 'Terms of Service',
      },
      privacy: {
        fr: 'Politique de confidentialité',
        en: 'Privacy Policy',
      },
    },
    newsletter: {
      title: {
        fr: 'Newsletter temporairement indisponible',
        en: 'Newsletter temporarily unavailable',
      },
      placeholder: {
        fr: 'Collecte désactivée',
        en: 'Collection disabled',
      },
      button: {
        fr: 'Indisponible',
        en: 'Unavailable',
      },
    },
    copyright: {
      fr: '© 2026 DRAVA. Tous droits réservés.',
      en: '© 2026 DRAVA. All rights reserved.',
    },
  },
}

export const getTranslation = (translationPath: string, language: Language) => {
  const keys = translationPath.split('.')
  let value: unknown = translations

  for (const key of keys) {
    if (typeof value !== 'object' || value === null || !(key in value)) {
      console.warn(`Translation not found for path: ${translationPath}`)
      return translationPath
    }
    value = (value as Record<string, unknown>)[key]
  }

  if (typeof value !== 'object' || value === null || !(language in value)) {
    return translationPath
  }

  const localizedValue = (value as Record<Language, unknown>)[language]
  return typeof localizedValue === 'string' ? localizedValue : translationPath
}

"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, ChevronRight, Check } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/lib/language-context'

// Type pour les questions
interface FAQItem {
  question: {
    fr: string
    en: string
  }
  answer: {
    fr: string
    en: string
  }
  category: string
}

export default function FAQPage() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('')
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
  const [activeCategory, setActiveCategory] = useState(language === 'fr' ? 'Toutes' : 'All')

  // Définir les catégories
  const categories = {
    fr: [
      'Toutes',
      'Cartes virtuelles',
      'Paiements',
      'Recharges',
      'Sécurité'
    ],
    en: [
      'All',
      'Virtual Cards',
      'Payments',
      'Top-ups',
      'Security'
    ]
  }

  // Map des catégories pour la traduction
  const categoryMap = {
    'Toutes': 'All',
    'Cartes virtuelles': 'Virtual Cards',
    'Paiements': 'Payments',
    'Recharges': 'Top-ups',
    'Sécurité': 'Security',
    'All': 'Toutes',
    'Virtual Cards': 'Cartes virtuelles',
    'Payments': 'Paiements',
    'Top-ups': 'Recharges',
    'Security': 'Sécurité'
  }

  // Questions fréquentes par catégorie
  const faqItems: FAQItem[] = [
    {
      question: {
        fr: "Qu'est-ce qu'une carte virtuelle DRAVA ?",
        en: "What is a DRAVA virtual card?"
      },
      answer: {
        fr: "Une carte virtuelle DRAVA est une carte de paiement numérique qui fonctionne comme une carte bancaire classique pour les achats en ligne. Elle possède un numéro à 16 chiffres, une date d'expiration et un code CVV. La principale différence est qu'elle n'existe pas physiquement et est conçue spécifiquement pour les transactions en ligne.",
        en: "A DRAVA virtual card is a digital payment card that works like a traditional bank card for online purchases. It has a 16-digit number, an expiration date, and a CVV code. The main difference is that it doesn't exist physically and is specifically designed for online transactions."
      },
      category: "Cartes virtuelles"
    },
    {
      question: {
        fr: "Quels sont les types de cartes disponibles ?",
        en: "What types of cards are available?"
      },
      answer: {
        fr: "Nous proposons plusieurs types de cartes virtuelles : VISA Basique, Mastercard Basique, Mastercard Premium et Mastercard Platinium. Chaque carte offre différentes limites de transaction et fonctionnalités supplémentaires adaptées à vos besoins spécifiques.",
        en: "We offer several types of virtual cards: Basic VISA, Basic Mastercard, Premium Mastercard, and Platinum Mastercard. Each card offers different transaction limits and additional features tailored to your specific needs."
      },
      category: "Cartes virtuelles"
    },
    {
      question: {
        fr: "Où puis-je utiliser ma carte virtuelle ?",
        en: "Where can I use my virtual card?"
      },
      answer: {
        fr: "Votre carte virtuelle DRAVA peut être utilisée pour effectuer des achats sur la plupart des sites web et plateformes en ligne qui acceptent les paiements par carte Visa ou Mastercard. Cela inclut les boutiques en ligne, les abonnements, les services de streaming et bien plus encore.",
        en: "Your DRAVA virtual card can be used to make purchases on most websites and online platforms that accept Visa or Mastercard payments. This includes online stores, subscriptions, streaming services, and much more."
      },
      category: "Cartes virtuelles"
    },
    {
      question: {
        fr: "Y a-t-il des sites où je ne peux pas utiliser ma carte ?",
        en: "Are there any sites where I cannot use my card?"
      },
      answer: {
        fr: "Oui, les cartes DRAVA ne peuvent pas être utilisées sur les plateformes de crypto-monnaies, les sites de paris sportifs, Wise et les sites pour adultes. Ces restrictions sont en place conformément à nos conditions d'utilisation et aux réglementations bancaires.",
        en: "Yes, DRAVA cards cannot be used on cryptocurrency platforms, sports betting sites, Wise, and adult websites. These restrictions are in place in accordance with our terms of use and banking regulations."
      },
      category: "Cartes virtuelles"
    },
    {
      question: {
        fr: "Quelle est la durée de validité d'une carte ?",
        en: "What is the validity period of a card?"
      },
      answer: {
        fr: "Toutes nos cartes virtuelles ont une durée de validité de 3 ans à partir de la date d'émission. Après cette période, vous devrez obtenir une nouvelle carte. Vous serez notifié par email avant l'expiration de votre carte.",
        en: "All our virtual cards have a validity period of 3 years from the date of issue. After this period, you will need to obtain a new card. You will be notified by email before your card expires."
      },
      category: "Cartes virtuelles"
    },
    {
      question: {
        fr: "Comment fonctionne le paiement pour obtenir une carte ?",
        en: "How does payment work to obtain a card?"
      },
      answer: {
        fr: "Le paiement pour obtenir une carte virtuelle peut être effectué par divers moyens, notamment par mobile money, transfert bancaire ou même par crypto-monnaies. Une fois le paiement confirmé, votre carte est générée instantanément et les détails vous sont envoyés par email.",
        en: "Payment to obtain a virtual card can be made through various means, including mobile money, bank transfer, or even cryptocurrencies. Once the payment is confirmed, your card is generated instantly and the details are sent to you by email."
      },
      category: "Paiements"
    },
    {
      question: {
        fr: "Les paiements sont-ils sécurisés ?",
        en: "Are payments secure?"
      },
      answer: {
        fr: "Oui, tous les paiements effectués sur notre plateforme sont sécurisés par un cryptage SSL avancé. De plus, nous utilisons des passerelles de paiement fiables et reconnues pour traiter toutes les transactions, garantissant ainsi la sécurité de vos informations financières.",
        en: "Yes, all payments made on our platform are secured by advanced SSL encryption. Additionally, we use reliable and recognized payment gateways to process all transactions, ensuring the security of your financial information."
      },
      category: "Paiements"
    },
    {
      question: {
        fr: "Quels sont les frais associés aux cartes virtuelles ?",
        en: "What are the fees associated with virtual cards?"
      },
      answer: {
        fr: "Le coût d'acquisition d'une carte varie selon le type de carte que vous choisissez. Une fois la carte obtenue, il n'y a pas de frais mensuels. Des frais d'échec de 0,3$ peuvent s'appliquer par transaction refusée. Consultez notre page de tarification pour plus de détails.",
        en: "The acquisition cost of a card varies depending on the type of card you choose. Once the card is obtained, there are no monthly fees. Failure fees of $0.3 may apply per declined transaction. Check our pricing page for more details."
      },
      category: "Paiements"
    },
    {
      question: {
        fr: "Comment puis-je recharger ma carte virtuelle ?",
        en: "How can I top up my virtual card?"
      },
      answer: {
        fr: "Vous pouvez recharger votre carte virtuelle directement depuis notre plateforme. Choisissez l'option de recharge, sélectionnez la carte à recharger, choisissez le montant et la méthode de paiement, puis suivez les instructions pour compléter la transaction.",
        en: "You can top up your virtual card directly from our platform. Choose the top-up option, select the card to be topped up, choose the amount and payment method, then follow the instructions to complete the transaction."
      },
      category: "Recharges"
    },
    {
      question: {
        fr: "Y a-t-il une limite de montant pour les recharges ?",
        en: "Is there a limit on the amount for top-ups?"
      },
      answer: {
        fr: "Oui, les limites de recharge dépendent du type de carte que vous possédez. Les cartes basiques ont généralement une limite de solde de 100 000$, tandis que les cartes premium et platinium peuvent avoir des limites plus élevées. Consultez les détails spécifiques disponibles avec votre carte.",
        en: "Yes, top-up limits depend on the type of card you have. Basic cards generally have a balance limit of $100,000, while premium and platinum cards may have higher limits. Check the specific details available with your card."
      },
      category: "Recharges"
    },
    {
      question: {
        fr: "Que faire si ma transaction est refusée ?",
        en: "What should I do if my transaction is declined?"
      },
      answer: {
        fr: "Si votre transaction est refusée, vérifiez d'abord que vous avez saisi correctement tous les détails de votre carte. Assurez-vous également que vous disposez de fonds suffisants et que vous n'avez pas dépassé les limites de transaction. Si le problème persiste, contactez notre service client pour obtenir de l'aide.",
        en: "If your transaction is declined, first check that you have entered all your card details correctly. Also make sure that you have sufficient funds and that you have not exceeded the transaction limits. If the problem persists, contact our customer service for assistance."
      },
      category: "Paiements"
    },
    {
      question: {
        fr: "Mes informations personnelles sont-elles en sécurité ?",
        en: "Is my personal information secure?"
      },
      answer: {
        fr: "Absolument. La sécurité de vos données personnelles est notre priorité absolue. Nous utilisons des protocoles de cryptage avancés pour protéger toutes les informations stockées sur nos serveurs. De plus, nous ne partageons jamais vos données avec des tiers sans votre consentement explicite.",
        en: "Absolutely. The security of your personal data is our top priority. We use advanced encryption protocols to protect all information stored on our servers. Additionally, we never share your data with third parties without your explicit consent."
      },
      category: "Sécurité"
    },
    {
      question: {
        fr: "Comment puis-je signaler une transaction non autorisée ?",
        en: "How can I report an unauthorized transaction?"
      },
      answer: {
        fr: "Si vous constatez une transaction que vous n'avez pas autorisée, contactez immédiatement notre service client par email à contact.drava@gmail.com. Nous gèlerons temporairement votre carte pour éviter d'autres transactions frauduleuses et ouvrirons une enquête.",
        en: "If you notice a transaction that you did not authorize, immediately contact our customer service by email at contact.drava@gmail.com. We will temporarily freeze your card to prevent other fraudulent transactions and open an investigation."
      },
      category: "Sécurité"
    }
  ]

  // Traduire la catégorie active si la langue change
  const displayedCategories = language === 'fr' ? categories.fr : categories.en;

  // Filtrer les questions en fonction de la recherche et de la catégorie
  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = item.question[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.answer[language].toLowerCase().includes(searchQuery.toLowerCase())

    const categoryInCurrentLanguage = language === 'fr'
      ? item.category
      : categoryMap[item.category as keyof typeof categoryMap];

    const activeCategoryInItemLanguage = language === 'fr'
      ? activeCategory
      : categoryMap[activeCategory as keyof typeof categoryMap];

    const matchesCategory = activeCategory === (language === 'fr' ? 'Toutes' : 'All') ||
                            categoryInCurrentLanguage === activeCategoryInItemLanguage;

    return matchesSearch && matchesCategory;
  })

  // Fonction pour basculer l'état d'ouverture d'un accordéon
  const toggleAccordion = (index: number) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <MainLayout>
      {/* Hero section avec recherche */}
      <section className="pt-20 md:pt-28 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {language === 'fr'
                ? "Foire Aux Questions DRAVA"
                : "DRAVA FAQ"}
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {language === 'fr'
                ? "Trouvez les réponses aux questions les plus fréquentes sur les services DRAVA"
                : "Find answers to the most frequently asked questions about DRAVA services"}
            </motion.p>

            <motion.div
              className="relative max-w-2xl mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'fr' ? "Rechercher une question..." : "Search for a question..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section principale des FAQ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar des catégories */}
            <motion.div
              className="lg:w-1/4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-lg font-bold mb-4">{language === 'fr' ? "Catégories" : "Categories"}</h2>
                <Separator className="mb-4" />
                <ul className="space-y-2">
                  {displayedCategories.map((category, index) => (
                    <li key={category}>
                      <button
                        onClick={() => setActiveCategory(category)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                          activeCategory === category
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {activeCategory === category ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        {category}
                        {category === (language === 'fr' ? 'Toutes' : 'All') ? (
                          <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                            {faqItems.length}
                          </span>
                        ) : (
                          <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                            {language === 'fr'
                              ? faqItems.filter(item => item.category === category).length
                              : faqItems.filter(item => categoryMap[item.category as keyof typeof categoryMap] === category).length
                            }
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">
                    {language === 'fr' ? "Besoin d'aide supplémentaire?" : "Need additional help?"}
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">
                    {language === 'fr'
                      ? "Notre équipe est disponible pour répondre à toutes vos questions."
                      : "Our team is available to answer all your questions."}
                  </p>
                  <Link href="mailto:contact.drava@gmail.com">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                      {language === 'fr' ? "Contacter le support" : "Contact support"}
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Liste des questions/réponses */}
            <motion.div
              className="lg:w-3/4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredFAQs.length > 0 ? (
                  <div>
                    {filteredFAQs.map((item, index) => (
                      <div key={`${item.question[language]}-${index}`} className="border-b border-gray-100 last:border-b-0">
                        <button
                          onClick={() => toggleAccordion(index)}
                          className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{item.question[language]}</span>
                            <span className="ml-3 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {language === 'fr' ? item.category : categoryMap[item.category as keyof typeof categoryMap]}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              openItems[index] ? 'transform rotate-180' : ''
                            }`}
                          />
                        </button>
                        <AnimatePresence>
                          {openItems[index] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 py-4 bg-gray-50 text-gray-700">
                                <p>{item.answer[language]}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-gray-500 mb-4">
                      {language === 'fr' ? "Aucun résultat pour votre recherche" : "No results for your search"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setActiveCategory(language === 'fr' ? 'Toutes' : 'All')
                      }}
                    >
                      {language === 'fr' ? "Réinitialiser la recherche" : "Reset search"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 bg-slate-50">
        <div class="container mx-auto px-4">
          <div class="max-w-3xl mx-auto text-center">
            <motion.h2
              class="text-3xl font-bold mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {language === 'fr' ? "Prêt à commencer avec DRAVA ?" : "Ready to start with DRAVA?"}
            </motion.h2>
            <motion.p
              class="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {language === 'fr'
                ? "Obtenez votre carte virtuelle DRAVA en quelques minutes."
                : "Get your DRAVA virtual card in just a few minutes."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/cards">
                <Button class="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                  {language === 'fr' ? "Obtenir ma carte" : "Get my card"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

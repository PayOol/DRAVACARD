"use client"

import { motion } from 'framer-motion'
import { CheckCircle, DollarSign, CreditCard, Smartphone, ShoppingCart, Shield } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

export default function HowItWorksPage() {
  const { language } = useLanguage();

  // Variantes d'animation pour les éléments
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  // Données sur les étapes du fonctionnement
  const steps = [
    {
      title: language === 'fr' ? "Choisissez votre carte" : "Choose your card",
      description: language === 'fr'
        ? "Sélectionnez parmi notre gamme de cartes virtuelles Visa et Mastercard selon vos besoins. Options disponibles pour tous les budgets et usages."
        : "Select from our range of Visa and Mastercard virtual cards according to your needs. Options available for all budgets and uses.",
      icon: <CreditCard className="h-10 w-10 text-white" />,
      color: "bg-blue-600",
      image: "https://images.unsplash.com/photo-1556155092-490a1ba16284?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: language === 'fr' ? "Personnalisez les options" : "Customize options",
      description: language === 'fr'
        ? "Choisissez les options spécifiques de votre carte selon vos besoins, comme les limites de transaction et les fonctionnalités de sécurité."
        : "Choose specific card options according to your needs, such as transaction limits and security features.",
      icon: <CreditCard className="h-10 w-10 text-white" />,
      color: "bg-indigo-600",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: language === 'fr' ? "Effectuez le paiement" : "Make the payment",
      description: language === 'fr'
        ? "Payez votre carte en utilisant nos différentes méthodes de paiement sécurisées : mobile money, crypto-monnaies ou transferts bancaires."
        : "Pay for your card using our various secure payment methods: mobile money, cryptocurrencies, or bank transfers.",
      icon: <DollarSign className="h-10 w-10 text-white" />,
      color: "bg-green-600",
      image: "https://images.unsplash.com/photo-1559526324-593bc073d938?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: language === 'fr' ? "Recevez vos détails" : "Receive your details",
      description: language === 'fr'
        ? "Obtenez instantanément les détails de votre carte virtuelle par email. Prête à être utilisée immédiatement pour vos achats en ligne."
        : "Get the details of your virtual card instantly by email. Ready to be used immediately for your online purchases.",
      icon: <Smartphone className="h-10 w-10 text-white" />,
      color: "bg-purple-600",
      image: "https://images.unsplash.com/photo-1565492206137-0797aa0168a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: language === 'fr' ? "Utilisez votre carte" : "Use your card",
      description: language === 'fr'
        ? "Effectuez des achats en ligne partout dans le monde. Votre carte est acceptée sur la plupart des sites et plateformes internationaux."
        : "Make online purchases anywhere in the world. Your card is accepted on most international websites and platforms.",
      icon: <ShoppingCart className="h-10 w-10 text-white" />,
      color: "bg-rose-600",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    }
  ]

  // Avantages de l'utilisation de DRAVA
  const benefits = [
    {
      title: language === 'fr' ? "Transactions sécurisées" : "Secure transactions",
      description: language === 'fr'
        ? "Protection par authentification 3D Secure et cryptage SSL avancé pour chaque transaction."
        : "Protection through 3D Secure authentication and advanced SSL encryption for every transaction.",
      icon: <Shield className="h-6 w-6 text-blue-600" />
    },
    {
      title: language === 'fr' ? "Anonymat préservé" : "Preserved anonymity",
      description: language === 'fr'
        ? "Vos informations personnelles restent privées lors des achats en ligne."
        : "Your personal information remains private during online purchases.",
      icon: <CheckCircle className="h-6 w-6 text-blue-600" />
    },
    {
      title: language === 'fr' ? "Recharge facilitée" : "Easy top-up",
      description: language === 'fr'
        ? "Rechargez votre carte à tout moment depuis notre plateforme en quelques clics."
        : "Reload your card at any time from our platform in just a few clicks.",
      icon: <DollarSign className="h-6 w-6 text-blue-600" />
    },
    {
      title: language === 'fr' ? "Support réactif" : "Responsive support",
      description: language === 'fr'
        ? "Notre équipe est disponible 24/7 pour répondre à toutes vos questions."
        : "Our team is available 24/7 to answer all your questions.",
      icon: <Smartphone className="h-6 w-6 text-blue-600" />
    }
  ]

  return (
    <MainLayout>
      {/* Hero section avec bannière */}
      <section className="pt-20 md:pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {language === 'fr' ? "Comment fonctionne DRAVA ?" : "How does DRAVA work?"}
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {language === 'fr'
                ? "Découvrez comment notre service de cartes virtuelles simplifie vos achats en ligne et sécurise vos paiements internationaux en quelques étapes simples."
                : "Discover how our virtual card service simplifies your online shopping and secures your international payments in a few simple steps."}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Section des étapes */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {language === 'fr' ? "Un processus simple en 5 étapes" : "A simple 5-step process"}
          </motion.h2>

          <motion.div
            className="grid gap-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className={`flex flex-col md:flex-row ${index % 2 === 1 ? 'md:flex-row-reverse' : ''} gap-8 items-center`}
                variants={itemVariants}
              >
                <div className="md:w-1/2">
                  <div className="relative">
                    <div className="rounded-lg overflow-hidden shadow-xl">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                    <div className={`absolute -top-4 -left-4 ${step.color} rounded-full p-4 shadow-lg`}>
                      {step.icon}
                    </div>
                  </div>
                </div>

                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                      {index + 1}
                    </div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {step.description}
                  </p>
                  {index === 0 && (
                    <Link href="/cards">
                      <Button className="bg-blue-600">
                        {language === 'fr' ? "Voir nos cartes" : "View our cards"}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section des avantages */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-3xl font-bold text-center mb-12"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === 'fr' ? "Pourquoi choisir DRAVA ?" : "Why choose DRAVA?"}
            </motion.h2>

            <motion.div
              className="grid md:grid-cols-2 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  className="bg-white p-6 rounded-xl shadow-sm"
                  variants={itemVariants}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-lg mr-4">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-12 text-center"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Link href="/cards">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                  {language === 'fr' ? "Commencer maintenant" : "Start now"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ section avec lien vers la page FAQ complète */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl font-bold mb-6"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === 'fr' ? "Vous avez des questions ?" : "Do you have questions?"}
            </motion.h2>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {language === 'fr'
                ? "Questions ? N'hésitez pas à nous contacter à contact.drava@gmail.com pour obtenir de l'aide."
                : "Questions? Don't hesitate to contact us at contact.drava@gmail.com for assistance."}
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Link href="/faq">
                <Button variant="outline" className="px-6">
                  {language === 'fr' ? "Consulter la FAQ" : "Check the FAQ"}
                </Button>
              </Link>
              <Link href="mailto:support@drava.net">
                <Button className="bg-blue-600 hover:bg-blue-700 px-6">
                  {language === 'fr' ? "Contacter le support" : "Contact support"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

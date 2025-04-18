"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, Users, DollarSign, TrendingUp, BadgePercent, GanttChart, LineChart, UserCheck, MailIcon } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/lib/language-context'

export default function ResellerPage() {
  const { language } = useLanguage();

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    experience: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Les avantages du programme revendeur
  const benefits = [
    {
      title: language === 'fr' ? "Commissions attractives" : "Attractive commissions",
      description: language === 'fr'
        ? "Gagnez jusqu'à 15% sur chaque carte virtuelle vendue et 5% sur les recharges effectuées par vos clients."
        : "Earn up to 15% on each virtual card sold and 5% on recharges made by your customers.",
      icon: <DollarSign className="h-8 w-8 text-green-600" />
    },
    {
      title: language === 'fr' ? "Tableau de bord dédié" : "Dedicated dashboard",
      description: language === 'fr'
        ? "Accédez à un tableau de bord intuitif pour suivre vos ventes, commissions et performances en temps réel."
        : "Access an intuitive dashboard to track your sales, commissions, and performance in real-time.",
      icon: <GanttChart className="h-8 w-8 text-indigo-600" />
    },
    {
      title: language === 'fr' ? "Remises exclusives" : "Exclusive discounts",
      description: language === 'fr'
        ? "Bénéficiez de remises spéciales sur les cartes en fonction de votre volume mensuel de ventes."
        : "Get special discounts on cards based on your monthly sales volume.",
      icon: <BadgePercent className="h-8 w-8 text-orange-600" />
    },
    {
      title: language === 'fr' ? "Support prioritaire" : "Priority support",
      description: language === 'fr'
        ? "Contactez directement notre équipe de support dédiée aux revendeurs pour une assistance rapide."
        : "Contact our dedicated reseller support team directly for quick assistance.",
      icon: <UserCheck className="h-8 w-8 text-blue-600" />
    },
    {
      title: language === 'fr' ? "Outils marketing" : "Marketing tools",
      description: language === 'fr'
        ? "Obtenez des supports de vente et matériel promotionnel pour développer votre activité."
        : "Get sales materials and promotional assets to grow your business.",
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />
    },
    {
      title: language === 'fr' ? "Formation complète" : "Complete training",
      description: language === 'fr'
        ? "Participez à nos sessions de formation pour maîtriser notre plateforme et maximiser vos ventes."
        : "Participate in our training sessions to master our platform and maximize your sales.",
      icon: <Users className="h-8 w-8 text-red-600" />
    }
  ]

  // Structure des paliers de commission
  const tiers = [
    {
      level: language === 'fr' ? "Débutant" : "Beginner",
      requirements: language === 'fr' ? "0-10 cartes/mois" : "0-10 cards/month",
      cardCommission: "7%",
      rechargeCommission: "2%",
      color: "from-blue-400 to-blue-500"
    },
    {
      level: language === 'fr' ? "Intermédiaire" : "Intermediate",
      requirements: language === 'fr' ? "11-30 cartes/mois" : "11-30 cards/month",
      cardCommission: "10%",
      rechargeCommission: "3%",
      color: "from-green-400 to-green-500"
    },
    {
      level: language === 'fr' ? "Avancé" : "Advanced",
      requirements: language === 'fr' ? "31-50 cartes/mois" : "31-50 cards/month",
      cardCommission: "12%",
      rechargeCommission: "4%",
      color: "from-orange-400 to-orange-500"
    },
    {
      level: language === 'fr' ? "Expert" : "Expert",
      requirements: language === 'fr' ? "51+ cartes/mois" : "51+ cards/month",
      cardCommission: "15%",
      rechargeCommission: "5%",
      color: "from-purple-400 to-purple-600"
    }
  ]

  // Fonction pour gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation basique
    if (!formState.fullName || !formState.email || !formState.phone) {
      setError(language === 'fr'
        ? "Veuillez remplir tous les champs obligatoires"
        : "Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    // Simuler une soumission API
    try {
      // Dans une vraie application, cette partie appellerait une API
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSubmitted(true)
    } catch (err) {
      setError(language === 'fr'
        ? "Une erreur est survenue lors de la soumission. Veuillez réessayer."
        : "An error occurred while submitting. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour gérer les modifications de champ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <MainLayout>
      {/* Hero section */}
      <section className="pt-20 md:pt-28 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {language === 'fr'
                  ? "Programme Revendeur DRAVA"
                  : "DRAVA Reseller Program"}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {language === 'fr'
                  ? "Rejoignez notre réseau de revendeurs et générez des revenus supplémentaires en distribuant les cartes DRAVA"
                  : "Join our reseller network and generate additional income by distributing DRAVA cards"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#apply">
                  <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                    {language === 'fr' ? "Devenir revendeur" : "Become a reseller"}
                  </Button>
                </a>
                <Link href="/howitwork">
                  <Button variant="outline" className="px-8 py-6 text-lg">
                    {language === 'fr' ? "En savoir plus" : "Learn more"}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section des avantages */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              {language === 'fr' ? "Pourquoi devenir revendeur ?" : "Why become a reseller?"}
            </h2>
            <p className="text-lg text-gray-600">
              {language === 'fr'
                ? "Notre programme revendeur vous offre de nombreux avantages pour développer votre activité et générer des revenus supplémentaires."
                : "Our reseller program offers you many benefits to grow your business and generate additional income."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gray-50">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section de la structure des commissions */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              {language === 'fr' ? "Structure des commissions" : "Commission Structure"}
            </h2>
            <p className="text-lg text-gray-600">
              {language === 'fr'
                ? "Nos taux de commission sont parmi les plus compétitifs du marché. Plus vous vendez, plus vous gagnez !"
                : "Our commission rates are among the most competitive in the market. The more you sell, the more you earn!"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.level}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
              >
                <div className={`bg-gradient-to-r ${tier.color} text-white p-4`}>
                  <h3 className="text-xl font-bold">{tier.level}</h3>
                  <p className="text-white/80 text-sm">{tier.requirements}</p>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">
                      {language === 'fr' ? "Commission sur les cartes" : "Card commission"}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">{tier.cardCommission}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">
                      {language === 'fr' ? "Commission sur les recharges" : "Recharge commission"}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">{tier.rechargeCommission}</p>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">
                        {language === 'fr' ? "Paiement mensuel" : "Monthly payment"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">
                        {language === 'fr' ? "Suivi en temps réel" : "Real-time tracking"}
                      </span>
                    </li>
                    {index > 0 && (
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {language === 'fr' ? "Support prioritaire" : "Priority support"}
                        </span>
                      </li>
                    )}
                    {index > 1 && (
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {language === 'fr' ? "Outils marketing premium" : "Premium marketing tools"}
                        </span>
                      </li>
                    )}
                    {index > 2 && (
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {language === 'fr' ? "Partenaire privilégié" : "Privileged partner"}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-12 bg-blue-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start">
              <LineChart className="h-8 w-8 text-blue-600 mr-4 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  {language === 'fr' ? "Croissance des commissions" : "Commission Growth"}
                </h3>
                <p className="text-blue-700">
                  {language === 'fr'
                    ? "Notre système dynamique de commissions vous permet de progresser entre les niveaux en fonction de vos performances mensuelles. Les paliers sont réévalués chaque mois pour vous offrir les meilleures opportunités de revenus."
                    : "Our dynamic commission system allows you to progress between levels based on your monthly performance. Tiers are reevaluated each month to offer you the best revenue opportunities."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages - Version simple */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              {language === 'fr' ? "Ce que disent nos revendeurs" : "What our resellers say"}
            </h2>
            <p className="text-lg text-gray-600">
              {language === 'fr'
                ? "Découvrez les expériences de ceux qui ont déjà rejoint notre programme."
                : "Discover the experiences of those who have already joined our program."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gray-50 p-6 rounded-xl"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">JD</span>
                </div>
                <div>
                  <h4 className="font-bold">John Doe</h4>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? "Revendeur depuis 2 ans" : "Reseller for 2 years"}
                  </p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                {language === 'fr'
                  ? "\"DRAVA m'a permis de développer une nouvelle activité très rentable. Le support est réactif et les commissions sont toujours payées à temps.\""
                  : "\"DRAVA has allowed me to develop a very profitable new business. The support is responsive and commissions are always paid on time.\""}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-50 p-6 rounded-xl"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold">SM</span>
                </div>
                <div>
                  <h4 className="font-bold">Sophie Martin</h4>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? "Revendeuse depuis 1 an" : "Reseller for 1 year"}
                  </p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                {language === 'fr'
                  ? "\"J'ai commencé comme débutante et j'ai atteint le niveau Expert en seulement 8 mois. Les outils marketing fournis par DRAVA ont vraiment fait la différence.\""
                  : "\"I started as a beginner and reached Expert level in just 8 months. The marketing tools provided by DRAVA really made the difference.\""}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-50 p-6 rounded-xl"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <span className="text-purple-600 font-bold">AT</span>
                </div>
                <div>
                  <h4 className="font-bold">Ahmed Touré</h4>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? "Revendeur depuis 6 mois" : "Reseller for 6 months"}
                  </p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                {language === 'fr'
                  ? "\"La demande pour les cartes virtuelles est énorme. Avec DRAVA, j'ai pu répondre à ce besoin et générer des revenus significatifs à temps partiel.\""
                  : "\"The demand for virtual cards is huge. With DRAVA, I was able to respond to this need and generate significant part-time income.\""}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Formulaire d'inscription */}
      <section id="apply" className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">
                  {language === 'fr' ? "Rejoignez notre réseau de revendeurs" : "Join our reseller network"}
                </h2>
                <p className="mb-6 text-blue-100">
                  {language === 'fr'
                    ? "Complétez le formulaire ci-contre pour soumettre votre candidature au programme revendeur DRAVA. Notre équipe vous contactera sous 48h."
                    : "Complete the form to submit your application to the DRAVA reseller program. Our team will contact you within 48 hours."}
                </p>

                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                    <span>
                      {language === 'fr'
                        ? "Commissions attractives sur les ventes et les recharges"
                        : "Attractive commissions on sales and recharges"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                    <span>
                      {language === 'fr'
                        ? "Aucun investissement initial requis"
                        : "No initial investment required"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                    <span>
                      {language === 'fr'
                        ? "Formation complète offerte"
                        : "Complete training provided"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                    <span>
                      {language === 'fr'
                        ? "Support dédié aux revendeurs"
                        : "Dedicated reseller support"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                    <span>
                      {language === 'fr'
                        ? "Paiements réguliers et fiables"
                        : "Regular and reliable payments"}
                    </span>
                  </li>
                </ul>

                <div className="mt-8 pt-8 border-t border-white/20">
                  <p className="font-medium mb-2">
                    {language === 'fr'
                      ? "Besoin de plus d'informations ?"
                      : "Need more information?"}
                  </p>
                  <div className="flex items-center">
                    <MailIcon className="h-5 w-5 mr-2" />
                    <a href="mailto:contact.drava@gmail.com" className="hover:underline">
                      contact.drava@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center"
                  >
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {language === 'fr' ? "Demande envoyée !" : "Application sent!"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {language === 'fr'
                        ? "Merci pour votre intérêt ! Notre équipe examinera votre demande et vous contactera sous 48 heures."
                        : "Thank you for your interest! Our team will review your application and contact you within 48 hours."}
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                    >
                      {language === 'fr'
                        ? "Soumettre une autre demande"
                        : "Submit another application"}
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <h3 className="text-xl font-bold mb-6">
                      {language === 'fr' ? "Formulaire de candidature" : "Application Form"}
                    </h3>

                    {error && (
                      <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? "Nom complet" : "Full Name"} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formState.fullName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formState.email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? "Téléphone" : "Phone"} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? "Ville" : "City"}
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formState.city}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? "Expérience dans la vente" : "Sales Experience"}
                      </label>
                      <select
                        name="experience"
                        value={formState.experience}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{language === 'fr' ? "Sélectionnez une option" : "Select an option"}</option>
                        <option value="Aucune">{language === 'fr' ? "Aucune expérience" : "No experience"}</option>
                        <option value="Moins de 1 an">{language === 'fr' ? "Moins de 1 an" : "Less than 1 year"}</option>
                        <option value="1-3 ans">{language === 'fr' ? "1-3 ans" : "1-3 years"}</option>
                        <option value="Plus de 3 ans">{language === 'fr' ? "Plus de 3 ans" : "More than 3 years"}</option>
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? "Message (facultatif)" : "Message (optional)"}
                      </label>
                      <textarea
                        name="message"
                        value={formState.message}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={language === 'fr'
                          ? "Parlez-nous de vous et de vos motivations..."
                          : "Tell us about yourself and your motivations..."}
                      ></textarea>
                    </div>

                    <div className="text-right">
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? (language === 'fr' ? 'Envoi en cours...' : 'Sending...')
                          : (language === 'fr' ? 'Envoyer ma candidature' : 'Submit my application')}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section avec lien vers la page FAQ complète */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl font-bold mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {language === 'fr' ? "Des questions sur le programme ?" : "Questions about the program?"}
            </motion.h2>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {language === 'fr'
                ? "Consultez notre FAQ pour en savoir plus sur le processus de candidature et les conditions du programme revendeur."
                : "Check our FAQ to learn more about the application process and the terms of the reseller program."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/faq">
                <Button variant="outline" className="px-6">
                  {language === 'fr' ? "Consulter la FAQ" : "Check the FAQ"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

    </MainLayout>
  )
}

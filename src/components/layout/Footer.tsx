"use client"

import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { NewsletterForm } from '@/components/ui/newsletter-form'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'

const Footer = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-gray-50">
      {/* Newsletter section avec animation */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-8 md:p-12 overflow-hidden relative"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Cercles décoratifs animés */}
          <motion.div
            className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 15, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
          />
          <motion.div
            className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-white/5"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -10, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse", delay: 1 }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('footer.newsletter.title')}</h3>
              <p className="text-blue-100 mb-6">
                {language === 'fr'
                  ? 'Recevez les dernières actualités et offres spéciales directement dans votre boîte mail'
                  : 'Receive the latest news and special offers directly in your inbox'}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <NewsletterForm />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Main footer content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="mb-4 block">
              <img src="/images/drava-logo-circle-light.svg" alt="DRAVA Logo" className="h-14 w-14 rounded-full shadow-sm" />
            </Link>
            <p className="text-sm text-gray-500">
              {language === 'fr'
                ? "DRAVA est votre partenaire de confiance pour les paiements en ligne. Nous proposons des solutions de cartes virtuelles sécurisées pour tous vos besoins."
                : "DRAVA is your trusted partner for online payments. We offer secure virtual card solutions for all your needs."}
            </p>
            <div className="mt-4 space-y-2">
              <a href="mailto:contact.drava@gmail.com" className="text-sm text-gray-500 hover:text-blue-600 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                contact.drava@gmail.com
              </a>
              <a href="tel:+237696161186" className="text-sm text-gray-500 hover:text-blue-600 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                +237 696 16 11 86
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.products.title')}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/cards" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('navigation.cards')}
                </Link>
              </li>
              <li>
                <Link href="/topup" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('navigation.topup')}
                </Link>
              </li>
              <li>
                <Link href="/balance" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {language === 'fr' ? 'Vérifier son solde' : 'Check your balance'}
                </Link>
              </li>
              <li>
                <Link href="/withdrawal" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {language === 'fr' ? 'Retrait d\'argent' : 'Money withdrawal'}
                </Link>
              </li>
              <li>
                <Link href="/reseller" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {language === 'fr' ? 'Devenir revendeur' : 'Become a reseller'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.company.title')}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about-us" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('footer.company.aboutUs')}
                </Link>
              </li>
              <li>
                <Link href="/howitwork" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('navigation.howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('navigation.faq')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('footer.legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {t('footer.legal.terms')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">{language === 'fr' ? 'Contact' : 'Contact'}</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <span className="text-gray-600">
                  {language === 'fr'
                    ? '1111 Maetur à Dakar, Cameroun'
                    : '1111 Maetur in Dakar, Cameroon'}
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-blue-600 mr-2" />
                <a href="tel:+237696161186" className="text-gray-600 hover:text-blue-600 transition-colors">
                  +237 696 16 11 86
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-blue-600 mr-2" />
                <a href="mailto:contact.drava@gmail.com" className="text-gray-600 hover:text-blue-600 transition-colors">
                  contact.drava@gmail.com
                </a>
              </li>
            </ul>

            {/* Newsletter compact form en bas de la colonne contact */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-sm mb-3 text-gray-700">
                {language === 'fr' ? 'Restez informé' : 'Stay informed'}
              </h4>
              <NewsletterForm
                variant="compact"
                buttonText={language === 'fr' ? 'OK' : 'OK'}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Copyright section */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm text-center md:text-left">
            {t('footer.copyright')}
          </p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              {t('navigation.privacy')}
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              {t('navigation.terms')}
            </Link>
            <Link href="/cookies" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              {t('navigation.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

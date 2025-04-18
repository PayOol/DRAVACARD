"use client"

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { motion } from 'framer-motion'
import { Loader2, RefreshCcw, Mail, Search, Download, FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/lib/language-context'

// Types
interface Subscriber {
  id: string
  email: string
  subscribedAt: string
  status: 'active' | 'unsubscribed'
  source: string
}

// Données de démonstration
const demoSubscribers: Subscriber[] = [
  {
    id: '1',
    email: 'jean.dupont@example.com',
    subscribedAt: '2023-06-15T10:23:45Z',
    status: 'active',
    source: 'Footer'
  },
  {
    id: '2',
    email: 'marie.claire@example.com',
    subscribedAt: '2023-07-22T14:10:30Z',
    status: 'active',
    source: 'Contact page'
  },
  {
    id: '3',
    email: 'pierre.martin@example.com',
    subscribedAt: '2023-08-05T09:45:12Z',
    status: 'unsubscribed',
    source: 'Footer'
  },
  {
    id: '4',
    email: 'sophie.lambert@example.com',
    subscribedAt: '2023-09-18T16:33:20Z',
    status: 'active',
    source: 'Footer'
  },
  {
    id: '5',
    email: 'thomas.dubois@example.com',
    subscribedAt: '2023-10-01T11:20:00Z',
    status: 'active',
    source: 'Product page'
  }
]

export default function NewsletterManagementPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { language } = useLanguage()

  // Effet simulant la récupération des données
  useEffect(() => {
    const loadSubscribers = async () => {
      setLoading(true)
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubscribers(demoSubscribers)
      setLoading(false)
    }

    loadSubscribers()
  }, [])

  // Fonction pour formater la date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filtrer les abonnés selon la recherche
  const filteredSubscribers = subscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-4">
                {language === 'fr' ? "Administration Newsletter DRAVA" : "DRAVA Newsletter Administration"}
              </h1>
              <p className="text-gray-600">
                Consultez et gérez les abonnements à votre newsletter
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download size={16} />
                <span>Exporter</span>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <FilePlus size={16} />
                <span>Ajouter un abonné</span>
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-auto md:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher un email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  <span>Total : {subscribers.length} abonnés</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      setLoading(true)
                      setTimeout(() => setLoading(false), 800)
                    }}
                  >
                    <RefreshCcw size={14} />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-500">Chargement des données...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date d'inscription
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSubscribers.length > 0 ? (
                        filteredSubscribers.map((subscriber) => (
                          <motion.tr
                            key={subscriber.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {subscriber.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(subscriber.subscribedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                subscriber.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {subscriber.status === 'active' ? 'Actif' : 'Désabonné'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {subscriber.source}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">
                                {subscriber.status === 'active' ? 'Désabonner' : 'Réactiver'}
                              </Button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                            Aucun résultat pour cette recherche
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Statistiques d'abonnement</h2>
            <Separator className="mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-1">Taux d'ouverture</h3>
                <p className="text-3xl font-bold text-blue-900">68%</p>
                <p className="text-sm text-blue-600 mt-1">+5% par rapport au mois dernier</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-1">Taux de clics</h3>
                <p className="text-3xl font-bold text-green-900">42%</p>
                <p className="text-sm text-green-600 mt-1">+2% par rapport au mois dernier</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-1">Nouveaux abonnés</h3>
                <p className="text-3xl font-bold text-purple-900">24</p>
                <p className="text-sm text-purple-600 mt-1">Ce mois-ci</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}

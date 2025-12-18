'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { companyService } from '@/lib/api'

interface Company {
  id: string
  name: string
  website?: string
  industry?: string
  size?: string
  location?: string
  description?: string
  createdAt: string
  _count?: {
    applications: number
    contacts: number
  }
}

export default function CompaniesTab() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = 'data_companies_list'
      const { cacheManager } = await import('@/lib/cache/cacheManager')
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
      
      if (cached) {
        setCompanies(cached)
        setLoading(false)
        // Rafraîchir en arrière-plan
        companyService.getAll({ limit: 100 }).then(response => {
          const companies = response.data.companies || []
          cacheManager.set(cacheKey, companies, { ttl: 30000 })
          setCompanies(companies)
        }).catch(() => {}) // Ignorer les erreurs
        return
      }
      
      // ✅ OPTIMISATION : Limiter à 100 entreprises par défaut
      const response = await companyService.getAll({ limit: 100 })
      const companies = response.data.companies || []
      setCompanies(companies)
      
      // Mettre en cache
      await cacheManager.set(cacheKey, companies, { ttl: 30000 })
    } catch (error) {
      console.error('Erreur chargement entreprises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      return
    }

    try {
      await companyService.delete(companyId)
      fetchCompanies()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🏢 Gestion des Entreprises
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gérez votre base de données d'entreprises
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          ➕ Nouvelle entreprise
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une entreprise..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Secteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Localisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statistiques
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/backoffice/companies/${company.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-lg">
                        🏢
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {company.name}
                        </div>
                        {company.website && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {company.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {company.industry || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {company.location || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {company._count && (
                      <div className="flex space-x-3">
                        <span>📝 {company._count.applications}</span>
                        <span>👤 {company._count.contacts}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/backoffice/companies/${company.id}`)
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      Voir
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCompany(company.id)
                      }}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => router.push(`/backoffice/companies/${company.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center flex-1">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-lg mr-3">
                    🏢
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{company.name}</h3>
                    {company.industry && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{company.industry}</p>
                    )}
                  </div>
                </div>
              </div>

              {company._count && (
                <div className="ml-13 flex space-x-4 mb-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    📝 {company._count.applications} candidatures
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    👤 {company._count.contacts} contacts
                  </span>
                </div>
              )}

              <div className="ml-13 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/backoffice/companies/${company.id}`)
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Voir
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCompany(company.id)
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucune entreprise trouvée
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchCompanies()
          }}
        />
      )}
    </div>
  )
}

function CreateCompanyModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    size: '',
    location: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await companyService.create(formData)
      onSuccess()
    } catch (error) {
      console.error('Erreur création:', error)
      alert('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Nouvelle entreprise
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Site web
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secteur
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Taille
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner...</option>
                <option value="1-10">1-10 employés</option>
                <option value="11-50">11-50 employés</option>
                <option value="51-200">51-200 employés</option>
                <option value="201-500">201-500 employés</option>
                <option value="501-1000">501-1000 employés</option>
                <option value="1000+">1000+ employés</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Localisation
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

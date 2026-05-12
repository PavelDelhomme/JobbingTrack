'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { companyService } from '@/lib/api'
import Link from 'next/link'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

interface Company {
  id: string
  name: string
  website?: string
  industry?: string
  size?: string
  companyType?: 'EMPLOYER' | 'TEMP_AGENCY'
  location?: string
  description?: string
  createdAt: string
  _count?: {
    applications: number
    contacts: number
  }
}

export default function CompaniesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState<'ALL' | 'EMPLOYER' | 'TEMP_AGENCY'>('ALL')

  // Initialiser le filtre depuis l'URL (ex. ?companyType=TEMP_AGENCY)
  useEffect(() => {
    const type = searchParams?.get('companyType')
    if (type === 'TEMP_AGENCY' || type === 'EMPLOYER') {
      setCompanyTypeFilter(type)
    }
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // ✅ OPTIMISATION : Charger avec pagination et cache
  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies()
    }
  }, [isAuthenticated, companyTypeFilter])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const params: { limit: number; companyType?: 'EMPLOYER' | 'TEMP_AGENCY' } = { limit: 100 }
      if (companyTypeFilter === 'EMPLOYER') params.companyType = 'EMPLOYER'
      if (companyTypeFilter === 'TEMP_AGENCY') params.companyType = 'TEMP_AGENCY'

      const cacheKey = `companies_list_${companyTypeFilter}`
      const cached = await (await import('@/lib/cache/cacheManager')).cacheManager.get(cacheKey, { ttl: 30000 })

      if (cached) {
        setCompanies(Array.isArray(cached) ? (cached as Company[]) : [])
        setLoading(false)
        companyService.getAll(params).then(async response => {
          const list = response.data.companies || []
          const { cacheManager } = await import('@/lib/cache/cacheManager')
          await cacheManager.set(cacheKey, list, { ttl: 30000 })
          setCompanies(list)
        }).catch(() => {})
        return
      }

      const response = await companyService.getAll(params)
      const list = response.data.companies || []
      setCompanies(list)
      await (await import('@/lib/cache/cacheManager')).cacheManager.set(cacheKey, list, { ttl: 30000 })
    } catch (error) {
      console.error('Erreur chargement entreprises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ? Toutes les candidatures liées seront affectées.')) {
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

  // ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
  const pagination = usePagination({
    items: filteredCompanies,
    itemsPerPage: 20,
    initialPage: 1,
  })

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              🏢 Gestion des Entreprises
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gérez votre base de données d'entreprises
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center whitespace-nowrap"
          >
            ➕ Nouvelle entreprise
          </button>
        </div>

        {/* Search + Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Rechercher une entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            {(['ALL', 'EMPLOYER', 'TEMP_AGENCY'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCompanyTypeFilter(f)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  companyTypeFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'ALL' ? 'Toutes' : f === 'EMPLOYER' ? 'Employeur' : 'Boîte d\'intérim'}
              </button>
            ))}
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Entreprise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Secteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Taille
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
                {pagination.paginatedItems.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={(e) => {
                      // Ne pas déclencher si on clique sur les boutons d'action
                      if ((e.target as HTMLElement).closest('button')) return
                      window.location.href = `/b4ck0ff1ce/companies/${company.id}`
                    }}
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        company.companyType === 'TEMP_AGENCY'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {company.companyType === 'TEMP_AGENCY' ? 'Boîte d\'intérim' : 'Employeur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {company.industry || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {company.location || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {company.size || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {company._count && (
                        <div className="flex space-x-3">
                          <span>📝 {company._count.applications} candidatures</span>
                          <span>👤 {company._count.contacts} contacts</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/b4ck0ff1ce/companies/${company.id}?edit=true`
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        Modifier
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

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {pagination.paginatedItems.map((company) => (
              <div
                key={company.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/b4ck0ff1ce/companies/${company.id}`}
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

                <div className="ml-13 space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {company.location && (
                    <p>📍 {company.location}</p>
                  )}
                  {company.size && (
                    <p>👥 {company.size} employés</p>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🔗 {company.website}
                    </a>
                  )}
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
                      window.location.href = `/b4ck0ff1ce/companies/${company.id}?edit=true`
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Modifier
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

          {pagination.paginatedItems.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucune entreprise trouvée
            </div>
          )}

          {/* ✅ OPTIMISATION : Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={20}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                onPageChange={pagination.goToPage}
                onNext={pagination.nextPage}
                onPrevious={pagination.previousPage}
                canGoNext={pagination.canGoNext}
                canGoPrevious={pagination.canGoPrevious}
              />
            </div>
          )}
        </div>

        {/* Create Company Modal */}
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
    </AdminLayout>
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
    companyType: 'EMPLOYER' as 'EMPLOYER' | 'TEMP_AGENCY',
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
                <option value="STARTUP">STARTUP (&lt; 10)</option>
                <option value="SMALL">SMALL (10-50)</option>
                <option value="MEDIUM">MEDIUM (50-250)</option>
                <option value="LARGE">LARGE (250-1000)</option>
                <option value="ENTERPRISE">ENTERPRISE (&gt; 1000)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.companyType}
                onChange={(e) => setFormData({ ...formData, companyType: e.target.value as 'EMPLOYER' | 'TEMP_AGENCY' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EMPLOYER">Employeur</option>
                <option value="TEMP_AGENCY">Boîte d&apos;intérim</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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


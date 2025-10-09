'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
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

export default function CompaniesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies()
    }
  }, [isAuthenticated])

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll()
      setCompanies(response.data.companies || [])
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🏢 Gestion des Entreprises
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez votre base de données d'entreprises
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            ➕ Nouvelle entreprise
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher une entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onDelete={() => handleDeleteCompany(company.id)}
            />
          ))}

          {filteredCompanies.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              Aucune entreprise trouvée
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

function CompanyCard({ company, onDelete }: {
  company: Company
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {company.name}
          </h3>
          {company.industry && (
            <p className="text-sm text-gray-500">{company.industry}</p>
          )}
        </div>
        <div className="h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center text-white text-2xl">
          🏢
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
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
            className="text-blue-600 hover:text-blue-800 block truncate"
          >
            🔗 {company.website}
          </a>
        )}
      </div>

      {company._count && (
        <div className="flex space-x-4 mb-4 text-sm">
          <span className="text-gray-600">
            📝 {company._count.applications} candidatures
          </span>
          <span className="text-gray-600">
            👤 {company._count.contacts} contacts
          </span>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <button
          onClick={() => alert('Édition à implémenter')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ✏️ Modifier
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          🗑️ Supprimer
        </button>
      </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Nouvelle entreprise
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site web
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secteur
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taille
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localisation
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


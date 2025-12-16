'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { applicationService } from '@/lib/api'

interface Application {
  id: string
  position: string
  companyName?: string
  company?: {
    id: string
    name: string
  }
  status: string
  type: string
  location?: string
  applicationDate?: string
  createdAt: string
}

export default function ApplicationsTab() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await applicationService.getAll()
      setApplications(response.data.applications || [])
    } catch (error) {
      console.error('Erreur chargement candidatures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) {
      return
    }

    try {
      await applicationService.delete(appId)
      fetchApplications()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredApplications = filterStatus === 'all' 
    ? applications 
    : applications.filter(app => app.status === filterStatus)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📝 Gestion des Candidatures
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gérez toutes les candidatures
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 whitespace-nowrap"
        >
          ➕ Nouvelle candidature
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SENT">Envoyée</option>
          <option value="IN_REVIEW">En révision</option>
          <option value="INTERVIEW_SCHEDULED">Entretien planifié</option>
          <option value="REJECTED">Rejetée</option>
          <option value="ACCEPTED">Acceptée</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Poste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApplications.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return
                    router.push(`/backoffice/applications/${app.id}`)
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {app.position}
                    </div>
                    {app.location && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{app.location}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {app.company?.name || app.companyName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {app.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {app.applicationDate
                      ? new Date(app.applicationDate).toLocaleDateString('fr-FR')
                      : new Date(app.createdAt).toLocaleDateString('fr-FR')
                    }
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/backoffice/applications/${app.id}`)
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      Voir
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteApplication(app.id)
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
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => router.push(`/backoffice/applications/${app.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{app.position}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {app.company?.name || app.companyName || '-'}
                  </p>
                  {app.location && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">📍 {app.location}</p>
                  )}
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>{app.type}</span>
                <span>
                  {app.applicationDate
                    ? new Date(app.applicationDate).toLocaleDateString('fr-FR')
                    : new Date(app.createdAt).toLocaleDateString('fr-FR')
                  }
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/backoffice/applications/${app.id}`)
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Voir détails
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteApplication(app.id)
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucune candidature trouvée
          </div>
        )}
      </div>

      {/* Create Application Modal */}
      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchApplications()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
    SENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    INTERVIEW_SCHEDULED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    ACCEPTED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}>
      {status}
    </span>
  )
}

function CreateApplicationModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    description: '',
    location: '',
    type: 'FULL_TIME',
    status: 'DRAFT',
    salary: '',
    jobUrl: '',
    source: '',
    notes: '',
    applicationDate: new Date().toISOString().split('T')[0],
    companyData: {
      website: '',
      industry: '',
      size: ''
    }
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await applicationService.create(formData)
      onSuccess()
    } catch (error) {
      console.error('Erreur création:', error)
      alert('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-3xl w-full my-8 border border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Nouvelle candidature
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="L'entreprise sera créée automatiquement si elle n'existe pas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Intitulé du poste *
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de contrat
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="FULL_TIME">CDI</option>
                <option value="PART_TIME">Temps partiel</option>
                <option value="CONTRACT">CDD</option>
                <option value="FREELANCE">Freelance</option>
                <option value="INTERNSHIP">Stage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DRAFT">Brouillon</option>
                <option value="SENT">Envoyée</option>
                <option value="IN_REVIEW">En révision</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date candidature
              </label>
              <input
                type="date"
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
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
              {loading ? 'Création...' : 'Créer la candidature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

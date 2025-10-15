'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import { applicationService } from '@/lib/api'

interface Application {
  id: string
  position: string
  company?: {
    id: string
    name: string
    website?: string
    industry?: string
    location?: string
  }
  status: string
  type: string
  location?: string
  salary?: string
  description?: string
  notes?: string
  jobUrl?: string
  source?: string
  applicationDate?: string
  createdAt: string
  updatedAt: string
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchApplication()
    }
  }, [isAuthenticated, params.id])

  const fetchApplication = async () => {
    try {
      const response = await applicationService.getById(params.id as string)
      setApplication(response.data.application)
    } catch (error) {
      console.error('Erreur chargement candidature:', error)
      alert('Candidature non trouvée')
      router.push('/backoffice/applications')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return

    try {
      await applicationService.update(application.id, { status: newStatus })
      fetchApplication()
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Candidature non trouvée</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/backoffice/applications')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center transition-colors"
          >
            ← Retour aux candidatures
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {application.position}
              </h1>
              <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">
                {application.company?.name}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={async () => {
                  if (confirm('Supprimer cette candidature ?')) {
                    await applicationService.delete(application.id)
                    router.push('/backoffice/applications')
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Statut de la candidature
              </h2>
              <div className="flex items-center space-x-4">
                <StatusBadge status={application.status} large />
                <select
                  value={application.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="SENT">Envoyée</option>
                  <option value="IN_REVIEW">En révision</option>
                  <option value="INTERVIEW_SCHEDULED">Entretien planifié</option>
                  <option value="REJECTED">Rejetée</option>
                  <option value="ACCEPTED">Acceptée</option>
                </select>
              </div>
            </div>

            {/* Description */}
            {application.description && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Description du poste
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {application.notes && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📝 Notes
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Meta Info */}
          <div className="space-y-6">
            {/* Company Info */}
            {application.company && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  🏢 Entreprise
                </h2>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{application.company.name}</p>
                  {application.company.industry && (
                    <p className="text-gray-600 dark:text-gray-400">📊 {application.company.industry}</p>
                  )}
                  {application.company.location && (
                    <p className="text-gray-600 dark:text-gray-400">📍 {application.company.location}</p>
                  )}
                  {application.company.website && (
                    <a
                      href={application.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 block transition-colors"
                    >
                      🔗 Site web
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Job Details */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Détails
              </h2>
              <div className="space-y-2 text-sm">
                <DetailRow label="Type" value={application.type} />
                <DetailRow label="Localisation" value={application.location} />
                <DetailRow label="Salaire" value={application.salary} />
                <DetailRow label="Source" value={application.source} />
                {application.jobUrl && (
                  <div className="pt-2">
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      🔗 Voir l'offre
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📅 Dates
              </h2>
              <div className="space-y-2 text-sm">
                {application.applicationDate && (
                  <DetailRow 
                    label="Date candidature" 
                    value={new Date(application.applicationDate).toLocaleDateString('fr-FR')} 
                  />
                )}
                <DetailRow 
                  label="Créée le" 
                  value={new Date(application.createdAt).toLocaleDateString('fr-FR')} 
                />
                <DetailRow 
                  label="Modifiée le" 
                  value={new Date(application.updatedAt).toLocaleDateString('fr-FR')} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatusBadge({ status, large }: { status: string, large?: boolean }) {
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
    SENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    INTERVIEW_SCHEDULED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    ACCEPTED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  }

  return (
    <span className={`px-3 inline-flex leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'} ${large ? 'text-base py-2' : 'text-xs'}`}>
      {status}
    </span>
  )
}

function DetailRow({ label, value }: { label: string, value?: string }) {
  if (!value) return null

  return (
    <div className="flex justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span>
    </div>
  )
}

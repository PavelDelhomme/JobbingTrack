'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { callService } from '@/lib/api'
import CreateCallModal from '@/components/CreateCallModal'

interface Call {
  id: string
  applicationId: string
  contactId?: string
  type: string
  status: string
  scheduledDate?: string
  callDate?: string
  duration?: number
  notes?: string
  outcome?: string
  followUpNeeded: boolean
  phoneNumber?: string
  createdAt: string
  application?: {
    id: string
    position: string
    company: {
      id: string
      name: string
    }
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
    position?: string
    company?: {
      id: string
      name: string
    }
  }
}

export default function CallsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCalls()
    }
  }, [isAuthenticated])

  const fetchCalls = async () => {
    try {
      const response = await callService.getAll()
      setCalls(response.data.calls || [])
    } catch (error) {
      console.error('Erreur chargement appels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCallCreated = () => {
    fetchCalls()
    setShowCreateModal(false)
  }

  const handleDeleteCall = async (callId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appel ?')) {
      return
    }

    try {
      await callService.delete(callId)
      fetchCalls()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
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

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              📞 Gestion des Appels
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gérez vos appels téléphoniques professionnels
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center"
          >
            ➕ Nouvel appel
          </button>
        </div>

        {/* Calls Table */}
        <div className="table-container">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Candidature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Durée
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {calls.map((call) => (
                <tr key={call.id} className="table-row">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {call.application?.position || 'Candidature inconnue'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {call.application?.company.name || 'Entreprise inconnue'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {call.contact ? (
                      <div>
                        <div className="font-medium">
                          {call.contact.firstName} {call.contact.lastName}
                        </div>
                        {call.contact.position && (
                          <div className="text-gray-600 dark:text-gray-400">{call.contact.position}</div>
                        )}
                        {call.contact.company?.name && (
                          <div className="text-gray-600 dark:text-gray-400">{call.contact.company.name}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Aucun contact</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <CallTypeBadge type={call.type} />
                  </td>
                  <td className="px-6 py-4">
                    <CallStatusBadge status={call.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {call.callDate
                      ? new Date(call.callDate).toLocaleString('fr-FR')
                      : call.scheduledDate
                      ? new Date(call.scheduledDate).toLocaleString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {call.duration ? `${call.duration} min` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => alert('Détails à implémenter')}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDeleteCall(call.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {calls.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              📞 Aucun appel enregistré
            </div>
          )}
        </div>

        {/* Modal de création d'appel */}
        <CreateCallModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCallCreated={handleCallCreated}
        />
      </div>
    </AdminLayout>
  )
}

function CallTypeBadge({ type }: { type: string }) {
  const typeColors: Record<string, string> = {
    OUTBOUND: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    INBOUND: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    FOLLOWUP: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    INQUIRY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    SCHEDULED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    COLD_CALL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
      {type}
    </span>
  )
}

function CallStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    PLANNED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    MISSED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    NO_ANSWER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    BUSY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    LEFT_MESSAGE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
      {status}
    </span>
  )
}


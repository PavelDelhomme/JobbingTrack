'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { callService } from '@/lib/api'

interface Call {
  id: string
  type: string
  status: string
  direction: string
  scheduledAt?: string
  calledAt?: string
  duration?: number
  subject?: string
  notes?: string
  createdAt: string
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
            <h1 className="text-3xl font-bold text-gray-900">
              📞 Gestion des Appels
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez vos appels téléphoniques professionnels
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            ➕ Nouvel appel
          </button>
        </div>

        {/* Calls Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sujet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Durée
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <CallTypeBadge type={call.type} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {call.subject || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {call.direction === 'OUTBOUND' ? '📞 Sortant' : '📱 Entrant'}
                  </td>
                  <td className="px-6 py-4">
                    <CallStatusBadge status={call.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {call.calledAt
                      ? new Date(call.calledAt).toLocaleString('fr-FR')
                      : call.scheduledAt
                      ? new Date(call.scheduledAt).toLocaleString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {call.duration ? `${call.duration} min` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => alert('Détails à implémenter')}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDeleteCall(call.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {calls.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              📞 Aucun appel enregistré
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function CallTypeBadge({ type }: { type: string }) {
  const typeColors: Record<string, string> = {
    OUTBOUND: 'bg-blue-100 text-blue-800',
    INBOUND: 'bg-green-100 text-green-800',
    FOLLOWUP: 'bg-purple-100 text-purple-800',
    INQUIRY: 'bg-yellow-100 text-yellow-800',
    SCHEDULED: 'bg-indigo-100 text-indigo-800',
    COLD_CALL: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  )
}

function CallStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    PLANNED: 'bg-gray-100 text-gray-800',
    COMPLETED: 'bg-green-100 text-green-800',
    MISSED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    NO_ANSWER: 'bg-yellow-100 text-yellow-800',
    BUSY: 'bg-orange-100 text-orange-800',
    LEFT_MESSAGE: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}


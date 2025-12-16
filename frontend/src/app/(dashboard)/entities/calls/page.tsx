'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import Link from 'next/link'

interface Call {
  id: string
  userId: string
  applicationId: string
  contactId?: string
  type: 'OUTGOING&apos; | 'INCOMING' | &apos;MISSED'
  scheduledDate?: string
  callDate?: string
  duration?: number
  status: 'SCHEDULED&apos; | 'COMPLETED' | &apos;CANCELLED' | 'NO_ANSWER&apos; | 'VOICEMAIL' | &apos;RESCHEDULED'
  notes?: string
  outcome?: string
  followUpNeeded: boolean
  phoneNumber?: string
  createdAt: string
  updatedAt: string
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
    phone?: string
    email?: string
  }
}

interface Stats {
  total: number
  completed: number
  scheduled: number
  completionRate: string
  averageDuration: number
  byType: Record<string, number>
  byOutcome: Record<string, number>
  monthlyTrend?: any[]
}

const CALL_TYPES = {
  OUTGOING: { label: 'Sortant&apos;, icon: '📞', color: &apos;blue' },
  INCOMING: { label: 'Entrant&apos;, icon: '📱', color: &apos;green' },
  MISSED: { label: 'Manqué&apos;, icon: '❌', color: &apos;red' },
}

const CALL_STATUS = {
  SCHEDULED: { label: 'Planifié&apos;, color: 'yellow' },
  COMPLETED: { label: 'Terminé&apos;, color: 'green' },
  CANCELLED: { label: 'Annulé&apos;, color: 'gray' },
  NO_ANSWER: { label: 'Pas de réponse&apos;, color: 'orange' },
  VOICEMAIL: { label: 'Message vocal&apos;, color: 'purple' },
  RESCHEDULED: { label: 'Replanifié&apos;, color: 'blue' },
}

export default function CallsPage() {
  const { token } = useAuth()
  const [calls, setCalls] = useState<Call[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    applicationId: '',
    contactId: '',
    search: ''
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (token) {
      fetchCalls()
      fetchStats()
    }
  }, [token, page, filters])

  const fetchCalls = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.applicationId && { applicationId: filters.applicationId }),
        ...(filters.contactId && { contactId: filters.contactId }),
      })

      const response = await fetch(`http://localhost:8080/api/v1/calls?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type&apos;: 'application/json'
        }
      })

      if (!response.ok) throw new Error('Erreur lors du chargement des appels')

      const data = await response.json()
      setCalls(data.calls || [])
      setTotalPages(data.pagination?.pages || 1)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/calls/stats/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type&apos;: 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Erreur stats:', err)
      // ✅ Utiliser des stats par défaut si l'endpoint n'existe pas encore
      setStats({
        total: calls.length,
        byType: {
          INCOMING: calls.filter(c => c.type === 'INCOMING').length,
          OUTGOING: calls.filter(c => c.type === 'OUTGOING').length
        },
        completed: calls.filter(c => c.status === 'COMPLETED').length,
        scheduled: calls.filter(c => c.status === 'SCHEDULED').length,
        completionRate: calls.length > 0 ? ((calls.filter(c => c.status === 'COMPLETED&apos;).length / calls.length) * 100).toFixed(1) : '0',
        averageDuration: 0,
        byOutcome: {},
        monthlyTrend: []
      })
    }
  }

  const deleteCall = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appel ?')) return

    try {
      const response = await fetch(`http://localhost:8080/api/v1/calls/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type&apos;: 'application/json'
        }
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      await fetchCalls()
      await fetchStats()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const completeCall = async (id: string) => {
    const duration = prompt('Durée de l\&apos;appel (en secondes) :')
    const outcome = prompt('Résultat de l\&apos;appel :')

    try {
      const response = await fetch(`http://localhost:8080/api/v1/calls/${id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type&apos;: 'application/json'
        },
        body: JSON.stringify({
          duration: duration ? parseInt(duration) : null,
          outcome
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la complétion')

      await fetchCalls()
      await fetchStats()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Non défini'
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              📞 Gestion des Appels
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gérez et suivez tous vos appels téléphoniques
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center whitespace-nowrap"
          >
            ➕ Nouvel Appel
          </button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-gray-600 dark:text-gray-400 text-sm">Total</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-gray-600 dark:text-gray-400 text-sm">Terminés</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.completed}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-gray-600 dark:text-gray-400 text-sm">Planifiés</div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.scheduled}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-gray-600 dark:text-gray-400 text-sm">Taux complétion</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.completionRate}%
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-gray-600 dark:text-gray-400 text-sm">Durée moy.</div>
              <div className="text-3xl font-bold text-purple-600">
                {Math.floor(stats.averageDuration / 60)}m
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(CALL_STATUS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les types</option>
                {Object.entries(CALL_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recherche
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Liste des appels */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Aucun appel trouvé</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Candidature / Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Résultat
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {calls.map((call) => {
                    const typeInfo = CALL_TYPES[call.type]
                    const statusInfo = CALL_STATUS[call.status]

                    return (
                      <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30 text-${typeInfo.color}-800 dark:text-${typeInfo.color}-300`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {call.application?.company.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {call.application?.position}
                          </div>
                          {call.contact && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Contact: {call.contact.firstName} {call.contact.lastName}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(call.callDate || call.scheduledDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {formatDuration(call.duration)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30 text-${statusInfo.color}-800 dark:text-${statusInfo.color}-300`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="max-w-xs truncate">{call.outcome || '-&apos;}</div>
                          {call.followUpNeeded && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 mt-1">
                              ⚠️ Relance requise
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {call.status === 'SCHEDULED' && (
                              <button
                                onClick={() => completeCall(call.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Marquer comme terminé"
                              >
                                ✓
                              </button>
                            )}
                            <Link
                              href={`/backoffice/calls/${call.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              👁️
                            </Link>
                            <button
                              onClick={() => deleteCall(call.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {calls.map((call) => {
                const typeInfo = CALL_TYPES[call.type]
                const statusInfo = CALL_STATUS[call.status]

                return (
                  <div key={call.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-lg">
                          📞
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30 text-${typeInfo.color}-800 dark:text-${typeInfo.color}-300`}>
                              {typeInfo.icon} {typeInfo.label}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30 text-${statusInfo.color}-800 dark:text-${statusInfo.color}-300`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {call.application?.company.name} - {call.application?.position}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <p>📅 {formatDate(call.callDate || call.scheduledDate)}</p>
                      <p>⏱️ {formatDuration(call.duration)}</p>
                      {call.contact && (
                        <p>👤 {call.contact.firstName} {call.contact.lastName}</p>
                      )}
                      {call.outcome && (
                        <p>📝 {call.outcome}</p>
                      )}
                      {call.followUpNeeded && (
                        <p className="text-orange-600 dark:text-orange-400">⚠️ Relance requise</p>
                      )}
                    </div>

                    <div className="ml-13 flex gap-2">
                      {call.status === 'SCHEDULED' && (
                        <button
                          onClick={() => completeCall(call.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          title="Marquer comme terminé"
                        >
                          ✓ Terminer
                        </button>
                      )}
                      <Link
                        href={`/backoffice/calls/${call.id}`}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
                      >
                        Voir détails
                      </Link>
                      <button
                        onClick={() => deleteCall(call.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Modal Créer un appel - À implémenter */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Nouvel Appel
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Formulaire de création à implémenter
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

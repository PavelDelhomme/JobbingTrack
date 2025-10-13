'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { followUpService } from '@/lib/api'

interface FollowUp {
  id: string
  type: string
  platform: string
  status: string
  scheduledDate: string
  sentAt?: string
  completed: boolean
  completedAt?: string
  subject: string
  message?: string
  response?: string
  applicationId: string
  createdAt: string
}

export default function FollowUpsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchFollowups()
    }
  }, [isAuthenticated])

  const fetchFollowups = async () => {
    try {
      const response = await followUpService.getAll()
      setFollowups(response.data.followups || [])
    } catch (error) {
      console.error('Erreur chargement relances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsCompleted = async (followupId: string) => {
    try {
      await followUpService.update(followupId, { 
        completed: true, 
        completedAt: new Date().toISOString() 
      })
      fetchFollowups()
    } catch (error) {
      console.error('Erreur marquage relance:', error)
    }
  }

  const handleDeleteFollowup = async (followupId: string) => {
    if (!confirm('Supprimer cette relance ?')) return

    try {
      await followUpService.delete(followupId)
      fetchFollowups()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredFollowups = filterStatus === 'all'
    ? followups
    : filterStatus === 'pending'
    ? followups.filter(f => !f.completed)
    : followups.filter(f => f.completed)

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
              📧 Gestion des Relances
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Planifiez et suivez vos relances professionnelles
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center whitespace-nowrap"
          >
            ➕ Nouvelle relance
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total"
            value={followups.length}
            icon="📧"
            color="blue"
          />
          <StatCard
            title="En attente"
            value={followups.filter(f => !f.completed).length}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="Complétées"
            value={followups.filter(f => f.completed).length}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Cette semaine"
            value={followups.filter(f => {
              const scheduledDate = new Date(f.scheduledDate)
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return scheduledDate > weekAgo
            }).length}
            icon="📅"
            color="purple"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm ${filterStatus === 'all' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Toutes ({followups.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-sm ${filterStatus === 'pending' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            En attente ({followups.filter(f => !f.completed).length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg text-sm ${filterStatus === 'completed' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Complétées ({followups.filter(f => f.completed).length})
          </button>
        </div>

        {/* FollowUps Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Plateforme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Sujet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date prévue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date d'envoi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFollowups.map((followup) => (
                  <tr key={followup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <FollowUpPlatformBadge platform={followup.platform} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {followup.subject}
                      </div>
                      {followup.message && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">
                          {followup.message.substring(0, 60)}{followup.message.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <FollowUpStatusBadge status={followup.status} completed={followup.completed} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(followup.scheduledDate).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {followup.sentAt ? new Date(followup.sentAt).toLocaleString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {!followup.completed ? (
                        <button
                          onClick={() => handleMarkAsCompleted(followup.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-4"
                        >
                          ✓ Terminer
                        </button>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 mr-4">✓</span>
                      )}
                      <button
                        onClick={() => handleDeleteFollowup(followup.id)}
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
            {filteredFollowups.map((followup) => (
              <div key={followup.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-yellow-500 dark:bg-yellow-600 flex items-center justify-center text-white text-lg">
                      📧
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FollowUpPlatformBadge platform={followup.platform} />
                        <FollowUpStatusBadge status={followup.status} completed={followup.completed} />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                        {followup.subject}
                      </h3>
                      {followup.message && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {followup.message.substring(0, 60)}{followup.message.length > 60 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-13 space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <p>📅 Prévue : {new Date(followup.scheduledDate).toLocaleString('fr-FR')}</p>
                  {followup.sentAt && (
                    <p>📤 Envoyée : {new Date(followup.sentAt).toLocaleString('fr-FR')}</p>
                  )}
                  {followup.response && (
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-900 dark:text-green-100">
                      💬 Réponse : {followup.response}
                    </div>
                  )}
                </div>

                <div className="ml-13 flex gap-2">
                  {!followup.completed ? (
                    <button
                      onClick={() => handleMarkAsCompleted(followup.id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      ✓ Terminer
                    </button>
                  ) : (
                    <div className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg text-center text-sm">
                      ✓ Complétée
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteFollowup(followup.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredFollowups.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              📧 Aucune relance trouvée
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}


function FollowUpStatusBadge({ status, completed }: { status: string, completed: boolean }) {
  if (completed) {
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        ✅ Complétée
      </span>
    )
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    SENT: 'bg-purple-100 text-purple-800',
    RESPONDED: 'bg-green-100 text-green-800',
    NO_RESPONSE: 'bg-orange-100 text-orange-800',
    TIMEOUT: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function FollowUpPlatformBadge({ platform }: { platform: string }) {
  const platformIcons: Record<string, string> = {
    EMAIL: '📧',
    LINKEDIN: '💼',
    PHONE: '📞',
    SMS: '💬',
    IN_PERSON: '🤝',
  }

  const platformLabels: Record<string, string> = {
    EMAIL: 'Email',
    LINKEDIN: 'LinkedIn',
    PHONE: 'Téléphone',
    SMS: 'SMS',
    IN_PERSON: 'Présentiel',
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
      {platformIcons[platform] || '📧'} {platformLabels[platform] || platform}
    </span>
  )
}

function StatCard({ title, value, icon, color }: {
  title: string
  value: number
  icon: string
  color: 'blue' | 'yellow' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    yellow: 'bg-yellow-50 text-yellow-900',
    green: 'bg-green-50 text-green-900',
    purple: 'bg-purple-50 text-purple-900',
  }

  return (
    <div className={`rounded-lg shadow p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}


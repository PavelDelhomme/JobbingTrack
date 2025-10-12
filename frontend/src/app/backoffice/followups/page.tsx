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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              📧 Gestion des Relances
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Planifiez et suivez vos relances professionnelles
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center"
          >
            ➕ Nouvelle relance
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'all' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Toutes ({followups.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'pending' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            En attente ({followups.filter(f => !f.completed).length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'completed' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Complétées ({followups.filter(f => f.completed).length})
          </button>
        </div>

        {/* FollowUps List */}
        <div className="space-y-4">
          {filteredFollowups.map((followup) => (
            <FollowUpCard
              key={followup.id}
              followup={followup}
              onMarkAsCompleted={() => handleMarkAsCompleted(followup.id)}
              onDelete={() => handleDeleteFollowup(followup.id)}
            />
          ))}

          {filteredFollowups.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-500 dark:text-gray-400">
                📧 Aucune relance trouvée
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function FollowUpCard({ followup, onMarkAsCompleted, onDelete }: {
  followup: FollowUp
  onMarkAsCompleted: () => void
  onDelete: () => void
}) {
  const platformIcons: Record<string, string> = {
    EMAIL: '📧',
    LINKEDIN: '💼',
    PHONE: '📞',
    SMS: '💬',
    IN_PERSON: '🤝',
  }

  const isPending = !followup.completed
  const isPast = new Date(followup.scheduledDate) < new Date()

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${
      isPending && isPast ? 'border-red-600 dark:border-red-500' : isPending ? 'border-yellow-600 dark:border-yellow-500' : 'border-green-600 dark:border-green-500'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-3xl">
            {platformIcons[followup.platform] || '📧'}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {followup.subject}
              </h3>
              <FollowUpStatusBadge status={followup.status} completed={followup.completed} />
            </div>
            {followup.message && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                {followup.message.substring(0, 150)}{followup.message.length > 150 ? '...' : ''}
              </p>
            )}
            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                📅 Prévue : {new Date(followup.scheduledDate).toLocaleString('fr-FR')}
              </span>
              {followup.sentAt && (
                <span>
                  📤 Envoyée : {new Date(followup.sentAt).toLocaleString('fr-FR')}
                </span>
              )}
              {followup.completedAt && (
                <span className="text-green-600 dark:text-green-400">
                  ✅ Complétée : {new Date(followup.completedAt).toLocaleString('fr-FR')}
                </span>
              )}
            </div>
            {followup.response && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <strong>💬 Réponse :</strong> {followup.response}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          {isPending && (
            <button
              onClick={onMarkAsCompleted}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium whitespace-nowrap"
            >
              ✓ Marquer complétée
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
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


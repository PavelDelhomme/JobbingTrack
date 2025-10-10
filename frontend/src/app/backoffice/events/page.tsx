'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { eventService } from '@/lib/api'

interface Event {
  id: string
  type: string
  title: string
  description?: string
  occurredAt: string
  applicationId?: string
  companyId?: string
  contactId?: string
  metadata?: any
  createdAt: string
}

export default function EventsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents()
    }
  }, [isAuthenticated])

  const fetchEvents = async () => {
    try {
      const response = await eventService.getAll()
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Erreur chargement événements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(event => event.type === filterType)

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            📅 Événements & Timeline
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Historique complet de toutes vos activités
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">Tous les événements</option>
            <option value="APPLICATION_CREATED">Candidature créée</option>
            <option value="APPLICATION_SENT">Candidature envoyée</option>
            <option value="INTERVIEW_SCHEDULED">Entretien planifié</option>
            <option value="INTERVIEW_COMPLETED">Entretien terminé</option>
            <option value="FOLLOWUP_SENT">Relance envoyée</option>
            <option value="CALL_MADE">Appel effectué</option>
          </select>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {filteredEvents.map((event, index) => (
            <EventCard key={event.id} event={event} isFirst={index === 0} />
          ))}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-500 dark:text-gray-400">
                📅 Aucun événement trouvé
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function EventCard({ event, isFirst }: { event: Event, isFirst: boolean }) {
  const eventIcons: Record<string, string> = {
    APPLICATION_CREATED: '📝',
    APPLICATION_SENT: '📤',
    APPLICATION_UPDATED: '✏️',
    APPLICATION_REJECTED: '❌',
    APPLICATION_ACCEPTED: '✅',
    INTERVIEW_SCHEDULED: '📅',
    INTERVIEW_COMPLETED: '🎯',
    INTERVIEW_CANCELLED: '🚫',
    FOLLOWUP_SENT: '📧',
    FOLLOWUP_RESPONDED: '💬',
    CALL_MADE: '📞',
    CALL_RECEIVED: '📱',
    COMPANY_ADDED: '🏢',
    CONTACT_ADDED: '👤',
    REMINDER_CREATED: '⏰',
    DOCUMENT_UPLOADED: '📄',
    CV_UPDATED: '📋',
    PROFILE_UPDATED: '👤',
  }

  const eventColors: Record<string, string> = {
    APPLICATION_CREATED: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    APPLICATION_SENT: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    APPLICATION_REJECTED: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
    APPLICATION_ACCEPTED: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    INTERVIEW_SCHEDULED: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    INTERVIEW_COMPLETED: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    FOLLOWUP_SENT: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    CALL_MADE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
  }

  return (
    <div className={`relative pl-8 pb-8 ${isFirst ? '' : 'border-l-2 border-gray-200 dark:border-gray-700'}`}>
      {/* Timeline dot */}
      <div className="absolute left-0 top-0 -ml-1.5 h-3 w-3 rounded-full bg-blue-600 dark:bg-blue-500"></div>

      {/* Event Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border ${eventColors[event.type] || 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-3xl">
              {eventIcons[event.type] || '📌'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {event.title}
              </h3>
              {event.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {event.description}
                </p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  🕒 {new Date(event.occurredAt).toLocaleString('fr-FR')}
                </span>
                <EventTypeBadge type={event.type} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventTypeBadge({ type }: { type: string }) {
  const typeColors: Record<string, string> = {
    APPLICATION_CREATED: 'bg-blue-100 text-blue-800',
    APPLICATION_SENT: 'bg-green-100 text-green-800',
    APPLICATION_UPDATED: 'bg-yellow-100 text-yellow-800',
    INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800',
    FOLLOWUP_SENT: 'bg-orange-100 text-orange-800',
    CALL_MADE: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  )
}


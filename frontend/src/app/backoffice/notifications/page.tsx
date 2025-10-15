'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { notificationService } from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  status: string
  sentAt?: string
  readAt?: string
  createdAt: string
}

export default function NotificationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    }
  }, [isAuthenticated])

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getAll()
      setNotifications(response.data.notifications || [])
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.update(notificationId, { readAt: new Date().toISOString() })
      fetchNotifications()
    } catch (error) {
      console.error('Erreur marquage notification:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Supprimer cette notification ?')) return

    try {
      await notificationService.delete(notificationId)
      fetchNotifications()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredNotifications = filterStatus === 'all'
    ? notifications
    : notifications.filter(n => 
        filterStatus === 'read' ? n.readAt : !n.readAt
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🔔 Notifications
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Centre de notifications et alertes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total"
            value={notifications.length}
            icon="📧"
            color="blue"
          />
          <StatCard
            title="Non lues"
            value={notifications.filter(n => !n.readAt).length}
            icon="🔴"
            color="red"
          />
          <StatCard
            title="Lues"
            value={notifications.filter(n => n.readAt).length}
            icon="✅"
            color="green"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'all' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilterStatus('unread')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'unread' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Non lues ({notifications.filter(n => !n.readAt).length})
          </button>
          <button
            onClick={() => setFilterStatus('read')}
            className={`px-4 py-2 rounded-lg ${filterStatus === 'read' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
          >
            Lues
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead(notification.id)}
              onDelete={() => handleDeleteNotification(notification.id)}
            />
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-500 dark:text-gray-400">
                🔔 Aucune notification
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function NotificationCard({ notification, onMarkAsRead, onDelete }: {
  notification: Notification
  onMarkAsRead: () => void
  onDelete: () => void
}) {
  const notificationIcons: Record<string, string> = {
    EMAIL: '📧',
    REMINDER: '⏰',
    ALERT: '🚨',
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
  }

  const isUnread = !notification.readAt

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
      isUnread ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-3xl">
            {notificationIcons[notification.type] || '🔔'}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {notification.title}
              </h3>
              {isUnread && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  Nouveau
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {notification.message}
            </p>
            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
              <span>
                🕒 {new Date(notification.createdAt).toLocaleString('fr-FR')}
              </span>
              {notification.sentAt && (
                <span>
                  📤 Envoyée : {new Date(notification.sentAt).toLocaleString('fr-FR')}
                </span>
              )}
              {notification.readAt && (
                <span className="text-green-600">
                  ✅ Lue : {new Date(notification.readAt).toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          {isUnread && (
            <button
              onClick={onMarkAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ✓ Marquer comme lue
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: {
  title: string
  value: number
  icon: string
  color: 'blue' | 'red' | 'green'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    red: 'bg-red-50 text-red-900',
    green: 'bg-green-50 text-green-900',
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


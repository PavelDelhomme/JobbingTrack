'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  body: string
  type: 'interview&apos; | 'followup' | &apos;application' | 'system'
  timestamp: Date
  read: boolean
}

interface MobileNotificationCenterProps {
  className?: string
}

const MobileNotificationCenter: React.FC<MobileNotificationCenterProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    // Générer des notifications de démonstration
    generateDemoNotifications()

    // Simuler l'arrivée de nouvelles notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% de chance de nouvelle notification
        addRandomNotification()
      }
    }, 10000) // Toutes les 10 secondes

    return () => clearInterval(interval)
  }, [])

  const generateDemoNotifications = () => {
    const demoNotifications: Notification[] = [
      {
        id: '1',
        title: 'Entretien imminent',
        body: 'Entretien avec Marie Dubois chez TechCorp dans 1 heure',
        type: 'interview',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 minutes
        read: false,
      },
      {
        id: '2',
        title: 'Relance en attente',
        body: 'N\&apos;oubliez pas de relancer Pierre Martin chez StartupInc',
        type: 'followup',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
        read: true,
      },
      {
        id: '3',
        title: 'Nouvelle candidature',
        body: 'Votre candidature pour Développeur Full Stack a été envoyée',
        type: 'application',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Il y a 24 heures
        read: true,
      },
    ]

    setNotifications(demoNotifications)
  }

  const addRandomNotification = () => {
    const types: Notification['type&apos;][] = ['interview', &apos;followup', 'application&apos;, 'system']
    const randomType = types[Math.floor(Math.random() * types.length)]
    
    const titles = {
      interview: 'Nouvel entretien programmé',
      followup: 'Relance requise',
      application: 'Candidature mise à jour',
      system: 'Notification système'
    }

    const bodies = {
      interview: 'Un nouvel entretien a été programmé pour demain',
      followup: 'Une relance est nécessaire pour cette candidature',
      application: 'Le statut de votre candidature a changé',
      system: 'Une mise à jour système est disponible'
    }

    const newNotification: Notification = {
      id: Date.now().toString(),
      title: titles[randomType],
      body: bodies[randomType],
      type: randomType,
      timestamp: new Date(),
      read: false,
    }

    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const formatTime = (date: Date) => {
    try {
      return format(date, 'HH:mm', { locale: fr })
    } catch {
      // Fallback si date-fns n'est pas disponible
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return 'À l\&apos;instant'
      if (minutes < 60) return `Il y a ${minutes} min`
      if (hours < 24) return `Il y a ${hours}h`
      return `Il y a ${days}j`
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800">
            <span className="absolute top-0 right-0 flex h-full w-full">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            </span>
          </span>
        )}
      </button>

      {/* Panel de notifications */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* En-tête */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Notifications</h3>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1"
                >
                  Tout lu
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Aucune notification
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20&apos; : ''
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      !notification.read ? 'bg-blue-500&apos; : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.body}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          notification.type === 'interview'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : notification.type === 'followup'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : notification.type === 'application'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileNotificationCenter


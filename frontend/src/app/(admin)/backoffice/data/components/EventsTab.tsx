'use client'

import { useState, useEffect } from 'react'

interface Event {
  id: string
  title: string
  date: string
  type: string
  createdAt: string
}

export default function EventsTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Implémenter fetchEvents avec eventService
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          📅 Gestion des Événements
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Gérez tous vos événements
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Fonctionnalité en cours de développement
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { followUpService } from '@/lib/api'

interface FollowUp {
  id: string
  type: string
  scheduledAt?: string
  status: string
  notes?: string
  createdAt: string
}

export default function FollowupsTab() {
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowups()
  }, [])

  const fetchFollowups = async () => {
    try {
      setLoading(true)
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = 'data_followups_list'
      const { cacheManager } = await import('@/lib/cache/cacheManager')
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
      
      if (cached) {
        setFollowups(cached)
        setLoading(false)
        // Rafraîchir en arrière-plan
        followUpService.getAll({ limit: 100 }).then(response => {
          const followups = response.data.followups || []
          cacheManager.set(cacheKey, followups, { ttl: 30000 })
          setFollowups(followups)
        }).catch(() => {}) // Ignorer les erreurs
        return
      }
      
      // ✅ OPTIMISATION : Limiter à 100 relances par défaut
      const response = await followUpService.getAll({ limit: 100 })
      const followups = response.data.followups || []
      setFollowups(followups)
      
      // Mettre en cache
      await cacheManager.set(cacheKey, followups, { ttl: 30000 })
    } catch (error) {
      console.error('Erreur chargement relances:', error)
    } finally {
      setLoading(false)
    }
  }

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
          📧 Gestion des Relances
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Gérez toutes vos relances
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {followups.map((followup) => (
                <tr key={followup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {followup.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {followup.scheduledAt 
                      ? new Date(followup.scheduledAt).toLocaleDateString('fr-FR')
                      : new Date(followup.createdAt).toLocaleDateString('fr-FR')
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                      {followup.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {followups.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucune relance trouvée
          </div>
        )}
      </div>
    </div>
  )
}

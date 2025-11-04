'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface SecurityAlert {
  id: string
  timestamp: string
  level: string
  title: string
  description: string
  category: string
  source: string
  isAcknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolvedAt?: string
  metadata?: any
}

export default function SecurityAlertsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<SecurityAlert[]>([])
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    acknowledged: '',
    search: ''
  })

  useEffect(() => {
    if (token) {
      loadSecurityAlerts()
    }
  }, [token])

  useEffect(() => {
    applyFilters()
  }, [alerts, filters])

  const loadSecurityAlerts = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setAlerts(response.data.data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des alertes de sécurité:', error)

      // Fallback vers des données mockées
      const mockAlerts = Array.from({ length: 20 }, (_, i) => ({
        id: `alert-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        level: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        title: `Alerte de sécurité ${i + 1}`,
        description: `Description de l'alerte de sécurité ${i + 1}. Cette alerte indique une activité potentiellement malveillante qui nécessite une attention.`,
        category: ['intrusion', 'vulnerability', 'ddos', 'authentication'][Math.floor(Math.random() * 4)],
        source: `192.168.1.${Math.floor(Math.random() * 255)}`,
        isAcknowledged: Math.random() > 0.5,
        acknowledgedBy: Math.random() > 0.5 ? `admin${Math.floor(Math.random() * 5) + 1}` : undefined,
        acknowledgedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
        resolvedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString() : undefined,
        metadata: {
          riskScore: Math.floor(Math.random() * 100),
          affectedSystems: ['api-gateway', 'auth-service', 'database'][Math.floor(Math.random() * 3)],
          attackVector: ['SQL Injection', 'XSS', 'Brute Force', 'DDoS'][Math.floor(Math.random() * 4)]
        }
      }))

      setAlerts(mockAlerts)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...alerts]

    if (filters.level) {
      filtered = filtered.filter(alert => alert.level === filters.level)
    }

    if (filters.category) {
      filtered = filtered.filter(alert => alert.category === filters.category)
    }

    if (filters.acknowledged !== '') {
      const acknowledged = filters.acknowledged === 'true'
      filtered = filtered.filter(alert => alert.isAcknowledged === acknowledged)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchTerm) ||
        alert.description.toLowerCase().includes(searchTerm) ||
        alert.source.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredAlerts(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      acknowledged: '',
      search: ''
    })
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await axios.patch(`${API_URL}/api/v1/alerts/${alertId}/acknowledge`, {
        acknowledgedBy: 'current_user'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, isAcknowledged: true, acknowledgedBy: 'current_user', acknowledgedAt: new Date().toISOString() }
          : alert
      ))
    } catch (error) {
      console.error('Erreur lors de l\'acquittement de l\'alerte:', error)
      // Simulation pour les données mockées
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, isAcknowledged: true, acknowledgedBy: 'current_user', acknowledgedAt: new Date().toISOString() }
          : alert
      ))
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      await axios.patch(`${API_URL}/api/v1/alerts/${alertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, resolvedAt: new Date().toISOString() }
          : alert
      ))
    } catch (error) {
      console.error('Erreur lors de la résolution de l\'alerte:', error)
      // Simulation pour les données mockées
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, resolvedAt: new Date().toISOString() }
          : alert
      ))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'intrusion': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ddos': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'authentication': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'vulnerability': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusColor = (alert: SecurityAlert) => {
    if (alert.resolvedAt) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (alert.isAcknowledged) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const getStatusText = (alert: SecurityAlert) => {
    if (alert.resolvedAt) return 'Résolue'
    if (alert.isAcknowledged) return 'Acquittée'
    return 'Non traitée'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🚨 Alertes de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion et suivi des alertes de sécurité critiques et importantes
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Niveau de sévérité
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les niveaux</option>
                <option value="critical">Critique</option>
                <option value="high">Élevé</option>
                <option value="medium">Moyen</option>
                <option value="low">Faible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Toutes les catégories</option>
                <option value="intrusion">Intrusion</option>
                <option value="ddos">DDoS</option>
                <option value="authentication">Authentification</option>
                <option value="vulnerability">Vulnérabilité</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.acknowledged}
                onChange={(e) => handleFilterChange('acknowledged', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                <option value="false">Non traitée</option>
                <option value="true">Acquittée/Résolue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Effacer
                </button>
                <button
                  onClick={loadSecurityAlerts}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher dans les alertes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAlerts.length} alertes affichées sur {alerts.length} total
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 dark:text-red-400">
                {filteredAlerts.filter(a => a.level === 'critical').length} critiques
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {filteredAlerts.filter(a => a.level === 'high').length} élevées
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {filteredAlerts.filter(a => a.level === 'medium').length} moyennes
              </span>
              <span className="text-green-600 dark:text-green-400">
                {filteredAlerts.filter(a => !a.isAcknowledged && !a.resolvedAt).length} non traitées
              </span>
            </div>
          </div>
        </div>

        {/* Liste des alertes */}
        <div className="space-y-4">
          {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => (
            <div key={alert.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${getLevelColor(alert.level)}`}>
                    {alert.level.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategoryColor(alert.category)}`}>
                    {alert.category}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(alert)}`}>
                    {getStatusText(alert)}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(alert.timestamp)}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {alert.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {alert.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Source:</strong> {alert.source}
                </div>
                {alert.metadata && (
                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">Score de risque:</strong> {alert.metadata.riskScore}/100
                  </div>
                )}
              </div>

              {alert.isAcknowledged && alert.acknowledgedBy && (
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  ✅ Acquittée par {alert.acknowledgedBy} le {formatDate(alert.acknowledgedAt!)}
                </div>
              )}

              {alert.resolvedAt && (
                <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                  ✅ Résolue le {formatDate(alert.resolvedAt)}
                </div>
              )}

              <div className="flex items-center gap-2">
                {!alert.isAcknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Acquitter
                  </button>
                )}

                {alert.isAcknowledged && !alert.resolvedAt && (
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Résoudre
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Aucune alerte de sécurité trouvée avec les critères actuels</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

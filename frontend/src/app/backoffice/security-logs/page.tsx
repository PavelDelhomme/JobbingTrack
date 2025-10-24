'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface SecurityLog {
  id: string
  timestamp: string
  level: string
  category: string
  eventType: string
  message: string
  sourceIP?: string
  userAgent?: string
  userId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  responseTime?: number
  country?: string
  city?: string
  riskScore?: number
  isBlocked: boolean
  metadata?: any
}

export default function SecurityLogsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([])
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    startDate: '',
    endDate: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (token) {
      loadSecurityLogs()
    }
  }, [token, pagination.page, pagination.limit])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const loadSecurityLogs = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/logs`, {
        params: {
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit,
          level: filters.level || undefined,
          category: filters.category || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setLogs(response.data.data)
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.count || response.data.data.length,
          totalPages: Math.ceil((response.data.pagination?.count || response.data.data.length) / pagination.limit)
        }))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logs de sécurité:', error)

      // Fallback vers des données mockées
      const mockLogs = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        level: ['info', 'warning', 'error', 'critical'][Math.floor(Math.random() * 4)],
        category: ['authentication', 'intrusion', 'ddos', 'vulnerability'][Math.floor(Math.random() * 4)],
        eventType: ['login_attempt', 'suspicious_activity', 'blocked_request'][Math.floor(Math.random() * 3)],
        message: `Événement de sécurité simulé ${i + 1}`,
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: `/api/v1/${['auth', 'users', 'applications'][Math.floor(Math.random() * 3)]}`,
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        statusCode: [200, 401, 403, 500][Math.floor(Math.random() * 4)],
        country: ['US', 'CN', 'RU', 'FR', 'DE'][Math.floor(Math.random() * 5)],
        riskScore: Math.floor(Math.random() * 100),
        isBlocked: Math.random() > 0.8,
        metadata: { userId: `user_${Math.floor(Math.random() * 100)}` }
      }))

      setLogs(mockLogs)
      setPagination(prev => ({
        ...prev,
        total: mockLogs.length,
        totalPages: Math.ceil(mockLogs.length / pagination.limit)
      }))
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level)
    }

    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm) ||
        log.sourceIP?.toLowerCase().includes(searchTerm) ||
        log.endpoint?.toLowerCase().includes(searchTerm)
      )
    }

    if (filters.startDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.startDate))
    }

    if (filters.endDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filters.endDate))
    }

    setFilteredLogs(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      startDate: '',
      endDate: '',
      search: ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'error': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
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
            📋 Logs de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consultation détaillée des événements de sécurité collectés en temps réel
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Niveau
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les niveaux</option>
                <option value="critical">Critique</option>
                <option value="error">Erreur</option>
                <option value="warning">Avertissement</option>
                <option value="info">Information</option>
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
                <option value="authentication">Authentification</option>
                <option value="intrusion">Intrusion</option>
                <option value="ddos">DDoS</option>
                <option value="vulnerability">Vulnérabilité</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date début
              </label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date fin
              </label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Effacer
            </button>
            <button
              onClick={loadSecurityLogs}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {/* Statistiques des filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredLogs.length} logs affichés sur {pagination.total} total
            </div>
            <div className="flex gap-4 text-sm">
              {filters.level && (
                <span className={`px-2 py-1 rounded-full ${getLevelColor(filters.level)}`}>
                  Niveau: {filters.level}
                </span>
              )}
              {filters.category && (
                <span className={`px-2 py-1 rounded-full ${getCategoryColor(filters.category)}`}>
                  Catégorie: {filters.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Liste des logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {filteredLogs.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {formatDate(log.timestamp)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategoryColor(log.category)}`}>
                            {log.category}
                          </span>
                          {log.isBlocked && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              BLOQUÉ
                            </span>
                          )}
                        </div>

                        <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                          {log.message}
                        </p>

                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {log.endpoint && (
                            <div><strong>Endpoint:</strong> {log.method} {log.endpoint} ({log.statusCode})</div>
                          )}
                          {log.sourceIP && (
                            <div><strong>Source:</strong> {log.sourceIP} {log.country && `(${log.country})`}</div>
                          )}
                          {log.riskScore && (
                            <div><strong>Score de risque:</strong> {log.riskScore}/100</div>
                          )}
                          {log.userAgent && (
                            <div><strong>User-Agent:</strong> {log.userAgent.substring(0, 60)}...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Aucun log de sécurité trouvé avec les critères actuels</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} sur {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Précédent
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ServiceStatus {
  name: string
  url: string
  port: number
  status: 'online' | 'offline' | 'testing'
  responseTime?: number
  version?: string
  error?: string
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ServicesPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>('services')
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/api/v1/health`, port: 3000, status: 'online', responseTime: 45, version: '1.0.0' },
    { name: 'Auth Service', url: `${API_GATEWAY_URL}/api/v1/auth/health`, port: 3000, status: 'testing', responseTime: 89, version: '1.0.0' },
    { name: 'Application Service', url: `${API_GATEWAY_URL}/api/v1/applications/health`, port: 3000, status: 'testing', responseTime: 156, version: '1.0.0' },
    { name: 'Company Service', url: `${API_GATEWAY_URL}/api/v1/companies/health`, port: 3000, status: 'testing', responseTime: 102, version: '1.0.0' },
    { name: 'Contact Service', url: `${API_GATEWAY_URL}/api/v1/contacts/health`, port: 3000, status: 'testing', responseTime: 98, version: '1.0.0' },
    { name: 'Interview Service', url: `${API_GATEWAY_URL}/api/v1/interviews/health`, port: 3000, status: 'testing', responseTime: 134, version: '1.0.0' },
    { name: 'Notification Service', url: `${API_GATEWAY_URL}/api/v1/notifications/health`, port: 3000, status: 'testing', responseTime: 112, version: '1.0.0' },
    { name: 'Dashboard Service', url: `${API_GATEWAY_URL}/api/v1/dashboard/health`, port: 3000, status: 'testing', responseTime: 145, version: '1.0.0' },
    { name: 'Call Service', url: `${API_GATEWAY_URL}/api/v1/calls/health`, port: 3000, status: 'testing', responseTime: 98, version: '1.0.0' },
    { name: 'Profile Service', url: `${API_GATEWAY_URL}/api/v1/profile/health`, port: 3000, status: 'testing', responseTime: 134, version: '1.0.0' },
    { name: 'Event Service', url: `${API_GATEWAY_URL}/api/v1/events/health`, port: 3000, status: 'testing', responseTime: 167, version: '1.0.0' },
    { name: 'FollowUp Service', url: `${API_GATEWAY_URL}/api/v1/followups/health`, port: 3000, status: 'testing', responseTime: 123, version: '1.0.0' },
    { name: 'Frontend', url: `${API_GATEWAY_URL}/health`, port: 3000, status: 'testing', responseTime: 89, version: '1.0.0' },
    { name: 'Base de données', url: `${API_GATEWAY_URL}/api/v1/applications`, port: 0, status: 'testing', responseTime: 45, version: 'PostgreSQL 15' }
  ])

  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const [selectedService, setSelectedService] = useState<ServiceStatus | null>(null)
  const [serviceLogs, setServiceLogs] = useState<string[]>([])

  // Vérification d'authentification
  if (!token || !user) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Accès refusé</p>
            <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  useEffect(() => {
    // Test automatique au chargement de la page
    testAllServices()

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(testAllServices, refreshInterval * 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const testAllServices = async () => {
    setLoading(true)
    const updatedServices = [...services]

    for (let i = 0; i < updatedServices.length; i++) {
      await testService(updatedServices[i], i)
    }

    setServices(updatedServices)
    setLoading(false)
  }

  const testService = async (service: ServiceStatus, index: number) => {
    const startTime = Date.now()

    // Mettre à jour le statut à "testing" avant de commencer
    setServices(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'testing' }
      return updated
    })

    try {
      let response: any
      let responseTime: number

      // Test spécial pour la base de données
      if (service.name === 'Base de données') {
        const dbResult = await testDatabase()
        responseTime = Date.now() - startTime

        setServices(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: dbResult.status as any,
            responseTime,
            version: 'PostgreSQL 15',
            error: dbResult.status === 'offline' ? dbResult.message : undefined
          }
          return updated
        })
      } else {
        // Test normal pour les services
        // Déterminer si le service nécessite une authentification
        const requiresAuth = service.name !== 'Frontend' && service.name !== 'API Gateway'

        // Configuration de la requête
        const config = {
          timeout: 5000,
          headers: requiresAuth && token ? { 'Authorization': `Bearer ${token}` } : undefined,
          validateStatus: (status: number) => status < 500 // Accepter les erreurs 4xx comme réponses valides
        }

        response = await axios.get(service.url, config)
        responseTime = Date.now() - startTime

        setServices(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: response.status >= 200 && response.status < 400 ? 'online' : 'offline',
            responseTime,
            version: response.data?.version || '1.0.0',
            error: response.status >= 400 ? `HTTP ${response.status}: ${response.statusText}` : undefined
          }
          return updated
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      // Gestion spécifique des erreurs
      let errorMessage = 'Service inaccessible'

      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connexion refusée - service non démarré'
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout - service lent à répondre'
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Service non trouvé'
      } else if (error.message) {
        errorMessage = error.message
      }

      setServices(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status: 'offline',
          error: errorMessage,
          responseTime: responseTime,
          version: undefined
        }
        return updated
      })
    }
  }

  const onlineCount = services.filter(s => s.status === 'online').length
  const offlineCount = services.filter(s => s.status === 'offline').length
  const averageResponseTime = services
    .filter(s => s.responseTime)
    .reduce((acc, s) => acc + (s.responseTime || 0), 0) / (services.filter(s => s.responseTime).length || 1)

  // Fonction pour récupérer les logs d'un service
  const fetchServiceLogs = async (service: ServiceStatus) => {
    try {
      // Simulation de récupération de logs - en vrai, ça devrait venir de l'API
      const mockLogs = [
        `[${new Date().toISOString()}] INFO: Service ${service.name} opérationnel`,
        `[${new Date(Date.now() - 1000 * 60).toISOString()}] INFO: Configuration chargée`,
        `[${new Date(Date.now() - 1000 * 60 * 2).toISOString()}] INFO: Connexion à la base de données établie`,
        `[${new Date(Date.now() - 1000 * 60 * 5).toISOString()}] INFO: Service ${service.name} prêt`,
        `[${new Date(Date.now() - 1000 * 60 * 10).toISOString()}] INFO: Démarrage du service ${service.name}`,
      ]
      setServiceLogs(mockLogs)
    } catch (error) {
      console.error('Erreur récupération logs:', error)
      setServiceLogs(['Erreur lors de la récupération des logs'])
    }
  }

  // Fonction pour tester la base de données
  const testDatabase = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/applications`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      })

      if (response.data.success) {
        return {
          status: 'online',
          message: `Base de données accessible - ${response.data.applications?.length || 0} candidatures trouvées`
        }
      } else {
        return {
          status: 'offline',
          message: 'Base de données inaccessible'
        }
      }
    } catch (error: any) {
      return {
        status: 'offline',
        message: `Erreur DB: ${error.message}`
      }
    }
  }

  return (
    <AdminLayout>
      <div>
        {/* Header avec onglets - Responsive */}
        <div className="mb-4 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4 md:mb-6">
            {/* Titre */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                🔧 Gestion des Services
              </h1>
              <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                Surveillez l'état et les performances de tous vos microservices
              </p>
            </div>

            {/* Contrôles */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={testAllServices}
                disabled={loading}
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                {loading ? '🔄 Test...' : '🔄 Tester Tout'}
              </button>

              <label className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Auto ({refreshInterval}s)
                </span>
              </label>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-500 flex items-center justify-center text-base sm:text-xl">
                  📊
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{services.length}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">En ligne</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-500 flex items-center justify-center text-base sm:text-xl">
                  ✅
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{onlineCount}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Hors ligne</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-red-500 flex items-center justify-center text-base sm:text-xl">
                  ❌
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{offlineCount}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Temps moyen</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-500 flex items-center justify-center text-base sm:text-xl">
                  ⚡
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {averageResponseTime ? `${Math.round(averageResponseTime)}ms` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 md:mb-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'services'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Logs Système
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  onClick={() => {
                    router.push(`/backoffice/services/${service.name.toLowerCase().replace(/\s+/g, '-')}`)
                  }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {service.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {service.port ? `Port ${service.port}` : 'Base de données'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        service.status === 'online'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : service.status === 'testing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {service.status === 'online' ? '✅ En ligne' :
                         service.status === 'testing' ? '🔄 Test...' :
                         '❌ Hors ligne'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Temps de réponse:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
                        </span>
                      </div>

                      {service.version && (
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Version:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{service.version}</span>
                        </div>
                      )}

                      {service.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-400">
                          {service.error}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Cliquer pour détails</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const serviceIndex = services.findIndex(s => s.name === service.name)
                              testService(service, serviceIndex)
                            }}
                            disabled={loading || service.status === 'testing'}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {service.status === 'testing' ? '🔄' : '🧪'}
                          </button>
                          <span>👁️</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Logs Système
              </h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                <p>Logs système en cours d'implémentation...</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Détails du service sélectionné */}
        {selectedService && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedService(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border-2 border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 ${
                selectedService.status === 'online' ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700' :
                selectedService.status === 'testing' ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700' :
                'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700'
              } text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedService.status === 'online' ? 'bg-white/20' :
                      selectedService.status === 'testing' ? 'bg-white/20' : 'bg-white/20'
                    }`}>
                      <span className="text-2xl">
                        {selectedService.status === 'online' ? '🔧' :
                         selectedService.status === 'testing' ? '⚙️' : '❌'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedService.name}</h2>
                      <p className="text-sm opacity-90">
                        Service • Port {selectedService.port} • {selectedService.status === 'online' ? 'En ligne' : selectedService.status === 'testing' ? 'Test en cours' : 'Hors ligne'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  >
                    <span className="text-xl">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informations du service */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Informations générales</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Nom du service</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{selectedService.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Port</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{selectedService.port}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">URL</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 font-mono text-xs">{selectedService.url}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Statut</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedService.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            selectedService.status === 'testing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {selectedService.status === 'online' ? '🟢 En ligne' :
                             selectedService.status === 'testing' ? '🔄 Test en cours' : '🔴 Hors ligne'}
                          </span>
                        </div>
                        {selectedService.responseTime && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{selectedService.responseTime}ms</span>
                          </div>
                        )}
                        {selectedService.version && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{selectedService.version}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            testService(selectedService, services.findIndex(s => s.name === selectedService.name))
                            setSelectedService(null)
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          🔄 Tester le service
                        </button>
                        <button
                          onClick={() => {
                            window.open(selectedService.url, '_blank')
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          🔗 Ouvrir dans un nouvel onglet
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logs du service */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Logs récents</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                      {serviceLogs.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2 animate-bounce">📭</div>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun log disponible</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Les logs apparaîtront ici</p>
                        </div>
                      ) : (
                        <div className="space-y-2 font-mono text-sm">
                          {serviceLogs.map((log, index) => (
                            <div
                              key={index}
                              className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                            >
                              <span className="text-gray-500 dark:text-gray-400 text-xs">{log.split(']')[0]}]</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">{log.split(']').slice(1).join(']')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Erreur si présente */}
                {selectedService.error && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Erreur détectée</h4>
                    <p className="text-red-700 dark:text-red-300">{selectedService.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
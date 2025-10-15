'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useMetrics } from '@/hooks/useMetrics'
import axios from 'axios'

interface ServiceStatus {
  name: string
  url: string
  port: number
  status: 'online' | 'offline' | 'testing'
  responseTime?: number
  version?: string
  error?: string
  serviceType?: string
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ServicesPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const { metrics, isConnected, error: metricsError } = useMetrics()
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>('services')
  // Configuration des vraies URLs des services
  const REAL_SERVICES = [
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/api/v1/health`, port: 3000, serviceType: 'gateway' },
    { name: 'Auth Service', url: 'http://localhost:3001/api/v1/auth/health', port: 3001, serviceType: 'auth' },
    { name: 'Application Service', url: 'http://localhost:3002/api/v1/applications/health', port: 3002, serviceType: 'application' },
    { name: 'Company Service', url: 'http://localhost:3003/api/v1/companies/health', port: 3003, serviceType: 'company' },
    { name: 'Contact Service', url: 'http://localhost:3004/api/v1/contacts/health', port: 3004, serviceType: 'contact' },
    { name: 'Interview Service', url: 'http://localhost:3005/api/v1/interviews/health', port: 3005, serviceType: 'interview' },
    { name: 'Notification Service', url: 'http://localhost:3006/api/v1/notifications/health', port: 3006, serviceType: 'notification' },
    { name: 'Dashboard Service', url: 'http://localhost:3007/api/v1/dashboard/health', port: 3007, serviceType: 'dashboard' },
    { name: 'Call Service', url: 'http://localhost:3008/api/v1/calls/health', port: 3008, serviceType: 'call' },
    { name: 'Event Service', url: 'http://localhost:3009/api/v1/events/health', port: 3009, serviceType: 'event' },
    { name: 'FollowUp Service', url: 'http://localhost:3010/api/v1/followups/health', port: 3010, serviceType: 'followup' },
    { name: 'Profile Service', url: 'http://localhost:3011/api/v1/profile/health', port: 3011, serviceType: 'profile' },
    { name: 'Workflow Service', url: 'http://localhost:3013/api/v1/workflow/health', port: 3013, serviceType: 'workflow' },
    { name: 'Metrics Aggregator', url: 'http://localhost:3014/api/v1/health', port: 3014, serviceType: 'metrics' },
    { name: 'Frontend', url: 'http://localhost:3000/health', port: 3000, serviceType: 'frontend' },
    { name: 'Base de données', url: 'http://localhost:5432', port: 5432, serviceType: 'database' },
    { name: 'Redis', url: 'http://localhost:6379', port: 6379, serviceType: 'cache' },
    { name: 'cAdvisor', url: 'http://localhost:8080/api/v1.3/docker/', port: 8080, serviceType: 'monitoring' },
    { name: 'Prometheus', url: 'http://localhost:9090', port: 9090, serviceType: 'monitoring' }
  ]

  const [services, setServices] = useState<ServiceStatus[]>([])

  // Charger les maintenances
  const loadMaintenances = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.data.success) {
        const maintenanceMap: {[key: string]: any} = {}
        response.data.maintenances.forEach((m: any) => {
          maintenanceMap[m.serviceName] = m
        })
        setMaintenances(maintenanceMap)
      }
    } catch (error) {
      console.error('Erreur chargement maintenances:', error)
    }
  }

  // Initialiser les services avec les vraies URLs et utiliser les métriques du service
  useEffect(() => {
    loadMaintenances()

    if (metrics && metrics.services) {
      const updatedServices = REAL_SERVICES.map(service => {
        const serviceMetrics = metrics.services[service.name.toLowerCase().replace(' ', '-').replace(/[^a-z0-9-]/g, '')] ||
                              metrics.services[service.name] ||
                              metrics.services[service.serviceType]

        if (serviceMetrics) {
          return {
            name: service.name,
            url: service.url,
            port: service.port,
            serviceType: service.serviceType,
            status: serviceMetrics.health?.status === 'online' ? 'online' as const :
                   serviceMetrics.health?.status === 'offline' ? 'offline' as const : 'testing' as const,
            responseTime: serviceMetrics.health?.responseTime,
            version: serviceMetrics.health?.version || serviceMetrics.version || '1.0.0',
            error: serviceMetrics.health?.error
          }
        }

        return {
          name: service.name,
          url: service.url,
          port: service.port,
          serviceType: service.serviceType,
          status: 'testing' as const,
          responseTime: 0,
          version: '1.0.0'
        }
      })
      setServices(updatedServices)
    } else {
      // Fallback vers les vraies URLs si pas de métriques
      const initialServices = REAL_SERVICES.map(service => ({
        name: service.name,
        url: service.url,
        port: service.port,
        serviceType: service.serviceType,
        status: 'testing' as const,
        responseTime: 0,
        version: '1.0.0'
      }))
      setServices(initialServices)
    }
  }, [metrics, token])

  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const [selectedService, setSelectedService] = useState<ServiceStatus | null>(null)
  const [serviceLogs, setServiceLogs] = useState<string[]>([])
  const [maintenances, setMaintenances] = useState<{[key: string]: any}>({})

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
      } else if (service.name === 'Redis') {
        // Test Redis
        const redisResult = await testRedis()
        responseTime = Date.now() - startTime

        setServices(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: redisResult.status as any,
            responseTime,
            version: 'Redis 7',
            error: redisResult.status === 'offline' ? redisResult.message : undefined
          }
          return updated
        })
      } else if (service.name === 'cAdvisor') {
        // Test cAdvisor
        const cadvisorResult = await testCadvisor()
        responseTime = Date.now() - startTime

        setServices(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: cadvisorResult.status as any,
            responseTime,
            version: 'cAdvisor v0.47.2',
            error: cadvisorResult.status === 'offline' ? cadvisorResult.message : undefined
          }
          return updated
        })
      } else {
        // Test normal pour les services web
        // Déterminer si le service nécessite une authentification
        const requiresAuth = service.name !== 'Frontend' && service.name !== 'API Gateway' && service.name !== 'Metrics Aggregator'

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

  // Fonction pour récupérer les logs d'un service (utilise les métriques)
  const fetchServiceLogs = async (service: ServiceStatus) => {
    try {
      if (metrics && metrics.services) {
        // Chercher le service dans les métriques
        const serviceKey = Object.keys(metrics.services).find(key =>
          key.includes(service.name.toLowerCase().replace(' ', '-')) ||
          key === service.serviceType
        )

        if (serviceKey && metrics.services[serviceKey]) {
          const serviceData = metrics.services[serviceKey]

          // Générer des logs basés sur les métriques
          const logs = []

          if (serviceData.health?.status) {
            logs.push(`[${new Date().toISOString()}] INFO: Service ${service.name} ${serviceData.health.status}`)
          }

          if (serviceData.lastCheck) {
            logs.push(`[${serviceData.lastCheck}] INFO: Dernière vérification effectuée`)
          }

          if (serviceData.metrics?.memory) {
            const mem = serviceData.metrics.memory
            logs.push(`[${new Date().toISOString()}] INFO: Mémoire utilisée: ${mem.percentage}% (${Math.round(mem.usage/1024/1024)}MB)`)
          }

          if (serviceData.metrics?.cpu) {
            const cpu = serviceData.metrics.cpu
            logs.push(`[${new Date().toISOString()}] INFO: CPU utilisé: ${cpu.percentage}%`)
          }

          if (logs.length === 0) {
            logs.push(`[${new Date().toISOString()}] INFO: Service ${service.name} en cours de surveillance`)
          }

          setServiceLogs(logs)
        } else {
          setServiceLogs([`[${new Date().toISOString()}] INFO: Service ${service.name} - Métriques non disponibles`])
        }
      } else {
        setServiceLogs([`[${new Date().toISOString()}] INFO: Service ${service.name} - En attente de données`])
      }
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

  // Fonction pour tester Redis
  const testRedis = async () => {
    try {
      // Redis n'a pas d'endpoint HTTP standard, on teste la connectivité réseau
      const response = await axios.get('http://localhost:6379', {
        timeout: 3000,
        validateStatus: () => true // Accepter toutes les réponses
      })

      if (response.status === 200) {
        return {
          status: 'online',
          message: 'Redis accessible'
        }
      } else {
        return {
          status: 'offline',
          message: 'Redis non accessible'
        }
      }
    } catch (error: any) {
      return {
        status: 'offline',
        message: `Erreur Redis: ${error.message}`
      }
    }
  }

  // Fonction pour tester cAdvisor
  const testCadvisor = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/v1.3/docker/', {
        timeout: 5000
      })

      if (response.status === 200 && response.data) {
        return {
          status: 'online',
          message: `cAdvisor accessible - ${Object.keys(response.data).length} conteneurs surveillés`
        }
      } else {
        return {
          status: 'offline',
          message: 'cAdvisor non accessible'
        }
      }
    } catch (error: any) {
      return {
        status: 'offline',
        message: `Erreur cAdvisor: ${error.message}`
      }
    }
  }

  // Fonctions pour gérer la maintenance
  const activateMaintenance = async (service: ServiceStatus) => {
    try {
      const serviceName = service.serviceType
      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceName}/activate`, {
        message: `Maintenance activée pour ${service.name}`
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await loadMaintenances()
    } catch (error) {
      console.error('Erreur activation maintenance:', error)
    }
  }

  const deactivateMaintenance = async (service: ServiceStatus) => {
    try {
      const serviceName = service.serviceType
      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceName}/deactivate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await loadMaintenances()
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error)
    }
  }

  const getServiceMaintenance = (service: ServiceStatus) => {
    return service.serviceType ? maintenances[service.serviceType] : undefined
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

              {/* Indicateur de connexion au service de métriques */}
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Métriques en temps réel' : 'Service de métriques déconnecté'}
                </span>
                {metricsError && (
                  <span className="text-xs text-red-600">({metricsError})</span>
                )}
              </div>
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
                    setSelectedService(service)
                    fetchServiceLogs(service)
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border ${
                    getServiceMaintenance(service)?.isActive
                      ? 'border-red-300 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
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
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                        {getServiceMaintenance(service)?.isActive && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium rounded-full">
                            🔧 Maintenance
                          </span>
                        )}
                      </div>
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
                          {/* Contrôles de maintenance */}
                          {getServiceMaintenance(service)?.isActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deactivateMaintenance(service)
                              }}
                              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
                              title="Désactiver la maintenance"
                            >
                              🔧
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                activateMaintenance(service)
                              }}
                              className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded transition-colors"
                              title="Activer la maintenance"
                            >
                              🔧
                            </button>
                          )}

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
                {/* Métriques principales dans le modal */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Port</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedService.port}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedService.responseTime ? `${selectedService.responseTime}ms` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Version</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedService.version || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Statut</div>
                    <div className={`text-sm font-bold ${
                      selectedService.status === 'online' ? 'text-green-600' :
                      selectedService.status === 'testing' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {selectedService.status === 'online' ? '🟢 En ligne' :
                       selectedService.status === 'testing' ? '🔄 Test' : '🔴 Hors ligne'}
                    </div>
                  </div>
                </div>

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
                          <span className="font-medium text-gray-900 dark:text-gray-100 font-mono text-xs break-all">{selectedService.url}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Dernière vérification</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{new Date().toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            testService(selectedService, services.findIndex(s => s.name === selectedService.name))
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
                          🔗 Ouvrir dans un onglet
                        </button>
                      </div>
                    </div>

                    {/* Configuration du service */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Configuration</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={autoRefresh}
                              onChange={(e) => setAutoRefresh(e.target.checked)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {autoRefresh ? `Activé (${refreshInterval}s)` : 'Désactivé'}
                            </span>
                          </label>
                        </div>
                        {autoRefresh && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Intervalle (secondes)</span>
                            <input
                              type="number"
                              value={refreshInterval}
                              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                              min="5"
                              max="300"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ressources système réelles */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Ressources système</h3>
                      {metrics?.system ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Mémoire</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {metrics.system.memory.used}MB / {metrics.system.memory.total}MB ({metrics.system.memory.usage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${metrics.system.memory.usage}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">CPU</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {metrics.system.cpu.usage}% ({metrics.system.cpu.cores} cœurs)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${metrics.system.cpu.usage}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Charge système</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {metrics.system.load.average}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Métriques système non disponibles
                        </div>
                      )}
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
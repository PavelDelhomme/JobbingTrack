'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useMetrics } from '@/lib/hooks/useMetrics'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import axios from 'axios'

interface ServiceStatus {
  name: string
  url: string
  port: number
  status: 'online' | 'offline' | 'testing'
  responseTime?: number | string
  version?: string
  error?: string
  serviceType?: string
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/** Conteneur Docker pour logs réels (metrics-aggregator) — aligné lot A2 */
const METRICS_FOR_LOGS =
  process.env.NEXT_PUBLIC_METRICS_URL ||
  process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL ||
  'http://localhost:5004'

const SERVICE_TYPE_DOCKER: Record<string, string> = {
  gateway: 'jobbingtrack-api-gateway',
  auth: 'jobbingtrack-auth-service',
  application: 'jobbingtrack-application-service',
  company: 'jobbingtrack-company-service',
  contact: 'jobbingtrack-contact-service',
  interview: 'jobbingtrack-interview-service',
  notification: 'jobbingtrack-notification-service',
  dashboard: 'jobbingtrack-dashboard-service',
  call: 'jobbingtrack-call-service',
  event: 'jobbingtrack-event-service',
  followup: 'jobbingtrack-followup-service',
  profile: 'jobbingtrack-profile-service',
  workflow: 'jobbingtrack-workflow-service',
  metrics: 'jobbingtrack-metrics-aggregator',
  frontend: 'jobbingtrack-frontend',
  database: 'jobbingtrack-postgres',
  cache: 'jobbingtrack-redis',
}

export default function ServicesPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const { metrics, isConnected, error: metricsError, isLoading: metricsLoading } = useMetrics()
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>('services')
  // Configuration des vraies URLs des services (corrigées)
  const REAL_SERVICES = [
    { name: 'API Gateway', url: `${API_GATEWAY_URL}`, port: 3000, serviceType: 'gateway' },
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
    { name: 'Metrics Aggregator', url: 'http://localhost:8014/api/v1/health', port: 8014, serviceType: 'metrics' },
    { name: 'Frontend', url: 'http://localhost:3000', port: 3000, serviceType: 'frontend' },
    { name: 'Base de données', url: 'http://localhost:5432', port: 5432, serviceType: 'database' },
    { name: 'Redis', url: 'http://localhost:6379', port: 6379, serviceType: 'cache' },
    { name: 'Prometheus', url: 'http://localhost:9090/-/healthy', port: 9090, serviceType: 'monitoring' }
  ]

  const [services, setServices] = useState<ServiceStatus[]>([])

  // Charger les maintenances (avec fallback si service non disponible)
  const loadMaintenances = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 3000
      })
      if (response.data.success) {
        const maintenanceMap: {[key: string]: any} = {}
        response.data.maintenances.forEach((m: any) => {
          maintenanceMap[m.serviceName] = m
        })
        setMaintenances(maintenanceMap)
      }
    } catch (error) {
      // Service de maintenance non disponible - utiliser des valeurs par défaut
      console.warn('Service de maintenance non disponible, utilisation de valeurs par défaut')
      setMaintenances({})
    }
  }

  // Initialiser les services avec les vraies URLs et utiliser les métriques du service
  useEffect(() => {
    loadMaintenances()

    if (metrics && metrics.services) {
      const updatedServices = REAL_SERVICES.map(service => {
        // Recherche plus intelligente du service dans les métriques
        let serviceKey: string | null = null

        // Essayer différents patterns de recherche
        const searchPatterns = [
          service.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          service.name.toLowerCase(),
          service.serviceType,
          service.name.replace(/\s+/g, '-').toLowerCase(),
          service.name.split(' ')[0].toLowerCase() // Premier mot seulement
        ]

        for (const pattern of searchPatterns) {
          if (metrics.services && metrics.services[pattern]) {
            serviceKey = pattern
            break
          }
        }

      const serviceMetrics = serviceKey && metrics.services ? metrics.services[serviceKey as string] : null

        if (serviceMetrics && serviceMetrics.health) {
          return {
            name: service.name,
            url: service.url,
            port: service.port,
            serviceType: service.serviceType,
            status: serviceMetrics.health.status === 'online' ? 'online' as const :
                   serviceMetrics.health.status === 'offline' ? 'offline' as const : 'online' as const, // Assume online si status non défini
            responseTime: serviceMetrics.health.responseTime || 'N/A',
            version: serviceMetrics.health.version || serviceMetrics.version || '1.0.0',
            error: serviceMetrics.health.error
          }
        }

        // Service trouvé mais sans métriques détaillées - marquer comme test en cours
        return {
          name: service.name,
          url: service.url,
          port: service.port,
          serviceType: service.serviceType,
          status: 'testing' as const,
          responseTime: 'N/A',
          version: '1.0.0'
        }
      })
      setServices(updatedServices)
    } else {
      // Pas de métriques disponibles - initialiser avec testing
      const initialServices = REAL_SERVICES.map(service => ({
        name: service.name,
        url: service.url,
        port: service.port,
        serviceType: service.serviceType,
        status: 'testing' as const,
        responseTime: 'N/A',
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

    // Test automatique des métriques Prometheus pour l'API Gateway après 2 secondes
    const prometheusTimeout = setTimeout(async () => {
      try {
        // Vérifier d'abord si Prometheus est disponible
        const testResponse = await fetch(`${API_GATEWAY_URL}/api/v1/metrics/prometheus/query?query=up`, {
          signal: AbortSignal.timeout(2000)
        });

        if (testResponse.ok) {
          const apiGateway = services.find(s => s.name === 'API Gateway')
          if (apiGateway) {
            fetchPrometheusMetrics('API Gateway')
            fetchServiceDetailedMetrics(apiGateway)
          }
        } else {
          console.warn('Prometheus non disponible, test des métriques ignoré')
        }
      } catch (error) {
        console.warn('Erreur lors du test Prometheus:', error)
      }
    }, 2000)

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(testAllServices, refreshInterval * 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
      if (prometheusTimeout) clearTimeout(prometheusTimeout)
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
        // Configuration de la requête avec timeout plus long et gestion d'erreur améliorée
        const config = {
          timeout: 8000,
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          validateStatus: (status: number) => status < 500 // Accepter les erreurs 4xx comme réponses valides
        }

        try {
          response = await axios.get(service.url, config)
          responseTime = Date.now() - startTime

          setServices(prev => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              status: response.status >= 200 && response.status < 400 ? 'online' : 'offline',
              responseTime,
              version: response.data?.version || response.data?.serviceVersion || '1.0.0',
              error: response.status >= 400 ? `HTTP ${response.status}: ${response.statusText}` : undefined
            }
            return updated
          })
        } catch (axiosError: any) {
          responseTime = Date.now() - startTime

          // Gestion spécifique des erreurs de réseau
          let errorMessage = 'Service inaccessible'
          if (axiosError.code === 'ECONNREFUSED') {
            errorMessage = 'Service non démarré (connexion refusée)'
          } else if (axiosError.code === 'ETIMEDOUT') {
            errorMessage = 'Timeout - service lent à répondre'
          } else if (axiosError.code === 'ENOTFOUND') {
            errorMessage = 'Service non trouvé'
          } else if (axiosError.response) {
            errorMessage = `Erreur ${axiosError.response.status}: ${axiosError.response.statusText}`
          } else if (axiosError.message) {
            errorMessage = axiosError.message
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
    .filter(s => s.responseTime && typeof s.responseTime === 'number')
    .reduce((acc, s) => acc + (s.responseTime as number), 0) / (services.filter(s => s.responseTime && typeof s.responseTime === 'number').length || 1)

  // Logs réels Docker via metrics-aggregator (même API que /backoffice/services/logs — lot A2)
  const fetchServiceLogs = async (service: ServiceStatus) => {
    try {
      const dockerName = SERVICE_TYPE_DOCKER[service.serviceType || '']
      if (!dockerName) {
        setServiceLogs([
          `[${new Date().toISOString()}] INFO: Aucun conteneur Docker mappé pour « ${service.name} » (ex. Prometheus hors stack).`,
        ])
        return
      }
      const res = await fetch(
        `${METRICS_FOR_LOGS}/api/v1/docker/service/${encodeURIComponent(dockerName)}/logs?lines=100`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!res.ok) {
        setServiceLogs([
          `[${new Date().toISOString()}] WARN: Logs indisponibles (HTTP ${res.status}) — vérifier la stack et NEXT_PUBLIC_METRICS_URL (${METRICS_FOR_LOGS}).`,
        ])
        return
      }
      const data = await res.json()
      const raw = Array.isArray(data.lines) ? data.lines : []
      if (raw.length === 0) {
        setServiceLogs([
          `[${new Date().toISOString()}] INFO: Aucune ligne récente pour ${dockerName} (conteneur vide ou démarrage).`,
        ])
      } else {
        setServiceLogs(raw)
      }
    } catch (error) {
      console.error('Erreur récupération logs:', error)
      setServiceLogs([
        `[${new Date().toISOString()}] ERREUR: ${error instanceof Error ? error.message : 'récupération logs'}`,
      ])
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

  // Fonction pour tester cAdvisor (désactivée car non accessible depuis les conteneurs)
  const testCadvisor = async () => {
    return {
      status: 'offline',
      message: 'cAdvisor non accessible depuis les conteneurs'
    }
  }

  // Fonctions pour gérer la maintenance (désactivées temporairement - service non disponible)
  const activateMaintenance = async (service: ServiceStatus) => {
    try {
      // Service de maintenance non disponible pour le moment
      console.warn('Service de maintenance non disponible, fonction désactivée temporairement')
      // Simulation d'une maintenance activée
      setMaintenances(prev => ({
        ...prev,
        [(service.serviceType ?? service.name.toLowerCase())]: {
          isActive: true,
          serviceName: service.serviceType ?? service.name.toLowerCase(),
          message: `Maintenance activée pour ${service.name} (simulation)`,
          activatedAt: new Date().toISOString()
        }
      }))
    } catch (error) {
      console.error('Erreur activation maintenance:', error)
    }
  }

  const deactivateMaintenance = async (service: ServiceStatus) => {
    try {
      // Service de maintenance non disponible pour le moment
      console.warn('Service de maintenance non disponible, fonction désactivée temporairement')
      // Simulation d'une maintenance désactivée
      setMaintenances(prev => {
        const updated = { ...prev }
        const key = service.serviceType ?? service.name.toLowerCase()
        delete (updated as any)[key]
        return updated
      })
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error)
    }
  }

  const getServiceMaintenance = (service: ServiceStatus) => {
    return service.serviceType ? maintenances[service.serviceType] : undefined
  }

  // État pour les métriques Prometheus
  const [prometheusMetrics, setPrometheusMetrics] = useState<{[serviceName: string]: any}>({})

  // Fonction pour récupérer les métriques Prometheus via l'API Gateway
  const fetchPrometheusMetrics = async (serviceName: string) => {
    try {
      const apiUrl = API_GATEWAY_URL

      // Vérifier d'abord si Prometheus est disponible
      try {
        const testResponse = await fetch(`${apiUrl}/api/v1/metrics/prometheus/query?query=up`, {
          signal: AbortSignal.timeout(2000)
        });

        if (!testResponse.ok) {
          throw new Error('Prometheus non disponible');
        }
      } catch (prometheusError) {
        console.warn(`Prometheus non disponible pour ${serviceName}, utilisation des métriques fallback`);
        return null;
      }

      // Construire la requête Prometheus pour les métriques du service
      // Chercher les métriques de statut du service dans le job backend
      const query = `up{job="jobbingtrack-backend"}`

      const response = await fetch(`${apiUrl}/api/v1/metrics/prometheus/query?query=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.status === 'success' && data.data.result.length > 0) {
          const result = data.data.result[0]
          const value = parseFloat(result.value[1]) // 1 = up, 0 = down

          setPrometheusMetrics(prev => ({
            ...prev,
            [serviceName]: {
              status: value === 1 ? 'online' : 'offline',
              lastCheck: new Date().toISOString(),
              source: 'prometheus'
            }
          }))
        }
      }
    } catch (error) {
      console.error(`Erreur récupération métriques Prometheus pour ${serviceName}:`, error)
    }
  }

  // Fonction pour récupérer les métriques détaillées d'un service depuis Prometheus via API Gateway
  const fetchServiceDetailedMetrics = async (service: ServiceStatus) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

      // Utiliser le service centralisé pour les métriques
      const cpuMetrics = await centralMetricsService.getSystemMetrics()
      const containerMetrics = await centralMetricsService.getContainerMetrics()

      // Toutes les métriques détaillées sont maintenant N/A
      const metrics = {
        cpu: { usage: 'N/A', percentage: 'N/A' },
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        source: 'N/A'
      }

      setPrometheusMetrics(prev => ({
        ...prev,
        [service.name]: metrics
      }))

    } catch (error) {
      console.error(`Erreur récupération métriques détaillées Prometheus pour ${service.name}:`, error)
    }
  }

  // Fonction pour récupérer les métriques pour un service spécifique
  const getServiceMetrics = (service: ServiceStatus) => {
    // D'abord, chercher dans les métriques Prometheus (si disponibles)
    if (prometheusMetrics[service.name]) {
      return {
        type: 'prometheus',
        data: prometheusMetrics[service.name]
      }
    }

    // Ensuite, chercher dans les métriques de service (si disponibles)
    if (metrics?.services) {
      // Recherche du service dans les métriques de service
      let serviceKey = null

      // Essaie différents patterns pour faire correspondre le service
      const searchPatterns = [
        service.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        service.name.toLowerCase(),
        service.serviceType,
        service.name.replace(/\s+/g, '-').toLowerCase(),
        service.name.split(' ')[0].toLowerCase()
      ]

      for (const pattern of searchPatterns) {
        if (pattern && metrics.services && metrics.services[pattern]) {
          serviceKey = pattern
          break
        }
      }

      const serviceMetrics = serviceKey && metrics.services ? metrics.services[serviceKey as string] : null

      if (serviceMetrics && serviceMetrics.metrics) {
        // Retourner les métriques de service si disponibles
        return {
          type: 'service',
          data: {
            memory: serviceMetrics.metrics.memory || { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
            cpu: serviceMetrics.metrics.cpu || { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
            status: serviceMetrics.status || 'N/A'
          }
        }
      }
    }

    // Sinon, chercher dans les métriques de conteneurs
      if (metrics?.containers && !Array.isArray(metrics.containers)) {
      // Recherche du nom du conteneur correspondant au service
      const containerName = Object.keys(metrics.containers).find(containerKey => {
        // Essaie différents patterns pour faire correspondre le service au conteneur
        const serviceLower = service.name.toLowerCase().replace(/\s+/g, '')
        const containerLower = containerKey.toLowerCase()

        return containerLower.includes(serviceLower) ||
               serviceLower.includes(containerLower) ||
               (service.serviceType ? containerLower.includes(service.serviceType) : false) ||
               (service.serviceType ? service.serviceType === containerKey : false)
      })

      if (containerName) {
        return {
          type: 'container',
          data: (metrics.containers as any)[containerName]
        }
      }
    }

    return null
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

              <button
                onClick={() => {
                  // Récupérer les métriques Prometheus pour tous les services
                  services.forEach(service => {
                    fetchPrometheusMetrics(service.name)
                    fetchServiceDetailedMetrics(service)
                  })
                }}
                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                📊 Métriques Prometheus
              </button>

              <button
                onClick={() => {
                  // Test spécifique pour l'API Gateway avec les bonnes requêtes Prometheus
                  const apiGateway = services.find(s => s.name === 'API Gateway')
                  if (apiGateway) {
                    // Requête spécifique pour l'API Gateway
                    fetchPrometheusMetrics('API Gateway')
                    // Requête spécifique pour les métriques de conteneur de l'API Gateway
                    fetchServiceDetailedMetrics(apiGateway)
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                🚀 Test API Gateway
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
                {Number.isFinite(averageResponseTime) ? `${Math.round(averageResponseTime as number)}ms` : 'N/A'}
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
                          {service.responseTime && service.responseTime !== 'N/A' ? `${service.responseTime}ms` : 'N/A'}
                        </span>
                      </div>

                      {/* Métriques du service pour la carte */}
                      {(() => {
                        const serviceMetrics = getServiceMetrics(service)
                        if (serviceMetrics && serviceMetrics.data.memory.percentage !== 'N/A') {
                          return (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Mémoire:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {serviceMetrics.data.memory.percentage}%
                                </span>
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {serviceMetrics.data.cpu.percentage}%
                                </span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}

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

                    {/* Ressources du service spécifique */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Ressources du service
                        {(() => {
                          const serviceMetrics = getServiceMetrics(selectedService)
                          if (serviceMetrics?.type === 'prometheus') {
                            return <span className="ml-2 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded">📊 Prometheus</span>
                          } else if (serviceMetrics?.type === 'service') {
                            return <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">⚙️ Service</span>
                          } else if (serviceMetrics?.type === 'container') {
                            return <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">🐳 Container</span>
                          }
                          return null
                        })()}
                      </h3>
                      {(() => {
                        const serviceMetrics = getServiceMetrics(selectedService)

                        if (serviceMetrics) {
                          const metrics = serviceMetrics.data

                          return (
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {serviceMetrics.type === 'service' ? 'Mémoire utilisée' :
                                     serviceMetrics.type === 'prometheus' ? 'Mémoire consommée' : 'Mémoire allouée'}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {metrics.memory.usage !== 'N/A' && metrics.memory.limit !== 'N/A'
                                      ? `${metrics.memory.usage}MB / ${metrics.memory.limit}MB (${metrics.memory.percentage}%)`
                                      : metrics.memory.usage !== 'N/A'
                                      ? `${metrics.memory.usage}MB`
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                {metrics.memory.percentage !== 'N/A' && (
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all ${
                                      serviceMetrics.type === 'prometheus' ? 'bg-purple-500' :
                                      serviceMetrics.type === 'service' ? 'bg-blue-500' : 'bg-green-500'
                                    }`} style={{ width: `${metrics.memory.percentage}%` }}></div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600 dark:text-gray-400">Utilisation CPU</span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {metrics.cpu.percentage !== 'N/A'
                                      ? `${metrics.cpu.percentage}%`
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                {metrics.cpu.percentage !== 'N/A' && (
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all ${
                                      serviceMetrics.type === 'prometheus' ? 'bg-purple-500' :
                                      serviceMetrics.type === 'service' ? 'bg-blue-500' : 'bg-green-500'
                                    }`} style={{ width: `${metrics.cpu.percentage}%` }}></div>
                                  </div>
                                )}
                              </div>
                              {serviceMetrics.type === 'container' && (
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Statut conteneur</span>
                                    <span className={`font-medium ${
                                      metrics.status === 'running' ? 'text-green-600' :
                                      metrics.status === 'exited' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {metrics.status !== 'N/A' ? metrics.status : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Métriques réseau si disponibles */}
                              {metrics.network && (metrics.network.rx_bytes !== 'N/A' || metrics.network.tx_bytes !== 'N/A') && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Trafic réseau</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {metrics.network.rx_bytes !== 'N/A' && metrics.network.tx_bytes !== 'N/A'
                                        ? `↓ ${Math.round(metrics.network.rx_bytes / 1024)}KB/s ↑ ${Math.round(metrics.network.tx_bytes / 1024)}KB/s`
                                        : 'N/A'
                                      }
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Information sur la source */}
                              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Source: {serviceMetrics.type === 'prometheus' ? 'Prometheus (métriques temps réel)' :
                                          serviceMetrics.type === 'service' ? 'Service interne' : 'cAdvisor (conteneur)'}
                                </div>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Métriques du service non disponibles pour {selectedService.name}
                            <br />
                            <button
                              onClick={() => fetchServiceDetailedMetrics(selectedService)}
                              className="mt-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 px-2 py-1 rounded transition-colors"
                            >
                              🔄 Essayer Prometheus
                            </button>
                          </div>
                        )
                      })()}
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
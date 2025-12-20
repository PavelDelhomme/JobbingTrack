import {
  SystemMetrics,
  ServiceMetrics,
  ContainerMetrics,
  ContainerMetricEntry,
  MetricsData,
  NetworkMetricsOverview,
  ResponseTimeOverview,
  ErrorMetricsOverview,
  HealthOverview,
  UserCustomization
} from '@/lib/interfaces'
import { formatServiceName, getServiceUrl, getServicePort } from '@/lib/utils/metricsUtils'
import { cacheManager } from '@/lib/cache/cacheManager'

class CentralMetricsService {
  private apiUrl: string
  private prometheusUrl: string
  private monitoringCUrl: string // ✅ NOUVEAU : URL du monitoring en C
  private token: string | null = null
  private customization: UserCustomization | null = null
  // ✅ OPTIMISATION : Cache réduit pour économiser la mémoire
  // Le cache est maintenant limité en taille et durée
  private metricsCache: MetricsData | null = null
  private cacheTimestamp: number = 0
  private cacheDuration: number = 5000 // 5 secondes (réduit de 10s à 5s)
  private maxCacheSize: number = 50 // Limite en MB (environ)
  private isLoading: boolean = false
  private loadingPromises: Map<string, Promise<any>> = new Map()

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.prometheusUrl = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'
    // ✅ NOUVEAU : Monitoring en C (port 5098) au lieu de l'ancien système
    // Si on est côté serveur (SSR), utiliser le nom du service Docker
    // Si on est côté client (navigateur), utiliser localhost
    if (typeof window === 'undefined') {
      // Côté serveur (SSR) - utiliser le nom du service Docker
      this.monitoringCUrl = process.env.NEXT_PUBLIC_MONITORING_C_URL || process.env.MONITORING_C_URL || 'http://monitoring-c:8015'
    } else {
      // Côté client (navigateur) - utiliser localhost avec le port mappé
      this.monitoringCUrl = process.env.NEXT_PUBLIC_MONITORING_C_URL || 'http://localhost:5098'
    }
    this.updateToken()
  }

  private updateToken() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  private isAuthenticated(): boolean {
    return !!(this.token && this.token.trim() !== '')
  }

  private isValidToken(): boolean {
    if (!this.isAuthenticated()) return false

    // En mode développement, accepter les tokens mock
    if (process.env.NODE_ENV === 'development' && this.token?.startsWith('mock-jwt-token')) {
      return true
    }

    // Pour les vrais tokens, vérifier le format
    return this.token!.split('.').length === 3
  }

  // Gestion du cache pour éviter les requêtes multiples
  private getCachedMetrics(): MetricsData | null {
    // ✅ OPTIMISATION : Cache avec vérification de taille mémoire
    const now = Date.now()
    if (this.metricsCache && (now - this.cacheTimestamp) < this.cacheDuration) {
      // Vérifier la taille approximative du cache (JSON stringifié)
      try {
        const size = JSON.stringify(this.metricsCache).length / 1024 / 1024 // MB
        if (size > this.maxCacheSize) {
          // Cache trop volumineux, le vider
          console.warn('[CENTRAL METRICS] ⚠️ Cache trop volumineux, vidage automatique', size.toFixed(2) + 'MB')
          this.clearCache()
          return null
        }
      } catch (e) {
        // Erreur de sérialisation, vider le cache
        this.clearCache()
        return null
      }
      return this.metricsCache
    }
    return null
  }

  private setCachedMetrics(metrics: MetricsData): void {
    // ✅ OPTIMISATION : Vérifier la taille avant de mettre en cache
    try {
      const size = JSON.stringify(metrics).length / 1024 / 1024 // MB
      if (size > this.maxCacheSize) {
        console.warn('[CENTRAL METRICS] ⚠️ Métriques trop volumineuses pour le cache', size.toFixed(2) + 'MB')
        // Ne pas mettre en cache si trop volumineux
        return
      }
    } catch (e) {
      // Erreur de sérialisation, ne pas mettre en cache
      return
    }
    this.metricsCache = metrics
    this.cacheTimestamp = Date.now()
  }

  private clearCache(): void {
    this.metricsCache = null
    this.cacheTimestamp = 0
  }

  // Méthode pour éviter les requêtes simultanées identiques
  private async getWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Vérifier si une requête identique est déjà en cours
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!
    }

    const promise = fetcher().finally(() => {
      this.loadingPromises.delete(key)
    })

    this.loadingPromises.set(key, promise)
    return promise
  }

  // Récupération de la personnalisation utilisateur
  async getUserCustomization(): Promise<UserCustomization | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/users/customization`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          this.customization = data.customization
          return data.customization
        }
      }
    } catch (error) {
      console.error('Erreur récupération personnalisation:', error)
    }

    // Fallback vers localStorage
    if (typeof window !== 'undefined') {
      const localCustomization = localStorage.getItem('userCustomization')
      if (localCustomization) {
        try {
          this.customization = JSON.parse(localCustomization)
          return this.customization
        } catch (error) {
          console.error('Erreur parsing personnalisation localStorage:', error)
        }
      }
    }

    // Valeurs par défaut
    this.customization = {
      theme: 'light',
      language: 'fr',
      dashboardLayout: 'default',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      features: {
        analytics: true,
        maintenance: true,
        security: true
      },
      metrics: {
        refreshInterval: 30000,
        defaultView: 'system',
        showContainers: true,
        showServices: true
      }
    }

    return this.customization
  }

  // Sauvegarde de la personnalisation utilisateur
  async saveUserCustomization(customization: Partial<UserCustomization>): Promise<boolean> {
    try {
      if (this.customization) {
        this.customization = { ...this.customization, ...customization }

        // Sauvegarder en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('userCustomization', JSON.stringify(this.customization))
        }

        return true
      }
    } catch (error) {
      console.error('Erreur sauvegarde personnalisation:', error)
    }

    return false
  }

  // Récupération des métriques système depuis Prometheus via l'API Gateway
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    // Mettre à jour le token
    this.updateToken()

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null
    }

    try {
      // Endpoint de monitoring système non disponible, utiliser le service de métriques
      console.log('[SYSTEM] Endpoint non disponible, utilisation du service de métriques')

      // Utiliser le service de métriques agrégateur
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Augmenté à 10s
      })

      if (response.ok) {
        const data = await response.json()
        if (data.system) {
          return {
            cpu: {
              // Le backend renvoie 'percent', on le mappe vers 'usage'
              usage: data.system.cpu?.percent ?? data.system.cpu?.usage ?? 0,
              cores: data.system.cpus || data.system.cpu?.cores || 'N/A',
              model: data.system.cpu?.model || data.system.architecture || 'N/A'
            },
            memory: {
              total: data.system.memory_total || data.system.memory?.total || 'N/A',
              used: data.system.memory?.used || 'N/A',
              free: data.system.memory?.free || 'N/A',
              // Le backend renvoie 'percent', on le mappe vers 'usage'
              usage: data.system.memory?.percent ?? data.system.memory?.usage ?? 0
            },
            load: {
              average: data.system.load?.average || data.system.uptime ? (data.system.uptime / 3600).toFixed(1) : 0,
              cores: data.system.cpus || data.system.load?.cores || 'N/A'
            },
            disk: data.system.disk || []
          }
        }
      }

      // Dernier fallback : données système basiques du navigateur
      if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
        return {
          cpu: {
            usage: 0, // Le navigateur ne peut pas mesurer l'utilisation CPU du système
            cores: navigator.hardwareConcurrency,
            model: 'N/A'
          },
          memory: {
            total: 'N/A',
            used: 'N/A',
            free: 'N/A',
            usage: 0
          },
          load: {
            average: 0,
            cores: 'N/A'
          },
          disk: []
        }
      }

      return null
    } catch (error) {
      console.error('Erreur récupération métriques système:', error)
      return null
    }
  }

  // Récupération des métriques de conteneurs depuis Prometheus via le service agrégateur
  async getContainerMetrics(): Promise<ContainerMetrics | null> {
    // Mettre à jour le token
    this.updateToken()

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null
    }

    try {
      console.log('[CONTAINERS] Récupération des métriques depuis Prometheus...')

      // Utiliser le service de métriques agrégateur qui se connecte à Prometheus
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Augmenté à 10s
      })

      if (response.ok) {
        const data = await response.json()
        if (data.containers && Object.keys(data.containers).length > 0) {
          console.log('[CONTAINERS] ✅ Métriques conteneurs récupérées depuis Prometheus')
          return data.containers
        }
      }

      // NOTE: cAdvisor n'est pas accessible directement depuis le frontend
      // Le frontend doit utiliser uniquement l'API metrics-aggregator (port 8014)
      // qui se charge de récupérer les données depuis Prometheus/cAdvisor en interne

      // Retourner un objet vide si aucune source n'est disponible
      console.log('[CONTAINERS] Aucune source de métriques conteneurs disponible')
      return {}
    } catch (error) {
      console.error('Erreur récupération métriques conteneurs:', error)
      return null
    }
  }

  // Récupération des métriques de services depuis Prometheus
  async getServiceMetrics(): Promise<{ [key: string]: ServiceMetrics } | null> {
    // Mettre à jour le token
    this.updateToken()

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null
    }

    try {
      // Utiliser le service de métriques agrégateur
      console.log('[SERVICES] Récupération depuis le service de métriques')

      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const response = await fetch(`${metricsUrl}/api/v1/services`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Augmenté à 10s
      })

      if (response.ok) {
        const data = await response.json()
        if (data.containers && Array.isArray(data.containers)) {
          // Convertir le tableau en objet avec name comme clé
          const servicesMap: any = {}
          data.containers.forEach((container: any) => {
            servicesMap[container.name] = container
          })
          return servicesMap
        }
      }

      // Fallback vers la liste des services depuis Docker
      const dockerServices = await this.getDockerServices()
      if (dockerServices) {
        const serviceMetrics: { [key: string]: ServiceMetrics } = {}

        Object.keys(dockerServices).forEach(serviceName => {
          const service = dockerServices[serviceName]
          serviceMetrics[serviceName] = {
            name: service.name,
            url: service.url,
            port: service.port,
            status: service.status,
            responseTime: 'N/A',
            version: 'N/A',
            metrics: service.metrics,
            lastCheck: service.lastCheck
          }
        })

        return serviceMetrics
      }

      // Dernier fallback : retourner une liste vide au lieu de null
      return {}
    } catch (error) {
      console.error('Erreur récupération métriques services:', error)
      return null
    }
  }

  // Requête Prometheus générique via l'API Gateway (endpoint non disponible)
  private async queryPrometheus(query: string): Promise<string | null> {
    // Endpoint Prometheus non disponible, retourner null
    console.log('[PROMETHEUS] Endpoint non disponible')
    return null
  }

  // Récupération des métriques de maintenance depuis l'API Gateway
  async getMaintenanceMetrics(): Promise<any> {
    // Endpoint de maintenance non disponible, retourner des données par défaut
    console.log('[MAINTENANCE] Endpoint non disponible, utilisation des données par défaut')
    return { maintenances: [] }
  }

  // Récupération des logs de sécurité depuis l'API Gateway
  async getSecurityLogs(level: string = 'error', limit: number = 100): Promise<any> {
    // Endpoint de sécurité non disponible, retourner des données par défaut
    console.log('[SECURITY] Endpoint non disponible, utilisation des données par défaut')
    return { logs: [] }
  }

  // Récupération complète des métriques depuis différentes sources
  async getAllMetrics(): Promise<MetricsData | null> {
    try {
      const [systemMetrics, containerMetrics, serviceMetrics, customization] = await Promise.all([
        this.getSystemMetrics(),
        this.getContainerMetrics(),
        this.getServiceMetrics(),
        this.getUserCustomization()
      ])

      if (!systemMetrics) return null

      return {
        services: serviceMetrics || {},
        system: systemMetrics,
        containers: containerMetrics || {},
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Erreur récupération toutes métriques:', error)
      return null
    }
  }

  // Récupération des métriques système depuis cAdvisor (non accessible depuis les conteneurs)
  async getCadvisorMetrics(): Promise<any> {
    console.log('[CADVISOR] Non accessible depuis les conteneurs')
    return null
  }

  // Récupération des métriques depuis le service agrégateur
  async getAggregatorMetrics(): Promise<MetricsData | null> {
    try {
      // ✅ NOUVEAU : Utiliser monitoring-c (port 5014) au lieu de l'ancien système
      // Essayer d'abord monitoring-c, puis fallback vers l'ancien système
      let metricsUrl = this.monitoringCUrl
      let endpoint = '/api/v1/metrics' // Endpoint monitoring-c
      
      try {
        // Tenter monitoring-c d'abord
        const response = await fetch(`${metricsUrl}${endpoint}`, {
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(2000) // 2s timeout pour monitoring-c
        })
        
        if (response.ok && response.status === 200) {
          const text = await response.text()
          if (!text || text.trim().length === 0) {
            throw new Error('Empty response from monitoring-c')
          }
          const data = JSON.parse(text)
          // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
          // console.log('[CENTRAL METRICS] ✅ Métriques depuis monitoring-c (nouveau système)')
          return this.formatMetricsFromMonitoringC(data)
        }
      } catch (error: any) {
        // Ignorer complètement les erreurs de monitoring-c
        // Ne pas afficher dans la console, ne pas logger
        // Le service basculera automatiquement vers l'ancien système
        // Rien à faire ici, on continue avec le fallback
        // Fallback vers l'ancien système si monitoring-c n'est pas disponible
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[CENTRAL METRICS] ⚠️ Monitoring-c non disponible, fallback vers ancien système')
        metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
        endpoint = '/api/v1/docker/jobbingtrack/aggregated'
      }

      const response = await fetch(`${metricsUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const timestamp = data.timestamp || new Date().toISOString()

      // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
      // console.log('[AGGREGATOR] Données Docker brutes reçues:', {
      //   cpu_percent: data.cpu_percent,
      //   memory_percent: data.memory_percent,
      //   memory_usage_mb: data.memory_usage_mb,
      //   total_cpus: data.total_cpus,
      //   containers_count: data.containers_count,
      //   containers_array_length: Array.isArray(data.containers) ? data.containers.length : 'not array',
      //   services_array_length: Array.isArray(data.services) ? data.services.length : 'not array',
      //   network_rx_mb: data.network?.total_rx_mb,
      //   network_tx_mb: data.network?.total_tx_mb,
      //   availability: data.health?.availability_percent,
      //   timestamp
      // })

      const containersArray = Array.isArray(data.containers) ? data.containers : []
      const servicesArray = Array.isArray(data.services) ? data.services : []
      const mergedServices = containersArray.length > 0 ? containersArray : servicesArray
      
      // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
      // console.log('[AGGREGATOR] Traitement des services:', {
      //   containersArray_length: containersArray.length,
      //   servicesArray_length: servicesArray.length,
      //   mergedServices_length: mergedServices.length
      // })

      const servicesList: ServiceMetrics[] = mergedServices.map((service: any) => {
        const rawName = service?.name || service?.container || service?.id || 'unknown-service'
        const serviceType = service?.service_type || rawName.replace(/^jobbingtrack-/, '')
        const baseServiceType = serviceType
          .replace(/-prod$/, '')
          .replace(/-preview$/, '')
          .replace(/-staging$/, '')

        const displayName = formatServiceName(rawName)
        const rawStatus = service?.health_status || service?.status || 'unknown'
        const status = rawStatus === 'offline' ? 'offline' : rawStatus

        const responseTimeMs = typeof service?.response_time_ms === 'number'
          ? parseFloat(service.response_time_ms.toFixed(2))
          : null

        const errorRatePerMin = typeof service?.error_rate_per_min === 'number'
          ? parseFloat(service.error_rate_per_min.toFixed(2))
          : 0

        const errorCount5m = typeof service?.error_count_5m === 'number'
          ? parseFloat(service.error_count_5m.toFixed(2))
          : 0

        const cpuPercent = typeof service?.cpu_percent === 'number'
          ? parseFloat(service.cpu_percent.toFixed(2))
          : (service?.metrics?.cpu_percent ?? 0)

        const memoryPercent = typeof service?.memory_percent === 'number'
          ? parseFloat(service.memory_percent.toFixed(2))
          : (service?.metrics?.memory_percent ?? 0)

        const memoryUsageMb = typeof service?.memory_usage_mb === 'number'
          ? parseFloat(service.memory_usage_mb.toFixed(2))
          : (service?.metrics?.memory_usage_mb ?? 0)

        const memoryLimitMb = typeof service?.memory_limit_mb === 'number'
          ? parseFloat(service.memory_limit_mb.toFixed(2))
          : (service?.metrics?.memory_limit_mb ?? 0)

        const networkRxMb = typeof service?.network_rx_mb === 'number'
          ? parseFloat(service.network_rx_mb.toFixed(2))
          : (service?.metrics?.network_rx_mb ?? 0)

        const networkTxMb = typeof service?.network_tx_mb === 'number'
          ? parseFloat(service.network_tx_mb.toFixed(2))
          : (service?.metrics?.network_tx_mb ?? 0)

        const pids = typeof service?.pids === 'number'
          ? service.pids
          : (service?.metrics?.pids ?? null)

        const healthError = service?.health_error || service?.metrics?.health_error || undefined

        const serviceMetric: ServiceMetrics = {
          id: rawName,
          rawName,
          displayName,
          serviceType: baseServiceType,
          name: displayName,
          url: getServiceUrl(baseServiceType),
          port: getServicePort(baseServiceType),
          status,
          responseTime: responseTimeMs !== null ? responseTimeMs : 'N/A',
          responseTimeMs,
          version: 'N/A',
          healthStatus: status,
          healthError,
          health: {
            status,
            responseTime: responseTimeMs !== null ? responseTimeMs : 'N/A',
            error: healthError
          },
          lastCheck: timestamp,
          pids,
          errorRatePerMin,
          errorCount5m,
          metrics: {
            memory: {
              usage: memoryUsageMb,
              limit: memoryLimitMb,
              percentage: memoryPercent,
              usageMb: memoryUsageMb,
              limitMb: memoryLimitMb
            },
            cpu: {
              usage: cpuPercent,
              system: cpuPercent,
              percentage: cpuPercent,
              perCore: data.cpu_percent_per_core || 0
            },
            network: {
              rx_bytes: networkRxMb * 1024 * 1024,
              tx_bytes: networkTxMb * 1024 * 1024,
              rx_mb: networkRxMb,
              tx_mb: networkTxMb
            }
          },
          networkMb: {
            rx: networkRxMb,
            tx: networkTxMb
          }
        }

        return serviceMetric
      })

      const servicesMap: { [key: string]: ServiceMetrics } = {}
      const containersMap: Record<string, ContainerMetricEntry> = {}

      servicesList.forEach(service => {
        const key = service.rawName || service.name
        servicesMap[key] = service

        containersMap[key] = {
          name: service.rawName || service.name,
          memory: {
            usage: service.metrics?.memory?.usage ?? 0,
            limit: service.metrics?.memory?.limit ?? 0,
            percentage: service.metrics?.memory?.percentage ?? 0,
            usageMb: service.metrics?.memory?.usageMb,
            limitMb: service.metrics?.memory?.limitMb
          },
          cpu: {
            usage: service.metrics?.cpu?.usage ?? 0,
            system: service.metrics?.cpu?.system ?? 0,
            percentage: service.metrics?.cpu?.percentage ?? 0,
            perCore: service.metrics?.cpu?.perCore
          },
          network: {
            rx_bytes: service.metrics?.network?.rx_bytes ?? 0,
            tx_bytes: service.metrics?.network?.tx_bytes ?? 0,
            rx_mb: service.metrics?.network?.rx_mb,
            tx_mb: service.metrics?.network?.tx_mb
          },
          status: service.status,
          response_time_ms: service.responseTimeMs ?? null,
          error_count_5m: service.errorCount5m ?? 0,
          error_rate_per_min: service.errorRatePerMin ?? 0,
          pids: service.pids ?? null
        }
      })

      const networkStats: NetworkMetricsOverview = data.network ? {
        total_rx_mb: data.network.total_rx_mb,
        total_tx_mb: data.network.total_tx_mb,
        per_service: data.network.per_service
      } : {
        total_rx_mb: servicesList.reduce((sum, service) => sum + (service.networkMb?.rx ?? 0), 0),
        total_tx_mb: servicesList.reduce((sum, service) => sum + (service.networkMb?.tx ?? 0), 0),
        per_service: servicesList.map(service => ({
          name: service.rawName || service.name,
          rx_mb: service.networkMb?.rx ?? 0,
          tx_mb: service.networkMb?.tx ?? 0
        }))
      }

      const numericResponseTimes = servicesList
        .filter(service => typeof service.responseTimeMs === 'number')
        .map(service => service.responseTimeMs as number)

      const averageResponseTime = numericResponseTimes.length > 0
        ? parseFloat((numericResponseTimes.reduce((sum, value) => sum + value, 0) / numericResponseTimes.length).toFixed(2))
        : null

      const fastestResponseTime = numericResponseTimes.length > 0
        ? Math.min(...numericResponseTimes)
        : null

      const slowestResponseTime = numericResponseTimes.length > 0
        ? Math.max(...numericResponseTimes)
        : null

      const responseTimeStats: ResponseTimeOverview = data.response_time || {
        average_ms: averageResponseTime,
        fastest_ms: fastestResponseTime,
        slowest_ms: slowestResponseTime,
        per_service: servicesList.map(service => ({
          name: service.rawName || service.name,
          status: service.status,
          response_time_ms: service.responseTimeMs ?? null
        }))
      }

      const errorStats: ErrorMetricsOverview = data.errors || {
        total_last_5m: servicesList.reduce((sum, service) => sum + (service.errorCount5m ?? 0), 0),
        rate_per_min: servicesList.reduce((sum, service) => sum + (service.errorRatePerMin ?? 0), 0),
        per_service: servicesList.map(service => ({
          name: service.rawName || service.name,
          count_last_5m: service.errorCount5m ?? 0,
          rate_per_min: service.errorRatePerMin ?? 0
        }))
      }

      const healthStats: HealthOverview = data.health || {
        availability_percent: servicesList.length > 0
          ? parseFloat(((servicesList.filter(service => service.status === 'healthy').length / servicesList.length) * 100).toFixed(2))
          : 0,
        system_availability_percent: data.health?.system_availability_percent,
        healthy: servicesList.filter(service => service.status === 'healthy').length,
        degraded: servicesList.filter(service => service.status === 'degraded').length,
        offline: servicesList.filter(service => service.status === 'offline').length,
        containers_running: data.health?.containers_running,
        containers_total: data.health?.containers_total ?? servicesList.length
      }

      const overallLoadScore = typeof data.overall_load_score === 'number'
        ? data.overall_load_score
        : undefined

      const mappedSystem: SystemMetrics = {
        cpu: {
          usage: data.cpu_percent || 0,
          cores: data.total_cpus || 'N/A',
          model: 'Docker Containers',
          containers_only: data.cpu_containers_only || 0,
          per_core: data.cpu_percent_per_core || 0,
          loadScore: overallLoadScore
        },
        memory: {
          total: data.system_memory_total_gb ? `${data.system_memory_total_gb} GB` : 'N/A',
          used: data.memory_usage_mb ? `${(data.memory_usage_mb / 1024).toFixed(2)} GB` : 'N/A',
          free: data.memory_usage_mb && data.system_memory_total_gb
            ? `${(data.system_memory_total_gb - data.memory_usage_mb / 1024).toFixed(2)} GB`
            : 'N/A',
          usage: data.memory_percent || 0,
          usage_mb: data.memory_usage_mb || 0,
          limit_mb: data.memory_system_total_mb || 0
        },
        load: {
          average: data.load_average || 0,
          cores: data.total_cpus || 'N/A'
        },
        disk: data.disk || [],
        network: networkStats,
        availability: healthStats,
        errors: errorStats,
        overallLoadScore,
        jobbingtrack: {
          containers: {
            count: data.containers_count || servicesList.length,
            cpu: {
              averagePercent: parseFloat((data.cpu_percent || 0).toFixed(2)),
              totalPercent: parseFloat((data.cpu_percent || 0).toFixed(2)),
              perCore: data.cpu_percent_per_core || 0
            },
            memory: {
              used: Math.round(data.memory_usage_mb || 0),
              limit: Math.round(data.memory_system_total_mb || 0),
              percent: parseFloat((data.memory_percent || 0).toFixed(2))
            }
          }
        },
        containers: mergedServices
      }

      // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
      // console.log('[AGGREGATOR] ✅ Retour des métriques:', {
      //   servicesList_length: servicesList.length,
      //   servicesMap_keys: Object.keys(servicesMap).length,
      //   containersMap_keys: Object.keys(containersMap).length,
      //   cpu_percent: data.cpu_percent,
      //   memory_percent: data.memory_percent,
      //   responseTime_avg: responseTimeStats.average_ms,
      //   errors_total: errorStats.total_last_5m,
      //   health_availability: healthStats.availability_percent
      // })

      return {
        services: servicesMap,
        servicesList,
        system: mappedSystem,
        containers: containersMap,
        timestamp,
        network: networkStats,
        responseTime: responseTimeStats,
        errors: errorStats,
        health: healthStats,
        overallLoadScore
      }
    } catch (error) {
      console.error('[AGGREGATOR] ❌ Erreur récupération métriques agrégateur:', error)
      return null
    }

    console.warn('[AGGREGATOR] ⚠️ Aucune donnée retournée (pas d\'erreur mais pas de données)')
    return null
  }

  // Récupération de tous les services depuis l'API Gateway avec timeout
  async getAllServices(): Promise<any[] | null> {
    // Données de test par défaut pour éviter les erreurs 404
    const defaultServices = [
      { name: 'auth-service', status: 'running', url: 'http://localhost:3001', health: { status: 'online' } },
      { name: 'api-gateway', status: 'running', url: 'http://localhost:3000', health: { status: 'online' } },
      { name: 'dashboard-service', status: 'running', url: 'http://localhost:3007', health: { status: 'online' } },
      { name: 'frontend', status: 'running', url: 'http://localhost:8080', health: { status: 'online' } }
    ]

    try {
      // Priorité 1 : Agrégateur de métriques (source la plus fiable)
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const response = await fetch(`${metricsUrl}/api/v1/docker/services/all`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(20000) // 20s au lieu de 10s
      })

      if (response.ok) {
        const data = await response.json()
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[SERVICES] ✅ Services récupérés depuis l\'agrégateur:', data.total, 'services')
        return data.services || []
      }
    } catch (error: any) {
      // Logger silencieusement les timeouts uniquement en développement
      if (error.name === 'TimeoutError' && process.env.NODE_ENV === 'development') {
        console.warn('[SERVICES] ⏱️ Timeout lors de la récupération des services depuis Docker (20s)')
      } else if (error.name !== 'TimeoutError') {
        console.warn('[SERVICES] ⚠️ Agrégateur inaccessible:', error.message)
      }
    }

    // Priorité 2 : API Gateway (si disponible)
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/services`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        signal: AbortSignal.timeout(12000) // 12s au lieu de 8s
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.services) {
          console.log('[SERVICES] ✅ Services récupérés depuis l\'API Gateway:', data.services.length, 'services')
          return data.services
        }
      }
    } catch (error) {
      // Silence - API Gateway endpoint optionnel
    }

    // Fallback : Données par défaut
    console.log('[SERVICES] ℹ️ Utilisation des services par défaut')
    return defaultServices
  }

  // Récupération des logs d'un service spécifique
  async getServiceLogs(serviceName: string, options?: { lines?: number }): Promise<any | null> {
    try {
      const lines = options?.lines || 100;
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      
      const response = await fetch(`${metricsUrl}/api/v1/docker/service/${serviceName}/logs?lines=${lines}`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error(`Erreur récupération logs pour ${serviceName}:`, error)
    }

    return null
  }

  async getAggregatorLogs(containerName: string, options?: { limit?: number; start?: number; end?: number }): Promise<any | null> {
    const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
    const params = new URLSearchParams()

    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }
    if (options?.start) {
      params.append('start', options.start.toString())
    }
    if (options?.end) {
      params.append('end', options.end.toString())
    }

    const queryString = params.toString()

    try {
      const response = await fetch(`${metricsUrl}/api/v1/logs/container/${containerName}${queryString ? `?${queryString}` : ''}`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15s pour l'historique qui peut être volumineux
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error(`Erreur récupération logs agrégateur pour ${containerName}:`, error)
    }

    return null
  }

  // Redémarrage d'un service
  async restartService(serviceName: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/services/${serviceName}/restart`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error(`Erreur redémarrage service ${serviceName}:`, error)
    }

    return null
  }

  // Récupération de la liste des services depuis Docker (non accessible depuis les conteneurs)
  async getDockerServices(): Promise<{[key: string]: any} | null> {
    console.log('[DOCKER] API Docker non accessible depuis les conteneurs')
    return null
  }


  // Méthode principale pour récupérer les métriques avec cache et fallback intelligent
  async fetchMetrics(): Promise<MetricsData | null> {
    // Mettre à jour le token au cas où il aurait changé
    this.updateToken()

    // Si pas de token valide, retourner des données par défaut sans faire de requêtes
    if (!this.isValidToken()) {
      console.log('[CENTRAL METRICS] ⚠️ Pas de token valide, utilisation des données par défaut')
      return {
        services: {},
        system: {
          cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A' },
          memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
          load: { average: 'N/A', cores: 'N/A' },
          disk: []
        },
        containers: {},
        timestamp: new Date().toISOString()
      }
    }

    // Vérifier le cache d'abord
    const cachedMetrics = this.getCachedMetrics()
    if (cachedMetrics) {
      // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
      // console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis le cache')
      return cachedMetrics
    }

    // Éviter les requêtes simultanées identiques
    return this.getWithCache('fetchMetrics', async () => {
      try {
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[CENTRAL METRICS] 🔄 Récupération des métriques...')

        // Priorité 1 : Service agrégateur (source la plus fiable)
        try {
          const aggregatorMetrics = await this.getAggregatorMetrics()
          
          if (aggregatorMetrics) {
            // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
            // console.log('[CENTRAL METRICS] ✅ Métriques depuis l\'agrégateur', {
            //   servicesList_length: aggregatorMetrics.servicesList?.length || 0,
            //   services_keys: Object.keys(aggregatorMetrics.services || {}).length,
            //   containers_keys: Object.keys(aggregatorMetrics.containers || {}).length,
            //   cpu: aggregatorMetrics.system?.cpu?.usage,
            //   memory: aggregatorMetrics.system?.memory?.usage
            // })
            this.setCachedMetrics(aggregatorMetrics)
            return aggregatorMetrics
          }
        } catch (error: any) {
          // Seulement logger les vraies erreurs (pas timeout)
          if (error.name !== 'TimeoutError') {
            console.warn('[CENTRAL METRICS] ⚠️ Agrégateur erreur:', error.message)
          }
        }
        
        // Priorité 2 : API Gateway + métriques séparées
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[CENTRAL METRICS] ↩️ Fallback vers API Gateway')
        
        const allServices = await this.getAllServices().catch(() => null)

        if (allServices && allServices.length > 0) {
          // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
          // console.log('[CENTRAL METRICS] ✅ Services API Gateway:', allServices.length)

          // Récupérer les métriques système avec timeout
          const systemMetrics = await Promise.race([
            this.getSystemMetrics(),
            new Promise<SystemMetrics | null>(resolve =>
              setTimeout(() => resolve(null), 2000)
            )
          ])

          // Calculer les moyennes CPU/mémoire depuis les conteneurs
          let totalCpu = 0
          let totalMemoryUsed = 0
          let totalMemoryLimit = 0
          let validContainersCount = 0

          allServices.forEach((service: any) => {
            if (service.metrics?.cpu?.percent !== undefined) {
              totalCpu += service.metrics.cpu.percent
              validContainersCount++
            }
            if (service.metrics?.memory) {
              totalMemoryUsed += service.metrics.memory.usage || 0
              totalMemoryLimit += service.metrics.memory.limit || 0
            }
          })

          const avgCpu = validContainersCount > 0 ? totalCpu / validContainersCount : 0
          const memoryPercent = totalMemoryLimit > 0 ? (totalMemoryUsed / totalMemoryLimit) * 100 : 0

          // Convertir les services en format compatible
          const servicesMap: {[key: string]: any} = {}
          allServices.forEach((service: any) => {
            servicesMap[service.serviceType] = {
              name: service.name,
              url: service.url,
              port: service.port,
              status: service.status,
              serviceType: service.serviceType,
              containerName: service.containerName,
              lastCheck: new Date().toISOString()
            }
          })

          // Enrichir systemMetrics avec les données calculées
          const enrichedSystemMetrics = systemMetrics ? {
            ...systemMetrics,
            cpu: {
              ...systemMetrics.cpu,
              usage: avgCpu > 0 ? avgCpu.toFixed(2) : systemMetrics.cpu.usage
            },
            memory: {
              total: totalMemoryLimit > 0 ? totalMemoryLimit : systemMetrics.memory.total,
              used: totalMemoryUsed > 0 ? totalMemoryUsed : systemMetrics.memory.used,
              free: totalMemoryLimit > 0 && totalMemoryUsed > 0 ? totalMemoryLimit - totalMemoryUsed : systemMetrics.memory.free,
              usage: memoryPercent > 0 ? memoryPercent.toFixed(2) : systemMetrics.memory.usage
            }
          } : {
            cpu: { usage: avgCpu > 0 ? avgCpu.toFixed(2) : 0, cores: 'N/A', model: 'N/A' },
            memory: { 
              total: totalMemoryLimit > 0 ? totalMemoryLimit : 'N/A', 
              used: totalMemoryUsed > 0 ? totalMemoryUsed : 'N/A', 
              free: totalMemoryLimit > 0 ? totalMemoryLimit - totalMemoryUsed : 'N/A', 
              usage: memoryPercent > 0 ? memoryPercent.toFixed(2) : 0
            },
            load: { average: 'N/A', cores: 'N/A' },
            disk: []
          }
          
          console.log('[CENTRAL METRICS] 📊 Métriques calculées:', {
            avgCpu: avgCpu.toFixed(2) + '%',
            memoryUsed: (totalMemoryUsed / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            memoryTotal: (totalMemoryLimit / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            memoryPercent: memoryPercent.toFixed(2) + '%',
            containersCount: validContainersCount
          })

          const metrics = {
            services: servicesMap,
            system: enrichedSystemMetrics,
            containers: {},
            timestamp: new Date().toISOString()
          }

          this.setCachedMetrics(metrics)
          return metrics
        }

        // Fallback vers Docker/cAdvisor seulement si nécessaire
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[CENTRAL METRICS] ⚠️ API Gateway non disponible, tentative Docker')

        const dockerServices = await Promise.race([
          this.getDockerServices(),
          new Promise<{[key: string]: any} | null>(resolve =>
            setTimeout(() => resolve(null), 2000)
          )
        ])

        if (dockerServices) {
          // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
          // console.log('[CENTRAL METRICS] ✅ Services récupérés depuis Docker')

          const systemMetrics = await Promise.race([
            this.getSystemMetrics(),
            new Promise<SystemMetrics | null>(resolve =>
              setTimeout(() => resolve(null), 1000)
            )
          ])

          const metrics = {
            services: dockerServices,
            system: systemMetrics || {
              cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A' },
              memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
              load: { average: 'N/A', cores: 'N/A' },
              disk: []
            },
            containers: {},
            timestamp: new Date().toISOString()
          }

          this.setCachedMetrics(metrics)
          return metrics
        }

        // Dernier fallback vers les métriques individuelles
        // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
        // console.log('[CENTRAL METRICS] ⚠️ Docker non disponible, fallback vers sources individuelles')
        const metrics = await Promise.race([
          this.getAllMetrics(),
          new Promise<MetricsData | null>(resolve =>
            setTimeout(() => resolve(null), 2000)
          )
        ])

        if (metrics) {
          // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
          // console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis les sources individuelles')
          this.setCachedMetrics(metrics)
          return metrics
        }

        console.log('[CENTRAL METRICS] ❌ Aucun service de métriques disponible')
        return null

      } catch (error) {
        console.error('[CENTRAL METRICS] ❌ Erreur lors de la récupération des métriques:', error)
        this.clearCache()
        return null
      }
    })
  }

  /**
   * Formate les métriques depuis monitoring-c vers le format attendu par le frontend
   */
  private formatMetricsFromMonitoringC(data: any): MetricsData {
    // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement
    // pour que le frontend puisse les utiliser
    const timestamp = data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString()
    
    // Convertir les conteneurs en services
    const containers = Array.isArray(data.containers) ? data.containers : []
    const servicesList: ServiceMetrics[] = containers.map((container: any) => {
      const rawName = container.name || 'unknown-service'
      const serviceType = rawName.replace(/^jobbingtrack-/, '')
      const baseServiceType = serviceType.replace(/-prod$/, '').replace(/-preview$/, '').replace(/-staging$/, '')
      const displayName = formatServiceName(rawName)
      const networkRxMb = container.network_rx_bytes ? (container.network_rx_bytes / (1024 * 1024)) : 0
      const networkTxMb = container.network_tx_bytes ? (container.network_tx_bytes / (1024 * 1024)) : 0
      const responseTimeMs = typeof container.response_time_ms === 'number' && container.response_time_ms > 0 
        ? parseFloat(container.response_time_ms.toFixed(2)) 
        : null
      const httpStatus = typeof container.http_status === 'number' ? container.http_status : 0
      const cpuPercent = typeof container.cpu_percent === 'number' ? parseFloat(container.cpu_percent.toFixed(2)) : 0
      const memoryMb = typeof container.memory_mb === 'number' ? parseFloat(container.memory_mb.toFixed(2)) : 0
      const memoryLimitMb = typeof container.memory_limit_mb === 'number' ? parseFloat(container.memory_limit_mb.toFixed(2)) : 0
      const memoryPercent = typeof container.memory_percent === 'number' ? parseFloat(container.memory_percent.toFixed(2)) : 0

      let status: ServiceMetrics['status'] = 'unknown'
      let healthStatus: ServiceMetrics['healthStatus'] = 'unknown'
      let healthError: string | undefined = undefined

      if (httpStatus === 200) {
        status = 'running'
        healthStatus = 'online'
      } else if (httpStatus && httpStatus >= 400) {
        status = 'degraded'
        healthStatus = 'degraded'
        healthError = `HTTP Error ${httpStatus}`
      } else if (httpStatus === 0 && responseTimeMs === null) {
        status = 'offline'
        healthStatus = 'offline'
        healthError = 'Service unreachable'
      } else {
        status = 'starting'
        healthStatus = 'starting'
      }

      return {
        id: rawName, rawName, displayName, serviceType: baseServiceType, name: displayName,
        url: getServiceUrl(baseServiceType), port: getServicePort(baseServiceType),
        status, responseTime: responseTimeMs !== null ? `${responseTimeMs} ms` : 'N/A', responseTimeMs, version: 'N/A',
        healthStatus, healthError,
        health: { status: healthStatus, responseTime: responseTimeMs !== null ? `${responseTimeMs} ms` : 'N/A', error: healthError },
        lastCheck: timestamp, pids: null, errorRatePerMin: 0, errorCount5m: 0,
        metrics: {
          memory: { usage: memoryMb, limit: memoryLimitMb, percentage: memoryPercent, usageMb: memoryMb, limitMb: memoryLimitMb },
          cpu: { usage: cpuPercent, system: cpuPercent, percentage: cpuPercent, perCore: 0 },
          network: { rx_bytes: container.network_rx_bytes || 0, tx_bytes: container.network_tx_bytes || 0, rx_mb: networkRxMb, tx_mb: networkTxMb }
        },
        networkMb: { rx: networkRxMb, tx: networkTxMb }
      }
    })

    const servicesMap: { [key: string]: ServiceMetrics } = {}
    const containersMap: Record<string, ContainerMetricEntry> = {}
    servicesList.forEach(service => {
      const key = service.rawName || service.name
      servicesMap[key] = service
      containersMap[key] = {
        name: service.rawName || service.name,
        memory: { usage: 0, limit: 0, percentage: 0, usageMb: 0, limitMb: 0 },
        cpu: { usage: 0, system: 0, percentage: 0, perCore: 0 },
        network: { rx_bytes: service.metrics?.network?.rx_bytes ?? 0, tx_bytes: service.metrics?.network?.tx_bytes ?? 0, rx_mb: service.metrics?.network?.rx_mb, tx_mb: service.metrics?.network?.tx_mb },
        status: service.status, response_time_ms: null, error_count_5m: 0, error_rate_per_min: 0, pids: null
      }
    })

    // ✅ CORRECTION : Utiliser network.total_rx_mb et total_tx_mb depuis monitoring C en priorité
    const totalNetworkRxMb = data.network?.total_rx_mb !== undefined && data.network.total_rx_mb > 0
      ? data.network.total_rx_mb
      : servicesList.reduce((sum, service) => sum + (service.networkMb?.rx ?? 0), 0)
    const totalNetworkTxMb = data.network?.total_tx_mb !== undefined && data.network.total_tx_mb > 0
      ? data.network.total_tx_mb
      : servicesList.reduce((sum, service) => sum + (service.networkMb?.tx ?? 0), 0)

    // Utiliser les statistiques calculées par monitoring-c si disponibles
    const avgResponseTimeMs = typeof data.avg_response_time_ms === 'number' && data.avg_response_time_ms > 0
      ? parseFloat(data.avg_response_time_ms.toFixed(2))
      : (servicesList.length > 0 && servicesList.some(s => s.responseTimeMs) 
        ? servicesList.filter(s => s.responseTimeMs).reduce((sum, s) => sum + (s.responseTimeMs || 0), 0) / servicesList.filter(s => s.responseTimeMs).length
        : null)

    // ✅ CORRECTION : Calculer la disponibilité correctement
    // Un service est disponible s'il est running ET a un http_status valide (200 ou >= 400 mais running)
    // Un service est indisponible s'il est stopped, offline, ou http_status === 0 sans métriques
    const availabilityPercent = typeof data.availability_percent === 'number' && !Number.isNaN(data.availability_percent)
      ? parseFloat(data.availability_percent.toFixed(2))
      : (servicesList.length > 0 
        ? (servicesList.filter(s => {
            // Service disponible si :
            // 1. Status est running/healthy/online
            // 2. OU http_status === 200
            // 3. OU http_status >= 400 mais status est running (dégradé mais disponible)
            if (s.status === 'running' || s.status === 'healthy' || s.status === 'online' || 
                s.healthStatus === 'online' || s.healthStatus === 'healthy') {
              return true
            }
            if (s.http_status === 200) {
              return true
            }
            if (s.status === 'running' && s.http_status >= 400) {
              return true // Dégradé mais disponible
            }
            // Si http_status === 0 mais on a des métriques CPU/mémoire, le service est disponible
            if (s.http_status === 0 && (s.cpu_percent > 0 || s.memory_mb > 0)) {
              return true
            }
            return false
          }).length / servicesList.length) * 100
        : 100)

    const loadScore = typeof data.load_score === 'number' && !Number.isNaN(data.load_score)
      ? parseFloat(data.load_score.toFixed(2))
      : undefined

    const numericResponseTimes = servicesList
      .filter(s => typeof s.responseTimeMs === 'number' && s.responseTimeMs > 0)
      .map(s => s.responseTimeMs as number)

    // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement
    const avgCpuPercent = typeof data.avg_cpu_percent === 'number' ? data.avg_cpu_percent : null
    const avgMemoryPercent = typeof data.avg_memory_percent === 'number' ? data.avg_memory_percent : null
    
    return {
      services: servicesMap, 
      system: {
        cpu: { 
          usage: data.cpu?.usage_percent ? `${data.cpu.usage_percent.toFixed(1)}%` : (avgCpuPercent !== null ? `${avgCpuPercent.toFixed(1)}%` : 'N/A'), 
          cores: data.cpu?.cores ? `${data.cpu.cores}` : 'N/A', 
          model: 'N/A',
          // ✅ CORRECTION : Exposer load_1, load_5, load_15 pour la charge
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15
        },
        memory: {
          total: data.memory?.total_mb ? `${(data.memory.total_mb / 1024).toFixed(2)} GB` : 'N/A',
          used: data.memory?.used_mb ? `${(data.memory.used_mb / 1024).toFixed(2)} GB` : 'N/A',
          free: data.memory?.free_mb ? `${(data.memory.free_mb / 1024).toFixed(2)} GB` : 'N/A',
          usage: data.memory?.usage_percent ? `${data.memory.usage_percent.toFixed(1)}%` : (avgMemoryPercent !== null ? `${avgMemoryPercent.toFixed(1)}%` : 'N/A'),
          // ✅ CORRECTION : Exposer used_mb et total_mb pour l'affichage
          used_mb: data.memory?.used_mb,
          total_mb: data.memory?.total_mb
        },
        load: { 
          average: data.cpu?.load_1 ? `${data.cpu.load_1.toFixed(2)}` : 'N/A', 
          cores: data.cpu?.cores ? `${data.cpu.cores}` : 'N/A',
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15
        },
        disk: data.disk ? [{ name: 'root', total: `${data.disk.total_gb.toFixed(2)} GB`, used: `${data.disk.used_gb.toFixed(2)} GB`, free: `${data.disk.free_gb.toFixed(2)} GB`, usage: `${data.disk.usage_percent.toFixed(1)}%` }] : []
      },
      // ✅ CORRECTION : Exposer monitoringC pour que le frontend puisse l'utiliser
      monitoringC: {
        avg_cpu_percent: avgCpuPercent,
        avg_memory_percent: avgMemoryPercent,
        avg_response_time_ms: data.avg_response_time_ms,
        container_count: data.container_count,
        load_score: data.load_score,
        availability_percent: data.availability_percent
      },
      containers: containersMap, 
      timestamp,
      // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement pour le frontend
      avg_cpu_percent: avgCpuPercent,
      avg_memory_percent: avgMemoryPercent,
      network: { 
        total_rx_mb: totalNetworkRxMb, 
        total_tx_mb: totalNetworkTxMb, 
        per_service: servicesList.map(s => ({ name: s.rawName || s.name, rx_mb: s.networkMb?.rx ?? 0, tx_mb: s.networkMb?.tx ?? 0 })) 
      },
      responseTime: {
        average_ms: avgResponseTimeMs,
        fastest_ms: numericResponseTimes.length > 0 ? Math.min(...numericResponseTimes) : null,
        slowest_ms: numericResponseTimes.length > 0 ? Math.max(...numericResponseTimes) : null,
        per_service: servicesList.map(s => ({ 
          name: s.rawName || s.name, 
          status: s.status, 
          response_time_ms: s.responseTimeMs
        }))
      },
      errors: { 
        total_last_5m: 0, 
        rate_per_min: 0, 
        per_service: servicesList.map(s => ({ name: s.rawName || s.name, count_last_5m: 0, rate_per_min: 0 })) 
      },
      health: { 
        availability_percent: availabilityPercent, 
        per_service: servicesList.map(s => ({ name: s.rawName || s.name, status: s.status, last_check: timestamp })) 
      },
      overallLoadScore: loadScore,
      servicesList: servicesList, // ✅ IMPORTANT : Inclure servicesList pour analytics
      services: servicesMap // ✅ Aussi inclure services pour compatibilité
    }
  }

  /**
   * Récupère l'historique des métriques
   */
  async getMetricsHistory(options?: { limit?: number; startTime?: number; endTime?: number }) {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const { limit = 100, startTime, endTime } = options || {}
      
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      if (startTime) params.append('startTime', startTime.toString())
      if (endTime) params.append('endTime', endTime.toString())
      
      const response = await fetch(`${metricsUrl}/api/v1/docker/history?${params}`, {
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.data || []
      }
      return []
    } catch (error) {
      console.error('[METRICS] Erreur récupération historique:', error)
      return []
    }
  }

  /**
   * Récupère les statistiques sur une période
   */
  async getMetricsStats(options?: { startTime?: number; endTime?: number }) {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'
      const { startTime, endTime } = options || {}
      
      const params = new URLSearchParams()
      if (startTime) params.append('startTime', startTime.toString())
      if (endTime) params.append('endTime', endTime.toString())
      
      const response = await fetch(`${metricsUrl}/api/v1/docker/stats?${params}`, {
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.stats || null
      }
      return null
    } catch (error) {
      console.error('[METRICS] Erreur récupération stats:', error)
      return null
    }
  }
}

export const centralMetricsService = new CentralMetricsService()
export type { SystemMetrics, ServiceMetrics, ContainerMetrics, MetricsData, UserCustomization }

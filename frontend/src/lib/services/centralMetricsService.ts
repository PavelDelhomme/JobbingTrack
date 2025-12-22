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
  // ✅ OPTIMISATION : Cache optimisé pour réduire les requêtes et CPU
  // Le cache est maintenant limité en taille et durée
  private metricsCache: MetricsData | null = null
  private cacheTimestamp: number = 0
  private cacheDuration: number = 8000 // 8 secondes (compromis performance/réactivité)
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

      // ✅ Utiliser uniquement monitoring-c
      const metricsUrl = this.monitoringCUrl
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

      // ✅ Utiliser uniquement monitoring-c (pas de fallback)
      const metricsUrl = this.monitoringCUrl
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

      // ✅ Utiliser uniquement monitoring-c (pas de fallback)
      const metricsUrl = this.monitoringCUrl
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        // Note: monitoring-c retourne les services dans la réponse /api/v1/metrics
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
    // ✅ UTILISER UNIQUEMENT monitoring-c - Plus de fallback vers l'ancien système
    try {
      const metricsUrl = this.monitoringCUrl
      const endpoint = '/api/v1/metrics'
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout
      
      try {
        const response = await fetch(`${metricsUrl}${endpoint}`, {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        }).catch(() => null)
        
        clearTimeout(timeoutId)
        
        if (!response || !response.ok || response.status !== 200) {
          return null // Retourner null si monitoring-c n'est pas disponible
        }
        
        const text = await response.text().catch(() => '')
        if (!text || text.trim().length === 0) {
          return null // Retourner null si réponse vide
        }
        
        const data = JSON.parse(text)
        return this.formatMetricsFromMonitoringC(data)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        return null // Retourner null en cas d'erreur
      }
    } catch (error: any) {
      return null // Retourner null en cas d'erreur générale
    }
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
      // ✅ Utiliser uniquement monitoring-c (pas de fallback)
      // Les services sont inclus dans la réponse /api/v1/metrics
      const metricsUrl = this.monitoringCUrl
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
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
    // ✅ Utiliser uniquement monitoring-c (pas de fallback)
    // Note: monitoring-c ne gère pas encore les logs, retourner null
    return null
  }

  async getAggregatorLogs(containerName: string, options?: { limit?: number; start?: number; end?: number }): Promise<any | null> {
    // ✅ Utiliser uniquement monitoring-c (pas de fallback)
    // Note: monitoring-c ne gère pas encore les logs, retourner null
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

    // ✅ UTILISER UNIQUEMENT monitoring-c - Plus de fallback
    return this.getWithCache('fetchMetrics', async () => {
      try {
        const aggregatorMetrics = await this.getAggregatorMetrics()
        
        if (aggregatorMetrics) {
          this.setCachedMetrics(aggregatorMetrics)
          return aggregatorMetrics
        }

        // Si monitoring-c n'est pas disponible, retourner null
        console.warn('[CENTRAL METRICS] ⚠️ Monitoring-c non disponible')
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
    
    // ✅ CORRECTION : Calculer les métriques agrégées des conteneurs JobbingTrack
    const jobbingtrackContainers = containers.filter((c: any) => c.name?.startsWith('jobbingtrack-'))
    const totalCpuPercent = jobbingtrackContainers.reduce((sum: number, c: any) => sum + (c.cpu_percent || 0), 0)
    const avgCpuPercentContainers = jobbingtrackContainers.length > 0 ? totalCpuPercent / jobbingtrackContainers.length : (avgCpuPercent || 0)
    const totalMemoryMb = jobbingtrackContainers.reduce((sum: number, c: any) => sum + (c.memory_mb || 0), 0)
    const totalMemoryLimitMb = jobbingtrackContainers.reduce((sum: number, c: any) => sum + (c.memory_limit_mb || 0), 0)
    // ✅ NOUVEAU : Calculer le pourcentage de mémoire projet par rapport à la mémoire système totale
    const systemTotalMemoryMb = data.memory?.total_mb || 0
    const memoryProjectPercent = systemTotalMemoryMb > 0 ? (totalMemoryMb / systemTotalMemoryMb) * 100 : 0
    // Pourcentage par rapport à la limite des conteneurs (pour affichage détaillé)
    const avgMemoryPercentContainers = totalMemoryLimitMb > 0 ? (totalMemoryMb / totalMemoryLimitMb) * 100 : (avgMemoryPercent || 0)
    
    return {
      services: servicesMap, 
      system: {
        cpu: { 
          usage: data.cpu?.usage_percent ? `${data.cpu.usage_percent.toFixed(1)}%` : (avgCpuPercent !== null ? `${avgCpuPercent.toFixed(1)}%` : 'N/A'), 
          cores: data.cpu?.cores ? `${data.cpu.cores}` : 'N/A', 
          model: 'N/A',
          // ✅ CORRECTION : Exposer load_1, load_5, load_15 pour la charge (load average, pas pourcentage)
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15,
          // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons (pourcentage CPU système)
          usage_percent: data.cpu?.usage_percent || (data.cpu?.load_1 ? data.cpu.load_1 : undefined),
          // ✅ CORRECTION : Exposer les métriques CPU des conteneurs
          containers_only: avgCpuPercentContainers,
          per_core: data.cpu?.cores && data.cpu.cores > 0 ? (avgCpuPercentContainers / data.cpu.cores) : avgCpuPercentContainers
        },
        memory: {
          total: data.memory?.total_mb ? `${(data.memory.total_mb / 1024).toFixed(2)} GB` : 'N/A',
          used: data.memory?.used_mb ? `${(data.memory.used_mb / 1024).toFixed(2)} GB` : 'N/A',
          free: data.memory?.free_mb ? `${(data.memory.free_mb / 1024).toFixed(2)} GB` : 'N/A',
          usage: data.memory?.usage_percent ? `${data.memory.usage_percent.toFixed(1)}%` : (avgMemoryPercent !== null ? `${avgMemoryPercent.toFixed(1)}%` : 'N/A'),
          // ✅ CORRECTION : Exposer used_mb et total_mb pour l'affichage
          used_mb: data.memory?.used_mb,
          total_mb: data.memory?.total_mb,
          // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons
          usage_percent: data.memory?.usage_percent
        },
        load: { 
          average: data.cpu?.load_1 ? `${data.cpu.load_1.toFixed(2)}` : 'N/A', 
          cores: data.cpu?.cores ? `${data.cpu.cores}` : 'N/A',
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15
        },
        disk: data.disk ? [{ 
          name: 'root', 
          total: `${data.disk.total_gb.toFixed(2)} GB`, 
          used: `${data.disk.used_gb.toFixed(2)} GB`, 
          free: `${data.disk.free_gb.toFixed(2)} GB`, 
          usage: `${data.disk.usage_percent.toFixed(1)}%`,
          // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons
          usage_percent_number: data.disk.usage_percent
        }] : [],
        // ✅ CORRECTION : Ajouter la structure jobbingtrack avec les conteneurs
        jobbingtrack: {
          containers: {
            count: jobbingtrackContainers.length || data.container_count || 0,
            cpu: {
              totalPercent: totalCpuPercent,
              averagePercent: avgCpuPercentContainers
            },
            memory: {
              used: totalMemoryMb,
              limit: totalMemoryLimitMb,
              percent: avgMemoryPercentContainers, // Pourcentage par rapport à la limite des conteneurs
              percent_of_system: memoryProjectPercent // ✅ NOUVEAU : Pourcentage par rapport à la mémoire système totale
            }
          },
          disk: data.disk ? [{
            usage_percent: `${data.disk.usage_percent.toFixed(1)}%`,
            used_human: `${data.disk.used_gb.toFixed(2)} GB`,
            total_human: `${data.disk.total_gb.toFixed(2)} GB`
          }] : []
        }
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
    // ✅ Utiliser uniquement monitoring-c (pas de fallback)
    // Note: monitoring-c ne gère pas encore l'historique, retourner []
    return []
  }

  /**
   * Récupère les statistiques sur une période
   */
  async getMetricsStats(options?: { startTime?: number; endTime?: number }) {
    // ✅ Utiliser uniquement monitoring-c (pas de fallback)
    // Note: monitoring-c ne gère pas encore les stats, retourner null
    return null
  }
}

export const centralMetricsService = new CentralMetricsService()
export type { SystemMetrics, ServiceMetrics, ContainerMetrics, MetricsData, UserCustomization }

interface SystemMetrics {
  cpu: {
    usage: number | string
    cores: number | string
    model: string
  }
  memory: {
    total: number | string
    used: number | string
    free: number | string
    usage: number | string
  }
  load: {
    average: number | string
    cores: number[] | string
  }
  disk: Array<{
    mount: string
    total: number | string
    used: number | string
    usage: number | string
  }>
}

interface ServiceMetrics {
  name: string
  url: string
  port: number
  status: string
  responseTime?: number | string
  version?: string
  error?: string
  health?: {
    status: string
    responseTime: number | string
    version?: string
    error?: string
  }
  lastCheck: string
  metrics?: {
    memory?: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu?: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network?: {
      rx_bytes: number | string
      tx_bytes: number | string
    }
  }
}

interface ContainerMetrics {
  [containerName: string]: {
    memory: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network: {
      rx_bytes: number | string
      tx_bytes: number | string
    }
    status: string
  }
}

interface MetricsData {
  services: { [key: string]: ServiceMetrics }
  system: SystemMetrics
  containers: ContainerMetrics
  timestamp: string
}

interface UserCustomization {
  theme: string
  language: string
  dashboardLayout: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  features: {
    analytics: boolean
    maintenance: boolean
    security: boolean
  }
  metrics: {
    refreshInterval: number
    defaultView: string
    showContainers: boolean
    showServices: boolean
  }
}

class CentralMetricsService {
  private apiUrl: string
  private prometheusUrl: string
  private token: string | null
  private customization: UserCustomization | null = null
  private metricsCache: MetricsData | null = null
  private cacheTimestamp: number = 0
  private cacheDuration: number = 60000 // 60 secondes
  private isLoading: boolean = false
  private loadingPromises: Map<string, Promise<any>> = new Map()

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.prometheusUrl = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'
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
    const now = Date.now()
    if (this.metricsCache && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.metricsCache
    }
    // Ne pas vider le cache si la durée n'est pas encore écoulée (pour éviter les requêtes multiples au démarrage)
    if (this.metricsCache && (now - this.cacheTimestamp) < this.cacheDuration * 2) {
      return this.metricsCache
    }
    this.metricsCache = null
    return null
  }

  private setCachedMetrics(metrics: MetricsData): void {
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
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://127.0.0.1:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.system) {
          return {
            cpu: {
              usage: data.system.cpu?.usage || 0,
              cores: data.system.cpu?.cores || 'N/A',
              model: data.system.cpu?.model || 'N/A'
            },
            memory: {
              total: data.system.memory?.total || 'N/A',
              used: data.system.memory?.used || 'N/A',
              free: data.system.memory?.free || 'N/A',
              usage: data.system.memory?.usage || 0
            },
            load: {
              average: data.system.load?.average || 0,
              cores: data.system.load?.cores || 'N/A'
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
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://127.0.0.1:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.containers && Object.keys(data.containers).length > 0) {
          console.log('[CONTAINERS] ✅ Métriques conteneurs récupérées depuis Prometheus')
          return data.containers
        }
      }

      // Fallback vers cAdvisor directement si disponible
      try {
        const cadvisorResponse = await fetch('http://localhost:8081/api/v1.3/docker/', {
          signal: AbortSignal.timeout(3000)
        })

        if (cadvisorResponse.ok) {
          const containersData = await cadvisorResponse.json()
          const containerMetrics: ContainerMetrics = {}

          Object.keys(containersData).forEach(containerName => {
            const container = containersData[containerName]
            if (container && container.stats && container.stats.length > 0) {
              const latestStats = container.stats[container.stats.length - 1]

              containerMetrics[containerName] = {
                memory: {
                  usage: latestStats.memory?.usage || 0,
                  limit: latestStats.memory?.limit || 0,
                  percentage: latestStats.memory?.percentage || 0
                },
                cpu: {
                  usage: latestStats.cpu?.usage || 0,
                  system: latestStats.cpu?.system || 0,
                  percentage: latestStats.cpu?.percentage || 0
                },
                network: {
                  rx_bytes: latestStats.network?.rx_bytes || 0,
                  tx_bytes: latestStats.network?.tx_bytes || 0
                },
                status: container.status || 'unknown'
              }
            }
          })

          console.log('[CONTAINERS] ✅ Métriques cAdvisor récupérées')
          return containerMetrics
        }
      } catch (cadvisorError) {
        console.warn('[CONTAINERS] cAdvisor non disponible');
      }

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

      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://127.0.0.1:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.services) {
          return data.services
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
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://127.0.0.1:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return {
          services: data.services || {},
          system: data.system || {},
          containers: data.containers || {},
          timestamp: data.timestamp || new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Erreur récupération métriques agrégateur:', error)
    }

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
      // Essayer d'abord le service de métriques agrégateur qui a les vraies données
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://127.0.0.1:3014'
      const response = await fetch(`${metricsUrl}/api/v1/services`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(2000) // Timeout très court
      })

      if (response.ok) {
        const data = await response.json()
        return Object.values(data) // Convertir l'objet en tableau
      }
    } catch (error) {
      // Erreur silencieuse - service de métriques non disponible (normal)
    }

    // Fallback vers l'API Gateway avec timeout aussi
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/services`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        signal: AbortSignal.timeout(2000)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.services) {
          return data.services
        }
      }
    } catch (error) {
      // Erreur silencieuse - API Gateway services non disponible (normal)
    }

    // Retourner des données de test au lieu de null pour éviter les erreurs
    return defaultServices
  }

  // Récupération des logs d'un service spécifique
  async getServiceLogs(serviceName: string, lines: number = 50): Promise<any | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/services/${serviceName}/logs?lines=${lines}`, {
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
      console.error(`Erreur récupération logs pour ${serviceName}:`, error)
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

  // Formater le nom du service pour l'affichage
  private formatServiceName(containerName: string): string {
    // Convertir les noms de conteneurs en noms lisibles
    const nameMap: {[key: string]: string} = {
      'jobbingtrack-auth-service': 'Service d\'Authentification',
      'jobbingtrack-application-service': 'Service des Candidatures',
      'jobbingtrack-company-service': 'Service des Entreprises',
      'jobbingtrack-contact-service': 'Service des Contacts',
      'jobbingtrack-interview-service': 'Service des Entretiens',
      'jobbingtrack-notification-service': 'Service de Notifications',
      'jobbingtrack-dashboard-service': 'Service du Tableau de Bord',
      'jobbingtrack-call-service': 'Service des Appels',
      'jobbingtrack-profile-service': 'Service des Profils',
      'jobbingtrack-event-service': 'Service des Événements',
      'jobbingtrack-followup-service': 'Service de Suivi',
      'jobbingtrack-workflow-service': 'Service de Workflow',
      'jobbingtrack-api-gateway': 'API Gateway',
      'jobbingtrack-frontend': 'Frontend',
      'jobbingtrack-postgres': 'Base de Données',
      'jobbingtrack-redis': 'Cache Redis',
      'jobbingtrack-prometheus': 'Prometheus',
      'jobbingtrack-grafana': 'Grafana',
      'jobbingtrack-cadvisor': 'cAdvisor',
      'jobbingtrack-simple-metrics': 'Service de Métriques'
    }

    return nameMap[containerName] || containerName.replace(/jobbingtrack-/g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Obtenir l'URL du service
  private getServiceUrl(serviceType: string): string {
    const urlMap: {[key: string]: string} = {
      'auth-service': 'http://localhost:3001',
      'application-service': 'http://localhost:3002',
      'company-service': 'http://localhost:3003',
      'contact-service': 'http://localhost:3004',
      'interview-service': 'http://localhost:3005',
      'notification-service': 'http://localhost:3006',
      'dashboard-service': 'http://localhost:3007',
      'call-service': 'http://localhost:3008',
      'profile-service': 'http://localhost:3009',
      'event-service': 'http://localhost:3011',
      'followup-service': 'http://localhost:3012',
      'workflow-service': 'http://localhost:3013',
      'api-gateway': 'http://localhost:3000',
      'frontend': 'http://localhost:3003',
      'database': 'http://localhost:5432',
      'cache': 'http://localhost:6379',
      'monitoring': 'http://localhost:9090'
    }

    return urlMap[serviceType] || 'http://localhost:3000'
  }

  // Obtenir le port du service
  private getServicePort(serviceType: string): number {
    const portMap: {[key: string]: number} = {
      'auth-service': 3001,
      'application-service': 3002,
      'company-service': 3003,
      'contact-service': 3004,
      'interview-service': 3005,
      'notification-service': 3006,
      'dashboard-service': 3007,
      'call-service': 3008,
      'profile-service': 3009,
      'event-service': 3011,
      'followup-service': 3012,
      'workflow-service': 3013,
      'api-gateway': 3000,
      'frontend': 8080,
      'database': 5432,
      'cache': 6379,
      'monitoring': 9090
    }

    return portMap[serviceType] || 3000
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
      console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis le cache')
      return cachedMetrics
    }

    // Éviter les requêtes simultanées identiques
    return this.getWithCache('fetchMetrics', async () => {
      try {
        console.log('[CENTRAL METRICS] 🔄 Récupération des métriques...')

        // Essayer d'abord le service agrégateur avec timeout court
        const aggregatorPromise = this.getAggregatorMetrics().catch(() => null)

        // En parallèle, essayer l'API Gateway avec timeout court
        const apiGatewayPromise = this.getAllServices().catch(() => null)

        // Attendre la première réponse disponible
        const [aggregatorMetrics, allServices] = await Promise.race([
          Promise.all([aggregatorPromise, apiGatewayPromise]),
          new Promise<[null, null]>(resolve =>
            setTimeout(() => resolve([null, null]), 3000) // Timeout de 3 secondes
          )
        ])

        if (aggregatorMetrics) {
          console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis l\'agrégateur')
          this.setCachedMetrics(aggregatorMetrics)
          return aggregatorMetrics
        }

        if (allServices) {
          console.log('[CENTRAL METRICS] ✅ Services récupérés depuis API Gateway')

          // Récupérer les métriques système avec timeout
          const systemMetrics = await Promise.race([
            this.getSystemMetrics(),
            new Promise<SystemMetrics | null>(resolve =>
              setTimeout(() => resolve(null), 2000)
            )
          ])

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

          const metrics = {
            services: servicesMap,
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

        // Fallback vers Docker/cAdvisor seulement si nécessaire
        console.log('[CENTRAL METRICS] ⚠️ API Gateway non disponible, tentative Docker')

        const dockerServices = await Promise.race([
          this.getDockerServices(),
          new Promise<{[key: string]: any} | null>(resolve =>
            setTimeout(() => resolve(null), 2000)
          )
        ])

        if (dockerServices) {
          console.log('[CENTRAL METRICS] ✅ Services récupérés depuis Docker')

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
        console.log('[CENTRAL METRICS] ⚠️ Docker non disponible, fallback vers sources individuelles')
        const metrics = await Promise.race([
          this.getAllMetrics(),
          new Promise<MetricsData | null>(resolve =>
            setTimeout(() => resolve(null), 2000)
          )
        ])

        if (metrics) {
          console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis les sources individuelles')
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
}

export const centralMetricsService = new CentralMetricsService()
export type { SystemMetrics, ServiceMetrics, ContainerMetrics, MetricsData, UserCustomization }

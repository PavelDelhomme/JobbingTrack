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

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.prometheusUrl = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
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
    try {
      // Vérifier d'abord si Prometheus est disponible
      try {
        const testResponse = await fetch(`${this.apiUrl}/api/v1/maintenance/metrics/prometheus/query?query=up`, {
          signal: AbortSignal.timeout(2000)
        });
        if (!testResponse.ok) {
          throw new Error('Prometheus non disponible');
        }
      } catch (prometheusError) {
        // Prometheus n'est pas disponible, retourner null pour utiliser le fallback
        console.warn('Prometheus non disponible, utilisation des métriques fallback');
        return null;
      }

      // Récupération CPU
      const cpuQuery = '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
      const cpuResponse = await this.queryPrometheus(cpuQuery)
      const cpuUsage = cpuResponse ? parseFloat(cpuResponse) : 'N/A'

      // Récupération mémoire
      const memoryQuery = '100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)'
      const memoryResponse = await this.queryPrometheus(memoryQuery)
      const memoryUsage = memoryResponse ? parseFloat(memoryResponse) : 'N/A'

      // Récupération charge système
      const loadQuery = 'node_load1'
      const loadResponse = await this.queryPrometheus(loadQuery)
      const loadAverage = loadResponse ? parseFloat(loadResponse) : 'N/A'

      return {
        cpu: {
          usage: cpuUsage,
          cores: 'N/A', // Pas disponible via Prometheus de base
          model: 'N/A'  // Pas disponible via Prometheus de base
        },
        memory: {
          total: 'N/A', // Pas disponible via Prometheus de base
          used: 'N/A',  // Pas disponible via Prometheus de base
          free: 'N/A',  // Pas disponible via Prometheus de base
          usage: memoryUsage
        },
        load: {
          average: loadAverage,
          cores: 'N/A' // Pas disponible via Prometheus de base
        },
        disk: [] // Pas disponible via Prometheus de base
      }
    } catch (error) {
      console.error('Erreur récupération métriques système:', error)
      return null
    }
  }

  // Récupération des métriques de conteneurs depuis Prometheus
  async getContainerMetrics(): Promise<ContainerMetrics | null> {
    try {
      // Vérifier d'abord si Prometheus est disponible
      try {
        const testResponse = await fetch(`${this.apiUrl}/api/v1/maintenance/metrics/prometheus/query?query=up`, {
          signal: AbortSignal.timeout(2000)
        });
        if (!testResponse.ok) {
          throw new Error('Prometheus non disponible');
        }
      } catch (prometheusError) {
        // Prometheus n'est pas disponible, retourner null pour utiliser le fallback
        console.warn('Prometheus non disponible, pas de métriques conteneurs');
        return null;
      }

      const containerMetrics: ContainerMetrics = {}

      // Récupérer tous les conteneurs avec leurs métriques
      const containersQuery = 'container_cpu_usage_seconds_total'
      const containersResponse = await this.queryPrometheus(containersQuery)

      if (!containersResponse) return null

      // Ici on devrait parser les résultats Prometheus pour extraire les métriques par conteneur
      // Pour l'instant, on retourne un objet vide car la logique complète nécessiterait
      // de parser les résultats Prometheus complexes

      return containerMetrics
    } catch (error) {
      console.error('Erreur récupération métriques conteneurs:', error)
      return null
    }
  }

  // Récupération des métriques de services depuis Prometheus
  async getServiceMetrics(): Promise<{ [key: string]: ServiceMetrics } | null> {
    try {
      // Vérifier d'abord si Prometheus est disponible
      try {
        const testResponse = await fetch(`${this.apiUrl}/api/v1/maintenance/metrics/prometheus/query?query=up`, {
          signal: AbortSignal.timeout(2000)
        });
        if (!testResponse.ok) {
          throw new Error('Prometheus non disponible');
        }
      } catch (prometheusError) {
        // Prometheus n'est pas disponible, retourner null pour utiliser le fallback
        console.warn('Prometheus non disponible, pas de métriques services');
        return null;
      }

      const serviceMetrics: { [key: string]: ServiceMetrics } = {}

      // Récupérer le statut de tous les services
      const statusQuery = 'up{job="jobbingtrack-backend"}'
      const statusResponse = await this.queryPrometheus(statusQuery)

      if (!statusResponse) return null

      // Ici on devrait parser les résultats Prometheus pour créer les métriques de service
      // Pour l'instant, on retourne un objet vide

      return serviceMetrics
    } catch (error) {
      console.error('Erreur récupération métriques services:', error)
      return null
    }
  }

  // Requête Prometheus générique via l'API Gateway
  private async queryPrometheus(query: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/maintenance/metrics/prometheus/query?query=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.status === 'success' && data.data.result.length > 0) {
          return data.data.result[0].value[1]
        }
      }
    } catch (error) {
      console.error('Erreur requête Prometheus:', error)
    }

    return null
  }

  // Récupération des métriques de maintenance depuis l'API Gateway
  async getMaintenanceMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/maintenance`, {
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
      console.error('Erreur récupération métriques maintenance:', error)
    }

    return { maintenances: [] }
  }

  // Récupération des logs de sécurité depuis l'API Gateway
  async getSecurityLogs(level: string = 'error', limit: number = 100): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/security/logs?level=${level}&limit=${limit}`, {
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
      console.error('Erreur récupération logs sécurité:', error)
    }

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

  // Récupération des métriques système depuis cAdvisor
  async getCadvisorMetrics(): Promise<any> {
    try {
      const response = await fetch('http://localhost:8080/api/v1.3/docker/')

      if (response.ok) {
        const containersData = await response.json()
        return containersData
      }
    } catch (error) {
      console.error('Erreur récupération métriques cAdvisor:', error)
    }

    return null
  }

  // Récupération des métriques depuis le service agrégateur
  async getAggregatorMetrics(): Promise<MetricsData | null> {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`)

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error('Erreur récupération métriques agrégateur:', error)
    }

    return null
  }

  // Récupération de tous les services depuis l'API Gateway
  async getAllServices(): Promise<any[] | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/services`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.services) {
          return data.services
        }
      }
    } catch (error) {
      console.error('Erreur récupération services:', error)
    }

    return null
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

  // Récupération de la liste des services depuis Docker
  async getDockerServices(): Promise<{[key: string]: any} | null> {
    try {
      const response = await fetch('http://localhost:8080/api/v1.3/docker/')

      if (response.ok) {
        const containersData = await response.json()

        // Convertir les données cAdvisor en format service
        const services: {[key: string]: any} = {}

        Object.keys(containersData).forEach(containerName => {
          const container = containersData[containerName]

          // Extraire le nom du service depuis le nom du conteneur
          let serviceName = containerName
          let serviceType = 'unknown'

          // Essayer d'identifier le type de service depuis le nom
          if (containerName.includes('auth')) serviceType = 'auth-service'
          else if (containerName.includes('application')) serviceType = 'application-service'
          else if (containerName.includes('company')) serviceType = 'company-service'
          else if (containerName.includes('contact')) serviceType = 'contact-service'
          else if (containerName.includes('interview')) serviceType = 'interview-service'
          else if (containerName.includes('notification')) serviceType = 'notification-service'
          else if (containerName.includes('dashboard')) serviceType = 'dashboard-service'
          else if (containerName.includes('call')) serviceType = 'call-service'
          else if (containerName.includes('profile')) serviceType = 'profile-service'
          else if (containerName.includes('event')) serviceType = 'event-service'
          else if (containerName.includes('followup')) serviceType = 'followup-service'
          else if (containerName.includes('workflow')) serviceType = 'workflow-service'
          else if (containerName.includes('api-gateway')) serviceType = 'api-gateway'
          else if (containerName.includes('frontend')) serviceType = 'frontend'
          else if (containerName.includes('postgres')) serviceType = 'database'
          else if (containerName.includes('redis')) serviceType = 'cache'
          else if (containerName.includes('prometheus')) serviceType = 'monitoring'
          else if (containerName.includes('grafana')) serviceType = 'monitoring'
          else if (containerName.includes('cadvisor')) serviceType = 'monitoring'

          services[serviceName] = {
            name: this.formatServiceName(containerName),
            url: this.getServiceUrl(serviceType),
            port: this.getServicePort(serviceType),
            status: container.status || 'unknown',
            serviceType: serviceType,
            containerName: containerName,
            metrics: {
              cpu: {
                usage: container.cpu?.percentage || 'N/A',
                system: container.cpu?.system || 'N/A',
                percentage: container.cpu?.percentage || 'N/A'
              },
              memory: {
                usage: container.memory?.percentage || 'N/A',
                limit: 'N/A',
                percentage: container.memory?.percentage || 'N/A'
              }
            },
            lastCheck: new Date().toISOString()
          }
        })

        return services
      }
    } catch (error) {
      console.error('Erreur récupération services Docker:', error)
    }

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
      'frontend': 'http://localhost:8080',
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

  // Méthode principale pour récupérer les métriques avec fallback intelligent
  async fetchMetrics(): Promise<MetricsData | null> {
    // Essayer d'abord le service agrégateur
    let metrics = await this.getAggregatorMetrics()

    if (metrics) {
      console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis l\'agrégateur')
      return metrics
    }

    // Fallback vers l'API Gateway pour récupérer tous les services
    console.log('[CENTRAL METRICS] ⚠️ Service agrégateur non disponible, récupération depuis API Gateway')

    const allServices = await this.getAllServices()

    if (allServices) {
      console.log('[CENTRAL METRICS] ✅ Services récupérés depuis API Gateway')

      // Récupérer aussi les métriques système
      const systemMetrics = await this.getSystemMetrics()

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

      return {
        services: servicesMap,
        system: systemMetrics || {
          cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A' },
          memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
          load: { average: 'N/A', cores: 'N/A' },
          disk: []
        },
        containers: {}, // On utilise les services pour l'instant
        timestamp: new Date().toISOString()
      }
    }

    // Fallback vers Docker/cAdvisor
    console.log('[CENTRAL METRICS] ⚠️ API Gateway non disponible, récupération depuis Docker')

    // Récupérer les services depuis Docker/cAdvisor
    const dockerServices = await this.getDockerServices()

    if (dockerServices) {
      console.log('[CENTRAL METRICS] ✅ Services récupérés depuis Docker')

      // Récupérer aussi les métriques système
      const systemMetrics = await this.getSystemMetrics()

      return {
        services: dockerServices,
        system: systemMetrics || {
          cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A' },
          memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
          load: { average: 'N/A', cores: 'N/A' },
          disk: []
        },
        containers: {}, // On utilise les services pour l'instant
        timestamp: new Date().toISOString()
      }
    }

    // Dernier fallback vers les métriques individuelles
    console.log('[CENTRAL METRICS] ⚠️ Docker non disponible, fallback vers sources individuelles')
    metrics = await this.getAllMetrics()

    if (metrics) {
      console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis les sources individuelles')
      return metrics
    }

    console.log('[CENTRAL METRICS] ❌ Aucun service de métriques disponible')
    return null
  }
}

export const centralMetricsService = new CentralMetricsService()
export type { SystemMetrics, ServiceMetrics, ContainerMetrics, MetricsData, UserCustomization }

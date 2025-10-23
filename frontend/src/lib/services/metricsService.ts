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

class MetricsService {
  private prometheusUrl: string
  private apiUrl: string
  private token: string | null

  constructor() {
    this.prometheusUrl = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  // Récupération des métriques système depuis Prometheus
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    try {
      // Vérifier d'abord si Prometheus est disponible
      try {
        const testResponse = await fetch(`${this.apiUrl}/api/v1/metrics/prometheus/query?query=up`, {
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
        const testResponse = await fetch(`${this.apiUrl}/api/v1/metrics/prometheus/query?query=up`, {
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
        const testResponse = await fetch(`${this.apiUrl}/api/v1/metrics/prometheus/query?query=up`, {
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

  // Requête Prometheus générique
  private async queryPrometheus(query: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/metrics/prometheus/query?query=${encodeURIComponent(query)}`, {
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

  // Récupération complète des métriques
  async getAllMetrics(): Promise<MetricsData | null> {
    try {
      const [systemMetrics, containerMetrics, serviceMetrics] = await Promise.all([
        this.getSystemMetrics(),
        this.getContainerMetrics(),
        this.getServiceMetrics()
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
}

export const metricsService = new MetricsService()
export type { SystemMetrics, ServiceMetrics, ContainerMetrics, MetricsData }

import axios from 'axios';

const METRICS_API_URL = process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL || process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004';
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export class AnalyticsService {
  /**
   * Récupérer les métriques système historiques
   */
  async getSystemMetricsHistory(options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/system/metrics?${params.toString()}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Erreur récupération historique système:', error);
      return [];
    }
  }

  /**
   * Récupérer les métriques d'un conteneur spécifique
   */
  async getContainerMetricsHistory(containerName: string, options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/containers/${containerName}/metrics?${params.toString()}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error(`Erreur récupération historique ${containerName}:`, error);
      return [];
    }
  }

  /**
   * Récupérer les logs d'un conteneur
   */
  async getContainerLogs(containerName: string, options: {
    limit?: number;
    offset?: number;
    stream?: 'stdout' | 'stderr';
    level?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.stream) params.append('stream', options.stream);
      if (options.level) params.append('level', options.level);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.search) params.append('search', options.search);

      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/containers/${containerName}/logs?${params.toString()}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error(`Erreur récupération logs ${containerName}:`, error);
      return [];
    }
  }

  /**
   * Récupérer les logs en temps réel depuis Docker
   */
  async getContainerLogsLive(containerName: string, options: {
    tail?: number;
    since?: number | string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (options.tail) params.append('tail', options.tail.toString());
      if (options.since) params.append('since', options.since.toString());

      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/containers/${containerName}/logs/live?${params.toString()}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error(`Erreur récupération logs live ${containerName}:`, error);
      return [];
    }
  }

  /**
   * Récupérer les statistiques de disponibilité d'un service
   */
  async getServiceAvailabilityStats(serviceName: string, hours: number = 24) {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/services/${serviceName}/availability?hours=${hours}`
      );

      return response.data.data || null;
    } catch (error) {
      console.error(`Erreur récupération disponibilité ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Récupérer les métriques de sécurité
   */
  async getSecurityMetrics(hours: number = 24) {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/security/metrics?hours=${hours}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Erreur récupération métriques sécurité:', error);
      return [];
    }
  }

  /**
   * Récupérer le résumé des métriques de sécurité
   */
  async getSecuritySummary(hours: number = 24) {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/v1/security/stats?days=${Math.ceil(hours / 24)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (response.data.success) {
        return response.data.data || null;
      }
      return null;
    } catch (error) {
      console.error('Erreur récupération résumé sécurité:', error);
      return null;
    }
  }

  /**
   * Inspecter un conteneur
   */
  async inspectContainer(containerName: string) {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/containers/${containerName}/inspect`
      );

      return response.data.data || null;
    } catch (error) {
      console.error(`Erreur inspection ${containerName}:`, error);
      return null;
    }
  }

  /**
   * Récupérer les stats en temps réel d'un conteneur
   */
  async getContainerStats(containerName: string) {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/containers/${containerName}/stats`
      );

      return response.data.data || null;
    } catch (error) {
      console.error(`Erreur stats ${containerName}:`, error);
      return null;
    }
  }

  /**
   * Récupérer la liste des conteneurs (depuis metrics-aggregator docker/services/all)
   */
  async getContainersList(): Promise<{ name: string; service_type?: string; health_status?: string; [key: string]: unknown }[]> {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/docker/services/all`,
        { timeout: 15000 }
      );
      if (response.data?.services && Array.isArray(response.data.services)) {
        return response.data.services.map((s: { name: string; health_status?: string }) => ({
          name: s.name,
          health_status: s.health_status,
          service_type: s.name?.replace(/^jobbingtrack-/, ''),
        }));
      }
      return [];
    } catch (error) {
      console.error('Erreur récupération liste conteneurs:', error);
      return [];
    }
  }

  /**
   * Récupérer les statistiques globales sur les données persistées
   */
  async getPersistenceStats() {
    try {
      const response = await axios.get(
        `${METRICS_API_URL}/api/v1/persistence/stats`
      );

      return response.data.data || null;
    } catch (error) {
      console.error('Erreur stats persistance:', error);
      return null;
    }
  }

  /**
   * Calculer le temps de réponse moyen depuis l'historique
   */
  async getAverageResponseTime(hours: number = 24) {
    try {
      // Récupérer l'historique système récent
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const history = await this.getSystemMetricsHistory({
        startDate,
        limit: 1000
      });

      if (history.length === 0) {
        return null;
      }

      // Pour le moment, on retourne les métriques système
      // TODO: Ajouter les temps de réponse réels dans la persistance
      return {
        avgCpu: history.reduce((acc: number, h: any) => acc + h.cpuUsagePercent, 0) / history.length,
        avgMemory: history.reduce((acc: number, h: any) => acc + h.memoryUsagePercent, 0) / history.length,
        dataPoints: history.length,
      };
    } catch (error) {
      console.error('Erreur calcul temps de réponse moyen:', error);
      return null;
    }
  }

  /**
   * Calculer le taux d'erreurs réseau
   */
  async getNetworkErrorRate(hours: number = 24) {
    try {
      // TODO: Implémenter avec les vraies données réseau
      // Pour le moment, retourner une estimation basée sur la disponibilité
      return {
        errorRate: 0,
        totalRequests: 0,
        failedRequests: 0,
      };
    } catch (error) {
      console.error('Erreur calcul taux erreurs réseau:', error);
      return null;
    }
  }
}

export const analyticsService = new AnalyticsService();


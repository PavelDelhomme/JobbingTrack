/**
 * Service pour récupérer les statistiques applicatives
 */

import { FRONTEND_URLS } from '@/config/ports.config';

const API_URL = FRONTEND_URLS.api;

export interface ApplicationStatistics {
  applications: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    this_month: number;
    this_week: number;
    today?: number;
    conversion_rate?: number;
  };
  users: {
    total: number;
    active: number;
    active_source?: string;
    by_role: Record<string, number>;
    new_this_month: number;
    new_this_week: number;
  };
  companies: {
    total: number;
    by_industry: Record<string, number>;
    by_size: Record<string, number>;
    this_month: number;
    this_week?: number;
  };
  contacts: {
    total: number;
    this_month: number;
    this_week: number;
  };
  interviews: {
    total: number;
    by_status?: Record<string, number>;
    scheduled: number;
    completed: number;
    this_week: number;
    upcoming?: number;
  };
  calls?: {
    total: number;
    this_week: number;
  };
  followups?: {
    total: number;
    pending: number;
  };
  events?: {
    total: number;
    this_month: number;
  };
  summary?: {
    total_users: number;
    total_applications: number;
    total_companies: number;
    total_contacts: number;
    total_interviews: number;
    active_users: number;
    new_this_week: number;
    new_this_month: number;
  };
}

export interface StatisticsTimelineEntry {
  timestamp: string;
  total_users: number;
  active_users: number;
  total_applications: number;
  total_companies: number;
  total_contacts: number;
  total_interviews: number;
  new_this_week: number;
  new_this_month: number;
  applications_by_status: Record<string, number>;
  users_by_role: Record<string, number>;
  companies_by_industry: Record<string, number>;
}

class StatisticsService {
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};
    
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Récupère les statistiques actuelles
   */
  async getCurrentStatistics(): Promise<ApplicationStatistics | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout

      const response = await fetch(`${API_URL}/api/v1/statistics`, {
        headers: this.getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si la réponse n'est pas OK, essayer de lire le message d'erreur
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Le backend retourne { success: true, statistics: {...} }
      if (data.statistics) {
        return data.statistics as ApplicationStatistics;
      }
      
      // Fallback pour les anciens formats
      if (data.data?.statistics) {
        return data.data.statistics as ApplicationStatistics;
      }
      
      if (data.data) {
        return data.data as ApplicationStatistics;
      }

      console.warn('[STATISTICS] Format de réponse inattendu:', data);
      return null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[STATISTICS] Timeout lors de la récupération des statistiques');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_RESET')) {
        console.error('[STATISTICS] Erreur de connexion:', error.message);
      } else {
        console.error('[STATISTICS] Erreur:', error);
      }
      return null;
    }
  }

  /**
   * Récupère l'historique des statistiques (timeline)
   */
  async getStatisticsTimeline(
    timeRange: string = '24h',
    limit: number = 1000
  ): Promise<StatisticsTimelineEntry[]> {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/statistics/timeline?time_range=${timeRange}&limit=${limit}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la timeline');
      }

      const data = await response.json();
      return data.timeline as StatisticsTimelineEntry[];
    } catch (error) {
      console.error('[STATISTICS] Erreur timeline:', error);
      return [];
    }
  }

  /**
   * Récupère un résumé rapide des statistiques
   */
  async getStatisticsSummary(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/v1/statistics/summary`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du résumé');
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('[STATISTICS] Erreur résumé:', error);
      return null;
    }
  }

  /**
   * Force la collecte des statistiques
   */
  async collectStatistics(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/v1/statistics/collect`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la collecte des statistiques');
      }

      return true;
    } catch (error) {
      console.error('[STATISTICS] Erreur collecte:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques des candidatures avec timeline
   */
  async getApplicationsTimeline(days: number = 30): Promise<any[]> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APPLICATION_SERVICE_URL || API_URL}/api/v1/statistics/applications/timeline?days=${days}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la timeline des candidatures');
      }

      const data = await response.json();
      return data.timeline || [];
    } catch (error) {
      console.error('[STATISTICS] Erreur timeline candidatures:', error);
      return [];
    }
  }
}

export const statisticsService = new StatisticsService();


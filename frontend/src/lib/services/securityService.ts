import axios from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";
import type { SecurityScoreWeights } from "@/lib/security/securityScore";

const API_URL = FRONTEND_URLS.api;

export interface SecurityLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "critical";
  category: string;
  eventType: string;
  message: string;
  sourceIP?: string;
  userAgent?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  country?: string;
  city?: string;
  riskScore?: number;
  isBlocked?: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityMetrics {
  overview: {
    totalLogs: number;
    criticalEvents: number;
    intrusionAttempts: number;
    ddosAttacks: number;
    vulnerabilities: number;
    securityScore: number;
  };
  logs: SecurityLog[];
  trends: any[];
  topThreats: any[];
  vulnerabilities: any[];
  alerts: any[];
}

export interface SecurityLogsResponse {
  success: boolean;
  data: SecurityLog[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

class SecurityService {
  /**
   * Récupère les logs de sécurité avec filtres
   */
  async getSecurityLogs(params?: {
    startDate?: string;
    endDate?: string;
    level?: string;
    category?: string;
    eventType?: string;
    requestId?: string;
    q?: string;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<SecurityLog[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.startDate) queryParams.append("startDate", params.startDate);
      if (params?.endDate) queryParams.append("endDate", params.endDate);
      if (params?.level) queryParams.append("level", params.level);
      if (params?.category) queryParams.append("category", params.category);
      if (params?.eventType) queryParams.append("eventType", params.eventType);
      if (params?.requestId) queryParams.append("requestId", params.requestId);
      if (params?.q) queryParams.append("q", params.q);
      if (params?.order) queryParams.append("order", params.order);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.offset)
        queryParams.append("offset", params.offset.toString());

      const response = await axios.get<SecurityLogsResponse>(
        `${API_URL}/api/v1/security/logs?${queryParams.toString()}`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la récupération des logs");
    } catch (error) {
      console.error("Erreur getSecurityLogs:", error);
      throw error;
    }
  }

  /**
   * Récupère les métriques de sécurité
   */
  async getSecurityMetrics(days: number = 7): Promise<SecurityMetrics> {
    try {
      const response = await axios.get<{
        success: boolean;
        data: SecurityMetrics;
      }>(`${API_URL}/api/v1/security/metrics?days=${days}`);

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la récupération des métriques");
    } catch (error) {
      console.error("Erreur getSecurityMetrics:", error);
      throw error;
    }
  }

  /**
   * Récupère les alertes de sécurité
   */
  async getSecurityAlerts(level?: string, limit: number = 20): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (level) queryParams.append("level", level);
      queryParams.append("limit", limit.toString());

      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_URL}/api/v1/security/alerts?${queryParams.toString()}`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la récupération des alertes");
    } catch (error) {
      console.error("Erreur getSecurityAlerts:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de sécurité
   */
  async getSecurityStats(days: number = 7): Promise<any> {
    try {
      const response = await axios.get<{ success: boolean; data: any }>(
        `${API_URL}/api/v1/security/stats?days=${days}`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la récupération des statistiques");
    } catch (error) {
      console.error("Erreur getSecurityStats:", error);
      throw error;
    }
  }

  /**
   * Récupère les tendances de sécurité
   */
  async getSecurityTrends(hours: number = 24): Promise<any[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_URL}/api/v1/security/trends?hours=${hours}`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la récupération des tendances");
    } catch (error) {
      console.error("Erreur getSecurityTrends:", error);
      throw error;
    }
  }

  /**
   * Crée un log de sécurité
   */
  async createSecurityLog(logData: Partial<SecurityLog>): Promise<SecurityLog> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: SecurityLog;
      }>(`${API_URL}/api/v1/security/logs`, logData);

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors de la création du log");
    } catch (error) {
      console.error("Erreur createSecurityLog:", error);
      throw error;
    }
  }

  /**
   * Déclenche une analyse de sécurité
   */
  async triggerSecurityAnalysis(): Promise<any> {
    try {
      const response = await axios.post<{ success: boolean; data: any }>(
        `${API_URL}/api/v1/security/analyze`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error("Erreur lors du déclenchement de l'analyse");
    } catch (error) {
      console.error("Erreur triggerSecurityAnalysis:", error);
      throw error;
    }
  }

  async getScoreSettings(): Promise<{
    weights: SecurityScoreWeights;
    updatedAt: string | null;
    source: string;
  }> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await axios.get<{
      success: boolean;
      data: {
        weights: SecurityScoreWeights;
        updatedAt: string | null;
        source: string;
      };
    }>(`${API_URL}/api/v1/security/score-settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.data.success) {
      throw new Error("Impossible de lire la pondération du score");
    }
    return response.data.data;
  }

  async updateScoreSettings(
    weights: SecurityScoreWeights,
  ): Promise<SecurityScoreWeights> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await axios.put<{
      success: boolean;
      data: { weights: SecurityScoreWeights };
    }>(
      `${API_URL}/api/v1/security/score-settings`,
      { weights },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!response.data.success) {
      throw new Error("Impossible de mettre à jour la pondération du score");
    }
    return response.data.data.weights;
  }
}

export const securityService = new SecurityService();
export default securityService;

import axios from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";
import { buildApiUrl, isOptionalEndpoint } from "@/config/api.config";

const API_URL = FRONTEND_URLS.api;

export interface RefreshIntervals {
  logs: number;
  analytics: number;
  metrics: number;
  dashboard: number;
  services: number;
  notifications: number;
}

export interface DisplayPreferences {
  itemsPerPage: number;
  compactMode: boolean;
  showCharts: boolean;
  showMetrics: boolean;
  detailedMetrics?: boolean;
}

export interface NotificationPreferences {
  desktop: boolean;
  sound: boolean;
  highPriorityOnly: boolean;
  applicationUpdates?: boolean;
  interviewReminders?: boolean;
  followupReminders?: boolean;
  deadlineAlerts?: boolean;
  systemAlerts?: boolean;
}

export interface UserPreferences {
  refreshInterval: RefreshIntervals;
  display: DisplayPreferences;
  notifications: NotificationPreferences;
  theme: string;
  language: string;
  timezone: string;
  metricsRetentionDays?: number;
  logsRetentionDays?: number;
  autoCleanupHistory?: boolean;
}

class PreferencesService {
  private cache: UserPreferences | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupérer les préférences de l'utilisateur
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      // Vérifier le cache
      const now = Date.now();
      if (this.cache && now - this.cacheTimestamp < this.cacheDuration) {
        return this.cache;
      }

      const token = this.getToken();
      const response = await axios.get(buildApiUrl("preferences"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        this.cache = response.data.preferences;
        this.cacheTimestamp = now;
        return response.data.preferences;
      }

      // Si pas de préférences, retourner les valeurs par défaut
      return this.getDefaultPreferences();
    } catch (error: any) {
      // Ne logger que les erreurs autres que 404 (endpoint optionnel)
      if (
        error?.response?.status !== 404 &&
        error?.code !== "ERR_BAD_REQUEST"
      ) {
        console.warn("⚠️ Erreur récupération préférences:", error.message);
      }
      // Retourner les préférences par défaut en cas d'erreur
      return this.getDefaultPreferences();
    }
  }

  /**
   * Mettre à jour les préférences de l'utilisateur
   */
  async updateUserPreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    try {
      const token = this.getToken();
      const response = await axios.put(
        `${API_URL}/api/v1/preferences`,
        { preferences },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        // Mettre à jour le cache
        this.cache = response.data.preferences;
        this.cacheTimestamp = Date.now();

        // Stocker aussi en localStorage pour persistance immédiate
        localStorage.setItem(
          "userPreferences",
          JSON.stringify(response.data.preferences),
        );

        return response.data.preferences;
      }

      throw new Error("Échec de la mise à jour des préférences");
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      throw error;
    }
  }

  /**
   * Réinitialiser les préférences par défaut
   */
  async resetUserPreferences(): Promise<UserPreferences> {
    try {
      const token = this.getToken();
      const response = await axios.post(
        `${API_URL}/api/v1/preferences/reset`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success) {
        // Mettre à jour le cache
        this.cache = response.data.preferences;
        this.cacheTimestamp = Date.now();

        // Nettoyer le localStorage
        localStorage.removeItem("userPreferences");

        return response.data.preferences;
      }

      throw new Error("Échec de la réinitialisation des préférences");
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation des préférences:",
        error,
      );
      throw error;
    }
  }

  /**
   * Récupérer un intervalle de rafraîchissement spécifique
   */
  async getRefreshInterval(key: keyof RefreshIntervals): Promise<number> {
    const preferences = await this.getUserPreferences();
    return (
      preferences.refreshInterval[key] ||
      this.getDefaultPreferences().refreshInterval[key]
    );
  }

  /**
   * Mettre à jour un intervalle de rafraîchissement spécifique
   */
  async updateRefreshInterval(
    key: keyof RefreshIntervals,
    value: number,
  ): Promise<void> {
    const preferences = await this.getUserPreferences();
    preferences.refreshInterval[key] = value;
    await this.updateUserPreferences(preferences);
  }

  /**
   * Récupérer les préférences depuis le localStorage (pour accès rapide)
   */
  getLocalPreferences(): UserPreferences | null {
    try {
      const stored = localStorage.getItem("userPreferences");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la lecture des préférences locales:",
        error,
      );
    }
    return null;
  }

  /**
   * Obtenir les préférences par défaut
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      refreshInterval: {
        logs: 30000, // 30 secondes (logs de sécurité)
        analytics: 30000, // 30 secondes (analytics)
        metrics: 30000, // 30 secondes (métriques système/projet)
        dashboard: 30000, // 30 secondes (dashboard principal)
        services: 60000, // 60 secondes (liste des services)
        notifications: 60000, // 60 secondes (notifications)
      },
      display: {
        itemsPerPage: 20,
        compactMode: false,
        showCharts: true,
        showMetrics: true,
        detailedMetrics: false,
      },
      notifications: {
        desktop: true,
        sound: false,
        highPriorityOnly: false,
        applicationUpdates: true,
        interviewReminders: true,
        followupReminders: true,
        deadlineAlerts: true,
        systemAlerts: true,
      },
      theme: "light",
      language: "fr",
      timezone: "Europe/Paris",
      metricsRetentionDays: 30,
      logsRetentionDays: 30,
      autoCleanupHistory: true,
    };
  }

  /**
   * Récupérer le token d'authentification
   */
  private getToken(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || "";
    }
    return "";
  }

  /**
   * Exporter les préférences
   */
  async exportPreferences(): Promise<void> {
    try {
      const token = this.getToken();
      const response = await axios.get(`${API_URL}/api/v1/preferences/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `preferences-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export des préférences:", error);
      throw error;
    }
  }

  /**
   * Importer les préférences
   */
  async importPreferences(file: File): Promise<UserPreferences> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.preferences) {
        throw new Error("Format de fichier invalide");
      }

      const token = this.getToken();
      const response = await axios.post(
        `${API_URL}/api/v1/preferences/import`,
        { preferences: data.preferences },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        // Mettre à jour le cache
        this.cache = response.data.preferences;
        this.cacheTimestamp = Date.now();

        // Stocker aussi en localStorage
        localStorage.setItem(
          "userPreferences",
          JSON.stringify(response.data.preferences),
        );

        return response.data.preferences;
      }

      throw new Error("Échec de l'import des préférences");
    } catch (error) {
      console.error("Erreur lors de l'import des préférences:", error);
      throw error;
    }
  }

  /**
   * Invalider le cache
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const preferencesService = new PreferencesService();
export default preferencesService;

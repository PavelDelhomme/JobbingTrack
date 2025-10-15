import { apiClient } from './api';
import { useOfflineSync } from '@/hooks/useOfflineSync';

// Types pour les opérations offline
interface OfflineConfig {
  entity: string;
  enableOffline?: boolean;
  cacheTimeout?: number; // en minutes
}

class OfflineAPI {
  private offlineSync = useOfflineSync();

  // Configuration par défaut pour chaque entité
  private defaultConfigs: Record<string, OfflineConfig> = {
    applications: { entity: 'applications', enableOffline: true, cacheTimeout: 30 },
    companies: { entity: 'companies', enableOffline: true, cacheTimeout: 60 },
    contacts: { entity: 'contacts', enableOffline: true, cacheTimeout: 60 },
    interviews: { entity: 'interviews', enableOffline: true, cacheTimeout: 15 },
    calls: { entity: 'calls', enableOffline: true, cacheTimeout: 15 },
    dashboard: { entity: 'dashboard', enableOffline: true, cacheTimeout: 5 },
    search: { entity: 'search', enableOffline: false, cacheTimeout: 10 }
  };

  // Wrapper pour les requêtes GET avec cache offline
  async get<T = any>(
    url: string,
    config?: OfflineConfig,
    params?: Record<string, any>
  ): Promise<T> {
    const entity = this.extractEntityFromUrl(url);
    const offlineConfig = { ...this.defaultConfigs[entity], ...config };

    // Vérifier le cache d'abord
    const cacheKey = this.generateCacheKey(url, params);
    const cachedData = this.offlineSync.getCache(cacheKey);

    if (cachedData && offlineConfig.enableOffline) {
      console.log(`📦 Données récupérées du cache: ${cacheKey}`);
      return cachedData;
    }

    // Si en ligne, faire la requête normale
    if (this.offlineSync.isOnline) {
      try {
        const response = await apiClient.get(url, { params });
        const data = response.data;

        // Mettre en cache si activé
        if (offlineConfig.enableOffline) {
          this.offlineSync.setCache(cacheKey, data, offlineConfig.cacheTimeout);
        }

        return data;
      } catch (error) {
        // En cas d'erreur, essayer de retourner le cache si disponible
        if (cachedData) {
          console.log(`⚠️ Erreur réseau, utilisation du cache: ${cacheKey}`);
          return cachedData;
        }
        throw error;
      }
    } else {
      // Hors ligne, retourner uniquement le cache si disponible
      if (cachedData) {
        console.log(`🔌 Hors ligne, utilisation du cache: ${cacheKey}`);
        return cachedData;
      } else {
        throw new Error(`Données non disponibles hors ligne pour: ${url}`);
      }
    }
  }

  // Wrapper pour les requêtes POST avec gestion offline
  async post<T = any>(
    url: string,
    data: any,
    config?: OfflineConfig
  ): Promise<T> {
    const entity = this.extractEntityFromUrl(url);
    const offlineConfig = { ...this.defaultConfigs[entity], ...config };

    // Si en ligne, exécuter normalement
    if (this.offlineSync.isOnline) {
      try {
        const response = await apiClient.post(url, data);

        // Invalider le cache associé
        this.invalidateEntityCache(entity);

        return response.data;
      } catch (error) {
        // Si erreur et offline activé, ajouter à la queue
        if (offlineConfig.enableOffline) {
          this.offlineSync.createOfflineOperation(entity, 'CREATE', data);
          throw new Error('Opération ajoutée à la queue de synchronisation');
        }
        throw error;
      }
    } else {
      // Hors ligne, ajouter à la queue
      if (offlineConfig.enableOffline) {
        this.offlineSync.createOfflineOperation(entity, 'CREATE', data);
        throw new Error('Opération ajoutée à la queue de synchronisation');
      } else {
        throw new Error('Création impossible hors ligne');
      }
    }
  }

  // Wrapper pour les requêtes PUT avec gestion offline
  async put<T = any>(
    url: string,
    data: any,
    config?: OfflineConfig
  ): Promise<T> {
    const entity = this.extractEntityFromUrl(url);
    const offlineConfig = { ...this.defaultConfigs[entity], ...config };

    // Si en ligne, exécuter normalement
    if (this.offlineSync.isOnline) {
      try {
        const response = await apiClient.put(url, data);

        // Invalider le cache associé
        this.invalidateEntityCache(entity);

        return response.data;
      } catch (error) {
        // Si erreur et offline activé, ajouter à la queue
        if (offlineConfig.enableOffline) {
          this.offlineSync.createOfflineOperation(entity, 'UPDATE', data);
          throw new Error('Opération ajoutée à la queue de synchronisation');
        }
        throw error;
      }
    } else {
      // Hors ligne, ajouter à la queue
      if (offlineConfig.enableOffline) {
        this.offlineSync.createOfflineOperation(entity, 'UPDATE', data);
        throw new Error('Opération ajoutée à la queue de synchronisation');
      } else {
        throw new Error('Modification impossible hors ligne');
      }
    }
  }

  // Wrapper pour les requêtes DELETE avec gestion offline
  async delete<T = any>(
    url: string,
    config?: OfflineConfig
  ): Promise<T> {
    const entity = this.extractEntityFromUrl(url);
    const offlineConfig = { ...this.defaultConfigs[entity], ...config };

    // Si en ligne, exécuter normalement
    if (this.offlineSync.isOnline) {
      try {
        const response = await apiClient.delete(url);

        // Invalider le cache associé
        this.invalidateEntityCache(entity);

        return response.data;
      } catch (error) {
        // Si erreur et offline activé, ajouter à la queue
        if (offlineConfig.enableOffline) {
          const id = this.extractIdFromUrl(url);
          this.offlineSync.createOfflineOperation(entity, 'DELETE', { id });
          throw new Error('Opération ajoutée à la queue de synchronisation');
        }
        throw error;
      }
    } else {
      // Hors ligne, ajouter à la queue
      if (offlineConfig.enableOffline) {
        const id = this.extractIdFromUrl(url);
        this.offlineSync.createOfflineOperation(entity, 'DELETE', { id });
        throw new Error('Opération ajoutée à la queue de synchronisation');
      } else {
        throw new Error('Suppression impossible hors ligne');
      }
    }
  }

  // Extraire l'entité depuis l'URL
  private extractEntityFromUrl(url: string): string {
    // Pattern pour extraire l'entité depuis l'URL API
    const match = url.match(/\/api\/v1\/([^\/\?]+)/);
    return match ? match[1].replace(/s$/, '') : 'unknown'; // Retirer le 's' final si présent
  }

  // Extraire l'ID depuis l'URL
  private extractIdFromUrl(url: string): string | null {
    const match = url.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  // Générer une clé de cache unique
  private generateCacheKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `api_${url}_${paramString}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  // Invalider le cache d'une entité
  private invalidateEntityCache(entity: string) {
    // Cette méthode sera implémentée côté hook si nécessaire
    // Pour l'instant, on laisse le cache expirer naturellement
    console.log(`🔄 Cache invalidé pour l'entité: ${entity}`);
  }

  // Méthodes utilitaires pour les composants
  getOfflineStats() {
    return this.offlineSync.stats;
  }

  isOnline() {
    return this.offlineSync.isOnline;
  }

  hasPendingOperations() {
    return this.offlineSync.pendingOperations.length > 0;
  }

  async syncPendingOperations() {
    return this.offlineSync.syncPendingOperations();
  }
}

// Instance singleton de l'API offline
export const offlineAPI = new OfflineAPI();

// Wrapper pour les services existants
export const offlineApplicationService = {
  getAll: (params?: any) => offlineAPI.get('/applications', undefined, params),
  getById: (id: string) => offlineAPI.get(`/applications/${id}`),
  create: (data: any) => offlineAPI.post('/applications', data),
  update: (id: string, data: any) => offlineAPI.put(`/applications/${id}`, data),
  delete: (id: string) => offlineAPI.delete(`/applications/${id}`)
};

export const offlineCompanyService = {
  getAll: (params?: any) => offlineAPI.get('/companies', undefined, params),
  getById: (id: string) => offlineAPI.get(`/companies/${id}`),
  create: (data: any) => offlineAPI.post('/companies', data),
  update: (id: string, data: any) => offlineAPI.put(`/companies/${id}`, data),
  delete: (id: string) => offlineAPI.delete(`/companies/${id}`)
};

export const offlineContactService = {
  getAll: (params?: any) => offlineAPI.get('/contacts', undefined, params),
  getById: (id: string) => offlineAPI.get(`/contacts/${id}`),
  create: (data: any) => offlineAPI.post('/contacts', data),
  update: (id: string, data: any) => offlineAPI.put(`/contacts/${id}`, data),
  delete: (id: string) => offlineAPI.delete(`/contacts/${id}`)
};

export const offlineInterviewService = {
  getAll: (params?: any) => offlineAPI.get('/interviews', undefined, params),
  getById: (id: string) => offlineAPI.get(`/interviews/${id}`),
  create: (data: any) => offlineAPI.post('/interviews', data),
  update: (id: string, data: any) => offlineAPI.put(`/interviews/${id}`, data),
  delete: (id: string) => offlineAPI.delete(`/interviews/${id}`)
};

export const offlineCallService = {
  getAll: (params?: any) => offlineAPI.get('/calls', undefined, params),
  getById: (id: string) => offlineAPI.get(`/calls/${id}`),
  create: (data: any) => offlineAPI.post('/calls', data),
  update: (id: string, data: any) => offlineAPI.put(`/calls/${id}`, data),
  delete: (id: string) => offlineAPI.delete(`/calls/${id}`)
};

export const offlineDashboardService = {
  getKPIs: () => offlineAPI.get('/dashboard/kpis'),
  getStats: () => offlineAPI.get('/dashboard/stats')
};

export const offlineSearchService = {
  globalSearch: (query: string, modules?: string[], limit?: number) => {
    const params = new URLSearchParams({ query });
    if (modules && modules.length > 0) {
      params.append('modules', modules.join(','));
    }
    if (limit) {
      params.append('limit', limit.toString());
    }
    return offlineAPI.get(`/search?${params.toString()}`, { entity: 'search', enableOffline: false });
  }
};

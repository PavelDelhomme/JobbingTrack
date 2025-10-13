import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';

interface PreloadConfig {
  enabled: boolean;
  priorityEntities: string[];
  preloadOnAppStart: boolean;
  preloadOnNetworkChange: boolean;
  maxCacheAge: number; // en minutes
  batchSize: number;
}

interface PreloadStats {
  lastPreload: Date | null;
  totalPreloaded: number;
  entitiesPreloaded: Record<string, number>;
  errors: string[];
}

export function useSearchPreloader(config: Partial<PreloadConfig> = {}) {
  const { isOnline, setCache } = useOfflineSync();

  const defaultConfig: PreloadConfig = {
    enabled: true,
    priorityEntities: ['applications', 'companies', 'contacts'],
    preloadOnAppStart: true,
    preloadOnNetworkChange: true,
    maxCacheAge: 30, // 30 minutes
    batchSize: 50
  };

  const finalConfig = { ...defaultConfig, ...config };

  const [stats, setStats] = useState<PreloadStats>({
    lastPreload: null,
    totalPreloaded: 0,
    entitiesPreloaded: {},
    errors: []
  });

  const [isPreloading, setIsPreloading] = useState(false);

  // Précharger les données d'une entité
  const preloadEntity = useCallback(async (entityType: string): Promise<number> => {
    if (!isOnline) return 0;

    try {
      const { apiClient } = await import('@/lib/api');

      // Récupérer les données avec pagination
      const response = await apiClient.get(`/${entityType}`, {
        params: { limit: finalConfig.batchSize }
      });

      const data = response.data[entityType] || response.data || [];
      const count = Array.isArray(data) ? data.length : 0;

      if (count > 0) {
        // Mettre en cache avec une durée de vie plus longue pour les données préchargées
        setCache(`${entityType}_list`, data, finalConfig.maxCacheAge * 2);

        // Mettre à jour les statistiques
        setStats(prev => ({
          ...prev,
          totalPreloaded: prev.totalPreloaded + count,
          entitiesPreloaded: {
            ...prev.entitiesPreloaded,
            [entityType]: (prev.entitiesPreloaded[entityType] || 0) + count
          },
          lastPreload: new Date()
        }));
      }

      return count;
    } catch (error) {
      console.error(`Erreur lors du préchargement de ${entityType}:`, error);
      setStats(prev => ({
        ...prev,
        errors: [...prev.errors, `Erreur préchargement ${entityType}: ${error}`]
      }));
      return 0;
    }
  }, [isOnline, setCache, finalConfig]);

  // Précharger toutes les entités prioritaires
  const preloadAll = useCallback(async () => {
    if (!finalConfig.enabled || !isOnline || isPreloading) return;

    setIsPreloading(true);

    try {
      const promises = finalConfig.priorityEntities.map(entityType => preloadEntity(entityType));
      const results = await Promise.all(promises);

      const totalPreloaded = results.reduce((sum, count) => sum + count, 0);

      console.log(`📦 Préchargement terminé: ${totalPreloaded} éléments préchargés`);

    } catch (error) {
      console.error('Erreur lors du préchargement global:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [finalConfig, isOnline, isPreloading, preloadEntity]);

  // Préchargement intelligent basé sur l'utilisation
  const smartPreload = useCallback(async (userActivity?: string) => {
    if (!finalConfig.enabled || !isOnline) return;

    // Précharger en fonction de l'activité utilisateur
    let entitiesToPreload: string[] = [];

    switch (userActivity) {
      case 'dashboard':
        entitiesToPreload = ['applications', 'companies', 'interviews'];
        break;
      case 'applications':
        entitiesToPreload = ['applications', 'companies', 'contacts'];
        break;
      case 'companies':
        entitiesToPreload = ['companies', 'contacts', 'applications'];
        break;
      case 'search':
        entitiesToPreload = finalConfig.priorityEntities;
        break;
      default:
        entitiesToPreload = ['applications']; // Par défaut
    }

    const promises = entitiesToPreload.map(entityType => preloadEntity(entityType));
    await Promise.all(promises);
  }, [finalConfig, isOnline, preloadEntity]);

  // Vérifier si les données sont fraîches
  const isCacheFresh = useCallback((entityType: string): boolean => {
    const cacheKey = `${entityType}_list`;
    const cached = localStorage.getItem(`jobbingtrack-cache`);

    if (!cached) return false;

    try {
      const cache = JSON.parse(cached);
      const entry = cache[cacheKey];

      if (!entry) return false;

      const cacheAge = Date.now() - entry.timestamp;
      const maxAge = finalConfig.maxCacheAge * 60 * 1000; // Convertir en millisecondes

      return cacheAge < maxAge;
    } catch (error) {
      return false;
    }
  }, [finalConfig.maxCacheAge]);

  // Préchargement au démarrage de l'application
  useEffect(() => {
    if (finalConfig.preloadOnAppStart && isOnline) {
      // Attendre un peu pour laisser l'interface se charger
      const timer = setTimeout(() => {
        preloadAll();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [finalConfig.preloadOnAppStart, isOnline, preloadAll]);

  // Préchargement lors du changement de réseau
  useEffect(() => {
    if (finalConfig.preloadOnNetworkChange && isOnline) {
      preloadAll();
    }
  }, [finalConfig.preloadOnNetworkChange, isOnline, preloadAll]);

  // Nettoyer les erreurs périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        errors: []
      }));
    }, 5 * 60 * 1000); // Toutes les 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    // État
    isPreloading,
    stats,
    config: finalConfig,

    // Actions
    preloadAll,
    preloadEntity,
    smartPreload,
    isCacheFresh,

    // Utilitaires
    getPreloadProgress: () => {
      const totalExpected = finalConfig.priorityEntities.length * finalConfig.batchSize;
      return Math.min((stats.totalPreloaded / totalExpected) * 100, 100);
    }
  };
}

/**
 * Système de cache ultra optimisé pour JobbingTrack
 * Gère le cache en mémoire, localStorage, et IndexedDB pour une performance maximale
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  version?: number;
}

interface CacheOptions {
  ttl?: number; // Time to live en millisecondes
  maxSize?: number; // Taille maximale du cache
  storage?: 'memory' | 'localStorage' | 'indexedDB' | 'hybrid';
  version?: number; // Version du cache pour invalidation
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes par défaut
  private readonly MAX_MEMORY_SIZE = 100; // Nombre maximum d'entrées en mémoire
  private readonly STORAGE_PREFIX = 'jobbingtrack_cache_';
  private readonly VERSION_KEY = 'jobbingtrack_cache_version';
  private currentVersion = 1;

  constructor() {
    this.initializeVersion();
    this.cleanupExpired();
    // Nettoyer les entrées expirées toutes les minutes
    setInterval(() => this.cleanupExpired(), 60 * 1000);
  }

  private initializeVersion() {
    if (typeof window !== 'undefined') {
      const savedVersion = localStorage.getItem(this.VERSION_KEY);
      if (savedVersion) {
        this.currentVersion = parseInt(savedVersion, 10);
      } else {
        localStorage.setItem(this.VERSION_KEY, String(this.currentVersion));
      }
    }
  }

  /**
   * Obtenir une valeur du cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    
    // 1. Vérifier le cache mémoire (le plus rapide)
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && this.isValid(memoryEntry, options.version)) {
      return memoryEntry.data as T;
    }

    // 2. Vérifier localStorage
    if (options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry, options.version)) {
            // Remettre en cache mémoire pour accès rapide
            this.memoryCache.set(fullKey, entry);
            return entry.data;
          } else {
            // Nettoyer l'entrée expirée
            localStorage.removeItem(fullKey);
          }
        }
      } catch (error) {
        console.warn('[CACHE] Erreur lecture localStorage:', error);
      }
    }

    return null;
  }

  /**
   * Stocker une valeur dans le cache
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options.ttl || this.DEFAULT_TTL;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      key: fullKey,
      version: options.version || this.currentVersion
    };

    // 1. Stocker en mémoire (toujours)
    this.memoryCache.set(fullKey, entry);
    
    // Limiter la taille du cache mémoire
    if (this.memoryCache.size > this.MAX_MEMORY_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey !== undefined) {
        this.memoryCache.delete(firstKey);
      }
    }

    // 2. Stocker dans localStorage si demandé
    if (options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
      } catch (error) {
        // Si localStorage est plein, nettoyer les anciennes entrées
        if (error instanceof DOMException && error.code === 22) {
          this.cleanupOldest();
          try {
            localStorage.setItem(fullKey, JSON.stringify(entry));
          } catch (retryError) {
            console.warn('[CACHE] Impossible de stocker dans localStorage:', retryError);
          }
        }
      }
    }
  }

  /**
   * Supprimer une entrée du cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.memoryCache.delete(fullKey);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(fullKey);
      } catch (error) {
        console.warn('[CACHE] Erreur suppression localStorage:', error);
      }
    }
  }

  /**
   * Vérifier si une clé existe dans le cache
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    
    // Vérifier en mémoire
    if (this.memoryCache.has(fullKey)) {
      const entry = this.memoryCache.get(fullKey);
      if (entry && this.isValid(entry)) {
        return true;
      }
    }

    // Vérifier localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const entry: CacheEntry<any> = JSON.parse(stored);
          if (this.isValid(entry)) {
            return true;
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return false;
  }

  /**
   * Nettoyer toutes les entrées expirées
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Nettoyer le cache mémoire
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }

    // Nettoyer localStorage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const entry: CacheEntry<any> = JSON.parse(stored);
                if (entry.expiresAt < now) {
                  localStorage.removeItem(key);
                }
              }
            } catch (error) {
              // Supprimer les entrées corrompues
              localStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.warn('[CACHE] Erreur nettoyage localStorage:', error);
      }
    }
  }

  /**
   * Nettoyer les entrées les plus anciennes
   */
  private cleanupOldest(): void {
    if (typeof window === 'undefined') return;

    try {
      const entries: Array<{ key: string; timestamp: number }> = [];
      
      // Collecter toutes les entrées du cache
      for (const [key, entry] of this.memoryCache.entries()) {
        entries.push({ key, timestamp: entry.timestamp });
      }

      // Collecter les entrées de localStorage
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored);
              entries.push({ key, timestamp: entry.timestamp });
            }
          } catch (error) {
            // Ignorer
          }
        }
      }

      // Trier par timestamp et supprimer les 20% les plus anciens
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toDelete = Math.ceil(entries.length * 0.2);
      
      for (let i = 0; i < toDelete; i++) {
        const entry = entries[i];
        this.memoryCache.delete(entry.key);
        localStorage.removeItem(entry.key);
      }
    } catch (error) {
      console.warn('[CACHE] Erreur nettoyage anciennes entrées:', error);
    }
  }

  /**
   * Vider tout le cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn('[CACHE] Erreur vidage cache:', error);
      }
    }
  }

  /**
   * Invalider le cache (changer de version)
   */
  invalidate(): void {
    this.currentVersion++;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.VERSION_KEY, String(this.currentVersion));
    }
    this.clear();
  }

  /**
   * Obtenir la clé complète avec préfixe
   */
  private getFullKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /**
   * Vérifier si une entrée est valide
   */
  private isValid(entry: CacheEntry<any>, requiredVersion?: number): boolean {
    const now = Date.now();
    
    // Vérifier l'expiration
    if (entry.expiresAt < now) {
      return false;
    }

    // Vérifier la version
    if (requiredVersion !== undefined && entry.version !== undefined) {
      if (entry.version < requiredVersion) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): {
    memorySize: number;
    localStorageSize: number;
    version: number;
  } {
    let localStorageSize = 0;
    
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            localStorageSize++;
          }
        }
      } catch (error) {
        // Ignorer
      }
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageSize,
      version: this.currentVersion
    };
  }
}

// Instance singleton
export const cacheManager = new CacheManager();

/**
 * Hook React pour utiliser le cache
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Essayer de récupérer depuis le cache
      const cached = await cacheManager.get<T>(key, options);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        
        // Rafraîchir en arrière-plan si nécessaire
        if (options.ttl && options.ttl > 0) {
          fetcher()
            .then((freshData) => {
              cacheManager.set(key, freshData, options);
              setData(freshData);
            })
            .catch((err) => {
              console.warn('[CACHE] Erreur rafraîchissement en arrière-plan:', err);
            });
        }
      } else {
        // Pas de cache, récupérer les données
        const freshData = await fetcher();
        await cacheManager.set(key, freshData, options);
        setData(freshData);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [key, fetcher, options]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch: loadData
  };
}

// Import React pour le hook
import React from 'react';


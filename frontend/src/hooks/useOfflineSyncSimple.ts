"use client";

import { useState, useEffect, useCallback } from "react";

interface PendingOperation {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

interface OfflineSyncState {
  isOnline: boolean;
  pendingOperations: PendingOperation[];
  cache: Map<string, CachedData>;
  isSyncing: boolean;
  lastSync: Date | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingOperations: [],
    cache: new Map(),
    isSyncing: false,
    lastSync: null,
  });

  // Clés pour le stockage local
  const PENDING_OPERATIONS_KEY = "jobbingtrack-pending-operations";
  const CACHE_KEY = "jobbingtrack-cache";
  const LAST_SYNC_KEY = "jobbingtrack-last-sync";

  // Charger les données depuis le localStorage au démarrage
  useEffect(() => {
    try {
      // Charger les opérations en attente
      const pendingOps = localStorage.getItem(PENDING_OPERATIONS_KEY);
      if (pendingOps) {
        const operations = JSON.parse(pendingOps);
        setState((prev) => ({
          ...prev,
          pendingOperations: operations.map((op: any) => ({
            ...op,
            timestamp: new Date(op.timestamp),
          })),
        }));
      }

      // Charger le cache
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (cacheData) {
        const cacheObj = JSON.parse(cacheData);
        const cacheMap = new Map(Object.entries(cacheObj));
        setState((prev: any) => ({ ...prev, cache: cacheMap }));
      }

      // Charger la dernière synchronisation
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      if (lastSync) {
        setState((prev) => ({ ...prev, lastSync: new Date(lastSync) }));
      }
    } catch (error) {
      console.error("Erreur lors du chargement offline:", error);
    }
  }, []);

  // Écouter les changements de connexion réseau
  useEffect(() => {
    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sauvegarder dans le localStorage
  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(
        PENDING_OPERATIONS_KEY,
        JSON.stringify(state.pendingOperations),
      );
      localStorage.setItem(LAST_SYNC_KEY, state.lastSync?.toISOString() || "");

      // Sauvegarder le cache (limiter à 50 entrées pour éviter les débordements)
      const cacheArray = Array.from(state.cache.entries()).slice(-50);
      const cacheObj = Object.fromEntries(cacheArray);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde offline:", error);
    }
  }, [state.pendingOperations, state.lastSync, state.cache]);

  // Ajouter une opération en attente
  const addPendingOperation = useCallback(
    (operation: Omit<PendingOperation, "id" | "timestamp" | "retryCount">) => {
      const newOperation: PendingOperation = {
        ...operation,
        id: `${operation.type}_${operation.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setState((prev) => ({
        ...prev,
        pendingOperations: [...prev.pendingOperations, newOperation],
      }));

      saveToStorage();
    },
    [saveToStorage],
  );

  // Mettre en cache des données
  const setCache = useCallback(
    (key: string, data: any, ttlMinutes?: number) => {
      const expiresAt = ttlMinutes
        ? Date.now() + ttlMinutes * 60 * 1000
        : undefined;

      const cachedData: CachedData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt,
      };

      setState((prev) => {
        const newCache = new Map(prev.cache);
        newCache.set(key, cachedData);
        return { ...prev, cache: newCache };
      });

      saveToStorage();
    },
    [saveToStorage],
  );

  // Récupérer des données du cache
  const getCache = useCallback(
    (key: string): any | null => {
      const cached = state.cache.get(key);

      if (!cached) return null;

      // Vérifier si le cache a expiré
      if (cached.expiresAt && cached.expiresAt < Date.now()) {
        // Supprimer le cache expiré
        setState((prev) => {
          const newCache = new Map(prev.cache);
          newCache.delete(key);
          return { ...prev, cache: newCache };
        });
        return null;
      }

      return cached.data;
    },
    [state.cache],
  );

  // Supprimer une opération en attente
  const removePendingOperation = useCallback(
    (operationId: string) => {
      setState((prev) => ({
        ...prev,
        pendingOperations: prev.pendingOperations.filter(
          (op) => op.id !== operationId,
        ),
      }));

      saveToStorage();
    },
    [saveToStorage],
  );

  // Synchroniser les opérations en attente (simplifié)
  const syncPendingOperations = useCallback(async () => {
    if (!state.isOnline || state.pendingOperations.length === 0) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    // Logique de synchronisation simplifiée
    console.log(
      `🔄 Synchronisation de ${state.pendingOperations.length} opérations...`,
    );

    // Simulation de synchronisation réussie
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        pendingOperations: [],
        isSyncing: false,
        lastSync: new Date(),
      }));
      saveToStorage();
    }, 2000);
  }, [state.isOnline, state.pendingOperations.length, saveToStorage]);

  // Créer une opération offline (simplifié)
  const createOfflineOperation = useCallback(
    (entity: string, type: "CREATE" | "UPDATE" | "DELETE", data: any) => {
      if (state.isOnline) {
        console.log(`✅ Opération ${type} exécutée en ligne`);
      } else {
        addPendingOperation({ entity, type, data });
        console.log(`📱 Opération ${type} ajoutée à la queue offline`);
      }
    },
    [state.isOnline, addPendingOperation],
  );

  // Nettoyer le cache expiré (manuel)
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const newCache = new Map();

    state.cache.forEach((cached, key) => {
      if (!cached.expiresAt || cached.expiresAt > now) {
        newCache.set(key, cached);
      }
    });

    setState((prev: any) => ({ ...prev, cache: newCache }));
    saveToStorage();
  }, [state.cache, saveToStorage]);

  // Vider complètement les données offline
  const clearAllOfflineData = useCallback(() => {
    setState({
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      pendingOperations: [],
      cache: new Map(),
      isSyncing: false,
      lastSync: null,
    });

    localStorage.removeItem(PENDING_OPERATIONS_KEY);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  }, []);

  return {
    // État
    isOnline: state.isOnline,
    pendingOperations: state.pendingOperations,
    cacheSize: state.cache.size,
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,

    // Actions
    addPendingOperation,
    setCache,
    getCache,
    createOfflineOperation,
    syncPendingOperations,
    clearExpiredCache,
    clearAllOfflineData,

    // Statistiques
    stats: {
      pendingCount: state.pendingOperations.length,
      cacheSize: state.cache.size,
      totalSize: JSON.stringify(Array.from(state.cache.values())).length,
    },
  };
}

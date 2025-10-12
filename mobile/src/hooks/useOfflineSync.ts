import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineSyncService, localStorageService } from '../services/api';
import { localStorageService as storageService } from '../services/storage';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingActions: number;
  error: string | null;
}

export interface OfflineSyncActions {
  syncNow: () => Promise<void>;
  addToQueue: (action: any) => Promise<void>;
  clearQueue: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export type UseOfflineSyncReturn = OfflineSyncState & OfflineSyncActions;

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    error: null,
  });

  // Surveiller l'état de la connexion réseau
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setState(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
      }));

      // Si la connexion revient, déclencher une synchronisation automatique
      if (state.isConnected && !prev.isOnline) {
        handleNetworkReconnection();
      }
    });

    return () => unsubscribe();
  }, []);

  // Charger l'état initial
  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = useCallback(async () => {
    try {
      const [lastSync, pendingActions] = await Promise.all([
        storageService.getLastSyncTime(),
        getPendingActionsCount(),
      ]);

      setState(prev => ({
        ...prev,
        lastSync,
        pendingActions,
      }));
    } catch (error) {
      console.error('Erreur chargement état initial offline:', error);
    }
  }, []);

  const getPendingActionsCount = useCallback(async (): Promise<number> => {
    try {
      const queue = await offlineSyncService.getOfflineQueue();
      return queue.length;
    } catch (error) {
      console.error('Erreur récupération nombre d\'actions en attente:', error);
      return 0;
    }
  }, []);

  const handleNetworkReconnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      // Synchroniser la queue offline
      await offlineSyncService.syncOfflineQueue();

      // Mettre à jour la dernière synchronisation
      await storageService.setLastSyncTime();

      // Recharger l'état
      await loadInitialState();

      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error) {
      console.error('Erreur reconnexion réseau:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Erreur lors de la synchronisation automatique',
      }));
    }
  }, [loadInitialState]);

  const syncNow = useCallback(async () => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, error: 'Connexion réseau requise pour la synchronisation' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      // Synchroniser la queue offline
      await offlineSyncService.syncOfflineQueue();

      // Mettre à jour la dernière synchronisation
      await storageService.setLastSyncTime();

      // Recharger l'état
      await loadInitialState();

      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Erreur lors de la synchronisation',
      }));
    }
  }, [state.isOnline, loadInitialState]);

  const addToQueue = useCallback(async (action: any) => {
    try {
      await offlineSyncService.addToOfflineQueue(action);

      // Mettre à jour le nombre d'actions en attente
      const pendingActions = await getPendingActionsCount();
      setState(prev => ({ ...prev, pendingActions }));
    } catch (error) {
      console.error('Erreur ajout à la queue:', error);
      setState(prev => ({ ...prev, error: 'Erreur ajout à la queue offline' }));
    }
  }, [getPendingActionsCount]);

  const clearQueue = useCallback(async () => {
    try {
      await offlineSyncService.clearOfflineQueue();
      setState(prev => ({ ...prev, pendingActions: 0, error: null }));
    } catch (error) {
      console.error('Erreur vidage queue:', error);
      setState(prev => ({ ...prev, error: 'Erreur vidage queue offline' }));
    }
  }, []);

  const exportData = useCallback(async (): Promise<string> => {
    try {
      return await storageService.exportData();
    } catch (error) {
      console.error('Erreur export données:', error);
      setState(prev => ({ ...prev, error: 'Erreur export données' }));
      throw error;
    }
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    try {
      await storageService.importData(jsonData);
      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Erreur import données:', error);
      setState(prev => ({ ...prev, error: 'Erreur import données' }));
      throw error;
    }
  }, []);

  return {
    ...state,
    syncNow,
    addToQueue,
    clearQueue,
    exportData,
    importData,
  };
};

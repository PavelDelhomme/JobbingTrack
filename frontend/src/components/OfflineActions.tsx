'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, Database, AlertTriangle, Cpu, HardDrive } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSyncSimple';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isMobileEmulator } from '@/lib/utils';

interface OfflineActionsProps {
  className?: string;
  showSyncButton?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  totalMemory: number;
}

// Hook pour le monitoring système (CPU/Mémoire)
function useSystemMonitoring() {
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 0,
    memoryUsage: 0,
    totalMemory: 0
  });

  useEffect(() => {
    if (!isMobileEmulator()) return;

    const updateStats = () => {
      // Simulation de monitoring système pour l'émulateur mobile
      if ('performance' in window && 'memory' in (performance as any)) {
        const memory = (performance as any).memory;
        const totalMemory = memory.totalJSHeapSize || 0;
        const usedMemory = memory.usedJSHeapSize || 0;
        const memoryUsage = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;

        setStats({
          cpuUsage: Math.random() * 30 + 10, // Simulation CPU 10-40%
          memoryUsage: Math.min(memoryUsage, 100),
          totalMemory: totalMemory
        });
      }
    };

    // Mise à jour toutes les 2 secondes dans l'émulateur mobile
    const interval = setInterval(updateStats, 2000);
    updateStats(); // Première mise à jour immédiate

    return () => clearInterval(interval);
  }, []);

  return stats;
}

export function OfflineActions({
  className = '',
  showSyncButton = true,
  showStats = false,
  compact = false
}: OfflineActionsProps) {
  const { isOnline, pendingOperations, isSyncing, syncPendingOperations, stats } = useOfflineSync();
  const systemStats = useSystemMonitoring();
  const [isHovering, setIsHovering] = useState(false);
  const isEmulator = isMobileEmulator();

  const handleSync = async () => {
    try {
      await syncPendingOperations();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-1 ${className}`}>
          {/* Indicateur d'état de connexion - Seulement dans l'émulateur mobile */}
          {isEmulator && (
            <Tooltip content={isOnline ? 'Connecté à internet' : 'Mode hors ligne activé'}>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                  isOnline ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {isOnline ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">
                    {isOnline ? 'En ligne' : 'Hors ligne'}
                  </span>
                </div>
              </TooltipTrigger>
            </Tooltip>
          )}

          {/* Monitoring CPU/Mémoire - Seulement dans l'émulateur mobile */}
          {isEmulator && (systemStats.cpuUsage > 0 || systemStats.memoryUsage > 0) && (
            <div className="flex items-center gap-1">
              <Tooltip content={`Utilisation CPU: ${Math.round(systemStats.cpuUsage)}%`}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20">
                    <Cpu className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {Math.round(systemStats.cpuUsage)}%
                    </span>
                  </div>
                </TooltipTrigger>
              </Tooltip>

              <Tooltip content={`Utilisation Mémoire: ${Math.round(systemStats.memoryUsage)}%`}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20">
                    <HardDrive className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      {Math.round(systemStats.memoryUsage)}%
                    </span>
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </div>
          )}

          {/* Bouton de synchronisation */}
          {showSyncButton && pendingOperations.length > 0 && (
            <Tooltip content={`Synchroniser ${pendingOperations.length} opération${pendingOperations.length > 1 ? 's' : ''}`}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
            </Tooltip>
          )}

          {/* Badge des opérations en attente */}
          {pendingOperations.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {pendingOperations.length}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Indicateur d'état principal - Seulement dans l'émulateur mobile */}
      {isEmulator && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
          isOnline ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-orange-600" />
            )}

            <span className={`text-sm font-medium ${
              isOnline ? 'text-green-700' : 'text-orange-700'
            }`}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          {/* Statistiques si demandées */}
          {showStats && (
            <div className="flex items-center gap-3 text-xs text-gray-600 ml-2">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>{stats.cacheSize} éléments</span>
              </div>
              {pendingOperations.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{pendingOperations.length} en attente</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monitoring système - Seulement dans l'émulateur mobile */}
      {isEmulator && (systemStats.cpuUsage > 0 || systemStats.memoryUsage > 0) && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <Cpu className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              CPU: {Math.round(systemStats.cpuUsage)}%
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
            <HardDrive className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              RAM: {Math.round(systemStats.memoryUsage)}%
            </span>
          </div>
        </div>
      )}

      {/* Bouton de synchronisation */}
      {showSyncButton && pendingOperations.length > 0 && (
        <Button
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className={`${
            isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronisation...' : `Synchroniser (${pendingOperations.length})`}
        </Button>
      )}

      {/* Indicateur de synchronisation en cours */}
      {isSyncing && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Synchronisation en cours...</span>
        </div>
      )}
    </div>
  );
}

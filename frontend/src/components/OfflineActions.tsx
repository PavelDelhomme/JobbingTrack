'use client';

import { useState } from 'react';
import { RefreshCw, Wifi, WifiOff, Database, AlertTriangle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSyncSimple';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OfflineActionsProps {
  className?: string;
  showSyncButton?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

export function OfflineActions({
  className = '',
  showSyncButton = true,
  showStats = false,
  compact = false
}: OfflineActionsProps) {
  const { isOnline, pendingOperations, isSyncing, syncPendingOperations, stats } = useOfflineSync();
  const [isHovering, setIsHovering] = useState(false);

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
          {/* Indicateur d'état de connexion */}
          <Tooltip>
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
            <TooltipContent>
              <p>{isOnline ? 'Connecté à internet' : 'Mode hors ligne activé'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Bouton de synchronisation */}
          {showSyncButton && pendingOperations.length > 0 && (
            <Tooltip>
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
              <TooltipContent>
                <p>Synchroniser {pendingOperations.length} opération{pendingOperations.length > 1 ? 's' : ''}</p>
              </TooltipContent>
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
      {/* Indicateur d'état principal */}
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

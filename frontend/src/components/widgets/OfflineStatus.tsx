'use client';

import { useState, useEffect } from 'react';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from '@/lib/icons';
import { useOfflineSync } from '@/hooks/useOfflineSyncSimple';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';

interface OfflineStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineStatus({ className = '', showDetails = false }: OfflineStatusProps) {
  const {
    isOnline,
    pendingOperations,
    cacheSize,
    isSyncing,
    lastSync,
    stats,
    syncPendingOperations,
    clearExpiredCache,
    clearAllOfflineData
  } = useOfflineSync();

  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);

  // Formater la durée depuis la dernière synchronisation
  const formatLastSync = (lastSync: Date | null) => {
    if (!lastSync) return 'Jamais';

    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  // Calculer la taille du cache en octets
  const formatCacheSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className={`${className} ${!isOnline ? 'border-orange-300 bg-orange-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-orange-600" />
          )}
          État de connexion
          <div className="flex gap-2 ml-auto">
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Badge>
            {pendingOperations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingOperations.length} en attente
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Dernière sync</span>
            </div>
            <p className="text-gray-600">{formatLastSync(lastSync)}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Cache</span>
            </div>
            <p className="text-gray-600">{cacheSize} éléments</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <span className="font-medium">En attente</span>
            </div>
            <p className="text-gray-600">{pendingOperations.length}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Taille cache</span>
            </div>
            <p className="text-gray-600">{formatCacheSize(stats.totalSize)}</p>
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailsPanel(!showDetailsPanel)}
          >
            {showDetailsPanel ? 'Masquer détails' : 'Voir détails'}
          </Button>

          {isOnline && pendingOperations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncPendingOperations}
              disabled={isSyncing}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={clearExpiredCache}
            className="text-gray-600"
          >
            Nettoyer cache
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAllOfflineData}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Vider tout
          </Button>
        </div>

        {/* Détails avancés */}
        {showDetailsPanel && (
          <div className="space-y-4 pt-4 border-t">
            {/* État de la synchronisation */}
            {isSyncing && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Synchronisation en cours... {pendingOperations.length} opérations en attente.
                </AlertDescription>
              </Alert>
            )}

            {/* État hors ligne */}
            {!isOnline && (
              <Alert className="border-orange-200 bg-orange-50">
                <WifiOff className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  <strong>Mode hors ligne activé</strong> - Vos modifications sont sauvegardées localement
                  et seront synchronisées automatiquement au retour de la connexion.
                </AlertDescription>
              </Alert>
            )}

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Opérations en attente</h4>
                {pendingOperations.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune opération en attente</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pendingOperations.map((op) => (
                      <div key={op.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {op.type}
                          </Badge>
                          <span className="font-medium">{op.entity}</span>
                        </div>
                        <div className="text-gray-500">
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Informations cache</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Éléments en cache:</span>
                    <span className="font-medium">{cacheSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taille approximative:</span>
                    <span className="font-medium">{formatCacheSize(stats.totalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opérations en attente:</span>
                    <span className="font-medium">{pendingOperations.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions avancées */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={syncPendingOperations}
                disabled={!isOnline || isSyncing || pendingOperations.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Forcer la synchronisation
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearExpiredCache}
              >
                <Database className="h-4 w-4 mr-2" />
                Nettoyer le cache expiré
              </Button>
            </div>
          </div>
        )}

        {/* Message d'aide */}
        <Alert className="mt-4">
          <AlertDescription className="text-xs">
            <strong>Fonctionnement hors ligne :</strong> Les données sont automatiquement mises en cache
            pour permettre une utilisation continue sans connexion. La synchronisation se fait
            automatiquement dès le retour de la connexion internet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

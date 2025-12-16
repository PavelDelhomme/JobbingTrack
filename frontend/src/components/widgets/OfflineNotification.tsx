'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSyncSimple';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';

interface OfflineNotificationProps {
  className?: string;
  position?: 'top-right&apos; | 'top-left' | &apos;bottom-right' | 'bottom-left';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function OfflineNotification({
  className = '',
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 5000
}: OfflineNotificationProps) {
  const { isOnline, pendingOperations, isSyncing, syncPendingOperations } = useOfflineSync();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Positionnement CSS
  const positionClasses = {
    'top-right&apos;: 'fixed top-4 right-4 z-50',
    'top-left&apos;: 'fixed top-4 left-4 z-50',
    'bottom-right&apos;: 'fixed bottom-4 right-4 z-50',
    'bottom-left&apos;: 'fixed bottom-4 left-4 z-50'
  };

  // Déterminer quand afficher la notification
  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      setIsDismissed(false);
    } else if (isOnline && pendingOperations.length === 0) {
      setIsVisible(false);
      setIsDismissed(false);
    } else if (isOnline && pendingOperations.length > 0) {
      setIsVisible(true);
      setIsDismissed(false);
    }
  }, [isOnline, pendingOperations.length]);

  // Masquage automatique
  useEffect(() => {
    if (autoHide && isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed, autoHide, autoHideDelay]);

  // Ne pas afficher si masqué ou en ligne sans opérations en attente
  if (!isVisible || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleSync = async () => {
    try {
      await syncPendingOperations();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  };

  return (
    <Card className={`${positionClasses[position]} ${className} shadow-lg border-2 ${
      !isOnline ? 'border-orange-300 bg-orange-50&apos; : 'border-blue-300 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icône d'état */}
          <div className="flex-shrink-0 mt-0.5">
            {isOnline ? (
              <div className="relative">
                <Wifi className="h-5 w-5 text-blue-600" />
                {isSyncing && (
                  <RefreshCw className="h-3 w-3 text-blue-600 animate-spin absolute -top-1 -right-1" />
                )}
              </div>
            ) : (
              <WifiOff className="h-5 w-5 text-orange-600" />
            )}
          </div>

          {/* Contenu de la notification */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium text-sm ${
                !isOnline ? 'text-orange-900&apos; : 'text-blue-900'
              }`}>
                {!isOnline ? 'Mode hors ligne&apos; : 'Synchronisation disponible'}
              </h4>
              <Badge variant={!isOnline ? "destructive" : "default"} className="text-xs">
                {!isOnline ? 'Hors ligne' : `${pendingOperations.length} en attente`}
              </Badge>
            </div>

            <p className={`text-sm ${
              !isOnline ? 'text-orange-700&apos; : 'text-blue-700'
            }`}>
              {!isOnline
                ? 'Vos modifications sont sauvegardées localement et seront synchronisées au retour de la connexion.'
                : `${pendingOperations.length} modification${pendingOperations.length > 1 ? 's&apos; : ''} en attente de synchronisation.`
              }
            </p>

            {/* Barre de progression pour la synchronisation */}
            {isSyncing && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">Synchronisation en cours...</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex flex-col gap-1">
            {isOnline && pendingOperations.length > 0 && (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin&apos; : ''}`} />
                Sync
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

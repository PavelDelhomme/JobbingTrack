'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/features';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import type { MetricsData, ServiceMetrics } from '@/lib/interfaces';
import { formatBytes } from '@/lib/utils/metricsUtils';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  FileText,
  Gauge,
  History,
  Server,
  TrendingUp,
  Wifi,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Synthèse' },
  { id: 'performance', label: 'Performance' },
  { id: 'network', label: 'Réseau & Fiabilité' },
  { id: 'services', label: 'Services & Logs' },
] as const;

type TabId = typeof TABS[number]['id'];

const toNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercentage = (value?: number, decimals = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

const formatMs = (value?: number | null, decimals = 0) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)} ms`;
};

const formatMb = (value?: number | null, decimals = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)} MB`;
};

const formatLoad = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return value.toFixed(3);
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('fr-FR', { hour12: false });
};

const formatLogTimestamp = (nanoString: string) => {
  const milliseconds = Number(nanoString) / 1_000_000;
  if (!Number.isFinite(milliseconds)) return nanoString;
  return new Date(milliseconds).toLocaleString('fr-FR', { hour12: false });
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedService, setSelectedService] = useState<ServiceMetrics | null>(null);
  const [serviceLogs, setServiceLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadMetrics = async () => {
      try {
        const data = await centralMetricsService.fetchMetrics();
        if (mounted && data) {
          // ✅ FUSIONNER les nouvelles métriques avec les anciennes pour éviter les N/A temporaires
          setMetrics((prev: any) => {
            if (!prev) return data;
            
            return {
              ...prev,
              ...data,
              // Fusionner les sous-objets pour préserver les anciennes valeurs
              system: data.system ? { ...prev.system, ...data.system } : prev.system,
              containers: data.containers ? { ...prev.containers, ...data.containers } : prev.containers,
              network: data.network ? { ...prev.network, ...data.network } : prev.network,
              responseTime: data.responseTime ? { ...prev.responseTime, ...data.responseTime } : prev.responseTime,
              errors: data.errors ? { ...prev.errors, ...data.errors } : prev.errors,
              health: data.health ? { ...prev.health, ...data.health } : prev.health,
              services: data.services ? { ...prev.services, ...data.services } : prev.services,
              servicesList: data.servicesList && data.servicesList.length > 0 ? data.servicesList : prev.servicesList,
            };
          });
        }
      } catch (error) {
        console.error('Erreur chargement métriques:', error);
        // ✅ Ne rien faire en cas d'erreur - garder les anciennes valeurs
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!metrics || metricsHistory.length > 0) {
      return;
    }

    let mounted = true;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await centralMetricsService.getMetricsHistory({ limit: 24 });
        if (mounted && Array.isArray(history)) {
          setMetricsHistory(history);
        }
      } catch (error) {
        console.error('Erreur récupération historique des métriques:', error);
      } finally {
        if (mounted) {
          setLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [metrics, metricsHistory.length]);

  const servicesList = useMemo<ServiceMetrics[]>(() => {
    if (!metrics) {
      console.log('[ANALYTICS] ⚠️ Pas de métriques disponibles');
      return [];
    }
    
    console.log('[ANALYTICS] Métriques reçues:', {
      has_servicesList: !!metrics.servicesList,
      servicesList_length: metrics.servicesList?.length || 0,
      servicesList_isArray: Array.isArray(metrics.servicesList),
      has_services: !!metrics.services,
      services_type: typeof metrics.services,
      services_keys: metrics.services ? Object.keys(metrics.services).length : 0
    });
    
    // ✅ Priorité 1: servicesList direct depuis le backend
    if (Array.isArray(metrics.servicesList) && metrics.servicesList.length > 0) {
      console.log('[ANALYTICS] ✅ Services depuis servicesList:', metrics.servicesList.length);
      return metrics.servicesList;
    }
    
    // ✅ Priorité 2: services object depuis le backend
    if (metrics.services && typeof metrics.services === 'object') {
      const servicesArray = Object.values(metrics.services).filter(s => s && typeof s === 'object');
      console.log('[ANALYTICS] ✅ Services depuis services object:', servicesArray.length);
      if (servicesArray.length > 0) {
        return servicesArray;
      }
    }
    
    console.warn('[ANALYTICS] ⚠️ Aucun service trouvé dans les métriques', metrics);
    return [];
  }, [metrics]);

  const sortedServices = useMemo(() => {
    return [...servicesList].sort(
      (a, b) => toNumber(b.metrics?.cpu?.usage) - toNumber(a.metrics?.cpu?.usage)
    );
  }, [servicesList]);

  const aggregatedStats = useMemo(() => {
    // ✅ Log pour déboguer
    console.log('[ANALYTICS] servicesList:', servicesList.length, servicesList[0]);
    console.log('[ANALYTICS] metrics:', metrics);
    
    // ✅ PRIORITÉ 1: Utiliser les données agrégées du système si disponibles
    const systemCpu = metrics?.system?.cpu?.usage;
    const systemMemoryPercent = metrics?.system?.memory?.usage;
    const systemMemoryUsageMb = metrics?.system?.memory?.usage_mb;
    const systemMemoryLimitMb = metrics?.system?.memory?.limit_mb;
    
    // ✅ PRIORITÉ 2: Utiliser les données des conteneurs JobbingTrack
    const jobbingtrackCpu = metrics?.system?.jobbingtrack?.containers?.cpu?.averagePercent;
    const jobbingtrackMemoryUsed = metrics?.system?.jobbingtrack?.containers?.memory?.used;
    const jobbingtrackMemoryLimit = metrics?.system?.jobbingtrack?.containers?.memory?.limit;
    const jobbingtrackMemoryPercent = metrics?.system?.jobbingtrack?.containers?.memory?.percent;
    
    console.log('[ANALYTICS] Données système:', {
      systemCpu,
      systemMemoryPercent,
      systemMemoryUsageMb,
      systemMemoryLimitMb,
      jobbingtrackCpu,
      jobbingtrackMemoryUsed,
      jobbingtrackMemoryLimit,
      jobbingtrackMemoryPercent
    });
    
    // ✅ PRIORITÉ 3: Calculer depuis les services individuels
    const cpuValues = servicesList.map(service => {
      const cpu = service.metrics?.cpu?.usage || 
                  service.metrics?.cpu?.percentage || 
                  service.cpu?.usage ||
                  0;
      return toNumber(cpu);
    }).filter(v => v > 0);
    
    const calculatedAvgCpu = cpuValues.length
      ? cpuValues.reduce((acc, value) => acc + value, 0) / cpuValues.length
      : 0;

    // ✅ Choisir la meilleure source pour le CPU
    const avgCpu = toNumber(systemCpu) || toNumber(jobbingtrackCpu) || calculatedAvgCpu;
    
    console.log('[ANALYTICS] CPU - system:', systemCpu, 'jobbingtrack:', jobbingtrackCpu, 'calculated:', calculatedAvgCpu, 'final:', avgCpu);

    // ✅ Récupérer la mémoire depuis plusieurs sources possibles
    const memoryUsageValues = servicesList.map(service =>
      toNumber(service.metrics?.memory?.usage ?? service.metrics?.memory?.usageMb ?? 0)
    ).filter(v => v > 0);
    
    const memoryLimitValues = servicesList.map(service =>
      toNumber(service.metrics?.memory?.limit ?? service.metrics?.memory?.limitMb ?? 0)
    ).filter(v => v > 0);
    
    const calculatedMemoryUsage = memoryUsageValues.reduce((acc, value) => acc + value, 0);
    const calculatedMemoryLimit = memoryLimitValues.reduce((acc, value) => acc + value, 0);
    const calculatedMemoryPercent = calculatedMemoryLimit > 0 ? (calculatedMemoryUsage / calculatedMemoryLimit) * 100 : 0;
    
    // ✅ Choisir la meilleure source pour la mémoire
    const totalMemoryUsage = toNumber(systemMemoryUsageMb) || toNumber(jobbingtrackMemoryUsed) || calculatedMemoryUsage;
    const totalMemoryLimit = toNumber(systemMemoryLimitMb) || toNumber(jobbingtrackMemoryLimit) || calculatedMemoryLimit;
    const memoryPercent = toNumber(systemMemoryPercent) || toNumber(jobbingtrackMemoryPercent) || calculatedMemoryPercent;

    console.log('[ANALYTICS] Memory - usage:', totalMemoryUsage, 'limit:', totalMemoryLimit, 'percent:', memoryPercent);

    const networkStats = metrics?.network;
    const totalNetworkRxMb = toNumber(networkStats?.total_rx_mb);
    const totalNetworkTxMb = toNumber(networkStats?.total_tx_mb);
    const totalNetworkMb = totalNetworkRxMb + totalNetworkTxMb;

    console.log('[ANALYTICS] Network:', { totalNetworkRxMb, totalNetworkTxMb, totalNetworkMb });

    const responseStats = metrics?.responseTime;
    
    // ✅ PRIORITÉ 1: Utiliser les données de l'API responseTime
    let averageResponse = null;
    let fastestResponse = null;
    let slowestResponse = null;
    let responseSamples = 0;
    
    if (responseStats) {
      averageResponse = typeof responseStats.average_ms === 'number' && responseStats.average_ms > 0 
        ? responseStats.average_ms 
        : (typeof responseStats.average_ms === 'string' ? toNumber(responseStats.average_ms, 0) || null : null);
        
      fastestResponse = typeof responseStats.fastest_ms === 'number' && responseStats.fastest_ms > 0 
        ? responseStats.fastest_ms 
        : (typeof responseStats.fastest_ms === 'string' ? toNumber(responseStats.fastest_ms, 0) || null : null);
        
      slowestResponse = typeof responseStats.slowest_ms === 'number' && responseStats.slowest_ms > 0 
        ? responseStats.slowest_ms 
        : (typeof responseStats.slowest_ms === 'string' ? toNumber(responseStats.slowest_ms, 0) || null : null);
        
      responseSamples = responseStats.per_service?.length || 0;
    }
    
    // ✅ PRIORITÉ 2: Calculer depuis servicesList si pas de données API
    if ((averageResponse === null || averageResponse === 0) && servicesList.length > 0) {
      const responseValues = servicesList
        .filter(service => typeof service.responseTimeMs === 'number' && service.responseTimeMs > 0)
        .map(service => service.responseTimeMs as number);

      if (responseValues.length > 0) {
        averageResponse = responseValues.reduce((acc, value) => acc + value, 0) / responseValues.length;
        fastestResponse = Math.min(...responseValues);
        slowestResponse = Math.max(...responseValues);
        responseSamples = responseValues.length;
      }
    }

    console.log('[ANALYTICS] Response times:', { 
      averageResponse, 
      fastestResponse, 
      slowestResponse, 
      samples: responseSamples,
      from: responseStats ? 'API' : 'calculated',
      api_data: responseStats
    });

    const errorStats = metrics?.errors;
    const totalErrors = toNumber(
      errorStats?.total_last_5m,
      servicesList.reduce((acc, service) => acc + toNumber(service.errorCount5m), 0)
    );
    const errorRate = toNumber(
      errorStats?.rate_per_min,
      servicesList.reduce((acc, service) => acc + toNumber(service.errorRatePerMin), 0)
    );

    const healthStats = metrics?.health;
    const availabilityPercent = toNumber(
      healthStats?.availability_percent,
      servicesList.length
        ? (servicesList.filter(service => service.status === 'healthy').length / servicesList.length) *
            100
        : 0
    );
    const systemAvailability = healthStats?.system_availability_percent ?? null;
    const healthyCount =
      healthStats?.healthy ?? servicesList.filter(service => service.status === 'healthy').length;
    const degradedCount =
      healthStats?.degraded ?? servicesList.filter(service => service.status === 'degraded').length;
    const offlineCount =
      healthStats?.offline ?? servicesList.filter(service => service.status === 'offline').length;

    const overallLoadScore =
      typeof metrics?.overallLoadScore === 'number' && metrics.overallLoadScore > 0
        ? metrics.overallLoadScore
        : (avgCpu / 100 + memoryPercent / 100) / 2;

    console.log('[ANALYTICS] Overall load score:', {
      fromAPI: metrics?.overallLoadScore,
      calculated: (avgCpu / 100 + memoryPercent / 100) / 2,
      final: overallLoadScore,
      avgCpu,
      memoryPercent
    });

    const result = {
      avgCpu,
      totalMemoryUsage,
      totalMemoryLimit,
      memoryPercent,
      totalNetworkRxMb,
      totalNetworkTxMb,
      totalNetworkMb,
      averageResponse,
      fastestResponse,
      slowestResponse,
      totalErrors,
      errorRate,
      availabilityPercent,
      systemAvailability,
      healthyCount,
      degradedCount,
      offlineCount,
      overallLoadScore,
      responseSamples,
    };

    console.log('[ANALYTICS] ===== AGGREGATED STATS =====', result);

    return result;
  }, [metrics, servicesList]);

  const historyRows = useMemo(() => {
    return metricsHistory.map(entry => ({
      timestamp: entry.timestamp || entry.unix_timestamp,
      cpu: toNumber(entry.cpu_percent ?? entry.cpu?.totalPercent ?? entry.cpu),
      memory: toNumber(entry.memory_percent ?? entry.memory?.percent ?? entry.memory),
      networkRx: toNumber(entry.network?.total_rx_mb),
      networkTx: toNumber(entry.network?.total_tx_mb),
      availability: toNumber(entry.health?.availability_percent),
    }));
  }, [metricsHistory]);

  const handleViewLogs = async (service: ServiceMetrics) => {
    if (!service) return;
    const containerName = service.rawName || service.id || service.name;

    setSelectedService(service);
    setLoadingLogs(true);
    setLogsError(null);
    setServiceLogs([]);

    try {
      // ✅ NOUVEAU : Utiliser le service de persistance pour récupérer les logs
      const analyticsService = await import('@/lib/api/analytics.service').then(m => m.analyticsService);
      
      // Essayer d'abord les logs depuis Docker (temps réel)
      let logs = await analyticsService.getContainerLogsLive(containerName, {
        tail: 200,
      });

      // Si pas de logs en direct, essayer depuis la base de données
      if (!logs || logs.length === 0) {
        logs = await analyticsService.getContainerLogs(containerName, {
          limit: 200,
        });
      }

      if (logs && logs.length > 0) {
        const parsed = logs.map((log: any) => ({
          timestamp: log.timestamp,
          message: log.log || log.message,
          stream: log.stream || 'stdout',
          level: log.parsedLevel || null,
        }));

        parsed.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setServiceLogs(parsed);
      } else {
        // Fallback vers l'ancienne méthode
        const logsResponse = await centralMetricsService.getAggregatorLogs(containerName, {
          limit: 200,
        });

        if (logsResponse?.logs && Array.isArray(logsResponse.logs)) {
          const parsed = logsResponse.logs.flatMap((stream: any) =>
            (stream.values || []).map((value: [string, string]) => ({
              timestamp: value[0],
              message: value[1],
            }))
          );

          if (parsed.length === 0) {
            setLogsError('Aucun log disponible pour cette période.');
          } else {
            parsed.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
            setServiceLogs(parsed);
          }
        } else {
          setLogsError('Aucun log disponible pour cette période.');
        }
      }
    } catch (error) {
      console.error(`Erreur chargement logs pour ${containerName}:`, error);
      setLogsError('Impossible de récupérer les logs du conteneur.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCloseLogs = () => {
    setSelectedService(null);
    setServiceLogs([]);
    setLogsError(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!metrics) {
    return (
      <AdminLayout>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Aucune donnée de métriques disponible
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Le service d'agrégation n'a retourné aucune donnée exploitable.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const systemMetrics = metrics.system || {};
  const lastUpdated = metrics.timestamp ? formatTimestamp(metrics.timestamp) : 'N/A';
  const totalServices = servicesList.length;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/40">
                <Gauge className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Charge globale
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatLoad(aggregatedStats.overallLoadScore)}
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">CPU + Mémoire</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"
              style={{
                width: `${Math.min(aggregatedStats.overallLoadScore * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                CPU moyen des services
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatPercentage(aggregatedStats.avgCpu)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {servicesList.length} services analysés
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Mémoire utilisée
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatBytes(aggregatedStats.totalMemoryUsage * 1024 * 1024)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatPercentage(aggregatedStats.memoryPercent)} de la capacité allouée
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Temps de réponse moyen
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMs(aggregatedStats.averageResponse)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {aggregatedStats.responseSamples} mesures disponibles
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-sky-100 p-3 dark:bg-sky-900/40">
              <Wifi className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Trafic réseau agrégé
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMb(aggregatedStats.totalNetworkMb)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                RX {formatMb(aggregatedStats.totalNetworkRxMb)} • TX {formatMb(aggregatedStats.totalNetworkTxMb)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-100 p-3 dark:bg-rose-900/40">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Taux d'erreur global
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {aggregatedStats.totalErrors.toFixed(2)} erreurs / 5 min
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {aggregatedStats.errorRate.toFixed(2)} erreurs / min
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Informations Docker
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {systemMetrics?.server_version || 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Système</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {systemMetrics?.operating_system || 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Architecture</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {systemMetrics?.architecture || 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">CPU disponibles</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {systemMetrics?.cpu?.cores || 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Mémoire totale</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {systemMetrics?.memory?.total || 'N/A'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Disponibilité & santé
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
              <p className="text-xs uppercase tracking-wide">Disponibilité stack</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatPercentage(aggregatedStats.availabilityPercent)}
              </p>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70">
                Système: {systemMetrics?.availability?.system ?
                  formatPercentage(systemMetrics.availability.system) : 'N/A'}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-300">
              <p className="text-xs uppercase tracking-wide">État des services</p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{aggregatedStats.healthyCount}</span> sains •{' '}
                <span className="font-semibold">{aggregatedStats.degradedCount}</span> dégradés •{' '}
                <span className="font-semibold">{aggregatedStats.offlineCount}</span> hors ligne
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Dernière mise à jour : {lastUpdated}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performance par service
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {sortedServices.length} services surveillés
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {sortedServices.map(service => {
            const cpuUsage = toNumber(service.metrics?.cpu?.usage);
            const memoryPercent = toNumber(service.metrics?.memory?.percentage);
            const responseTime = service.responseTimeMs ?? null;
            const errorRate = service.errorRatePerMin ?? 0;
            const networkRx = service.metrics?.network?.rx_mb ?? service.networkMb?.rx ?? 0;
            const networkTx = service.metrics?.network?.tx_mb ?? service.networkMb?.tx ?? 0;

            return (
              <div
                key={service.rawName || service.id || service.name}
                className="rounded-lg border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/60"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {service.displayName || service.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {service.rawName || service.name}
                    </p>
                  </div>
                  <span
                    className={`self-start rounded-full px-3 py-1 text-xs font-medium md:self-center ${
                      service.status === 'healthy' || service.status === 'running'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : service.status === 'degraded'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    }`}
                  >
                    {service.status || 'unknown'}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>CPU</span>
                      <span>{formatPercentage(cpuUsage)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          cpuUsage > 80
                            ? 'bg-rose-500'
                            : cpuUsage > 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(cpuUsage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Mémoire</span>
                      <span>{formatPercentage(memoryPercent)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          memoryPercent > 80
                            ? 'bg-rose-500'
                            : memoryPercent > 60
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(memoryPercent, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(toNumber(service.metrics?.memory?.usageMb) * 1024 * 1024)} /{' '}
                      {formatBytes(toNumber(service.metrics?.memory?.limitMb) * 1024 * 1024)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Temps de réponse
                    </p>
                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatMs(responseTime)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Erreurs : {service.errorCount5m ?? 0} (5 min)
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Trafic réseau
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      RX {formatMb(networkRx)} • TX {formatMb(networkTx)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Taux d'erreur : {errorRate.toFixed(2)}/min
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Processus
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      PID actifs : {service.pids ?? 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Port : {service.port ?? 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Historique récent
            </h2>
          </div>
          {loadingHistory && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              Chargement...
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Horodatage</th>
                <th className="px-4 py-2 text-right">CPU %</th>
                <th className="px-4 py-2 text-right">Mémoire %</th>
                <th className="px-4 py-2 text-right">Réseau RX (MB)</th>
                <th className="px-4 py-2 text-right">Réseau TX (MB)</th>
                <th className="px-4 py-2 text-right">Disponibilité %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {historyRows.slice(0, 12).map((row, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                    {formatTimestamp(String(row.timestamp))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {formatPercentage(row.cpu)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {formatPercentage(row.memory)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {formatMb(row.networkRx)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {formatMb(row.networkTx)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {row.availability ? formatPercentage(row.availability) : 'N/A'}
                  </td>
                </tr>
              ))}
              {historyRows.length === 0 && !loadingHistory && (
                <tr>
                  <td
                    className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={6}
                  >
                    Aucun historique disponible pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderNetwork = () => {
    const perServiceNetwork = metrics.network?.per_service
      ? metrics.network.per_service
      : servicesList.map(service => ({
          name: service.rawName || service.name,
          rx_mb: service.metrics?.network?.rx_mb ?? service.networkMb?.rx ?? 0,
          tx_mb: service.metrics?.network?.tx_mb ?? service.networkMb?.tx ?? 0,
        }));

    const perServiceErrors = metrics.errors?.per_service
      ? metrics.errors.per_service
      : servicesList.map(service => ({
          name: service.rawName || service.name,
          count_last_5m: service.errorCount5m ?? 0,
          rate_per_min: service.errorRatePerMin ?? 0,
        }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Trafic RX total
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMb(aggregatedStats.totalNetworkRxMb)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Depuis la dernière collecte</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Trafic TX total
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMb(aggregatedStats.totalNetworkTxMb)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Depuis la dernière collecte</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Erreurs dans les 5 dernières minutes
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {aggregatedStats.totalErrors.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {aggregatedStats.errorRate.toFixed(2)} erreurs / min
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Disponibilité système
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPercentage(
                aggregatedStats.systemAvailability ?? aggregatedStats.availabilityPercent
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Services: {aggregatedStats.healthyCount} sains • {aggregatedStats.degradedCount} dégradés •{' '}
              {aggregatedStats.offlineCount} hors ligne
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Trafic réseau par service
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Service</th>
                  <th className="px-4 py-2 text-right">RX (MB)</th>
                  <th className="px-4 py-2 text-right">TX (MB)</th>
                  <th className="px-4 py-2 text-right">Total (MB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {perServiceNetwork.map((item: any) => {
                  const rx = toNumber(item.rx_mb);
                  const tx = toNumber(item.tx_mb);
                  return (
                    <tr key={item.name}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                        {formatMb(rx)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                        {formatMb(tx)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                        {formatMb(rx + tx)}
                      </td>
                    </tr>
                  );
                })}
                {perServiceNetwork.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
                      colSpan={4}
                    >
                      Aucune donnée réseau disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Erreurs observées par service
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Service</th>
                  <th className="px-4 py-2 text-right">Erreurs (5 min)</th>
                  <th className="px-4 py-2 text-right">Taux / min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {perServiceErrors.map((item: any) => (
                  <tr key={item.name}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.name}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {toNumber(item.count_last_5m).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {toNumber(item.rate_per_min).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {perServiceErrors.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
                      colSpan={3}
                    >
                      Aucune erreur récente détectée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderServices = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Inventaire des services
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalServices} services détectés
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">CPU</th>
                <th className="px-4 py-2 text-right">Mémoire</th>
                <th className="px-4 py-2 text-right">Temps de réponse</th>
                <th className="px-4 py-2 text-right">Erreurs/min</th>
                <th className="px-4 py-2 text-right">Réseau</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedServices.map(service => {
                const key = service.rawName || service.id || service.name;
                const cpuUsage = toNumber(service.metrics?.cpu?.usage);
                const memoryPercent = toNumber(service.metrics?.memory?.percentage);
                const responseTime = service.responseTimeMs ?? null;
                const errorRate = service.errorRatePerMin ?? 0;
                const networkRx = service.metrics?.network?.rx_mb ?? service.networkMb?.rx ?? 0;
                const networkTx = service.metrics?.network?.tx_mb ?? service.networkMb?.tx ?? 0;

                return (
                  <tr key={key}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex flex-col">
                        <span>{service.displayName || service.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {service.rawName || service.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          service.status === 'healthy' || service.status === 'running'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : service.status === 'degraded'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}
                      >
                        {service.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatPercentage(cpuUsage)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatPercentage(memoryPercent)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatMs(responseTime)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {errorRate.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      RX {formatMb(networkRx)} • TX {formatMb(networkTx)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewLogs(service)}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <FileText className="h-4 w-4" />
                        Voir logs
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedServices.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={8}
                  >
                    Aucun service n'a été détecté.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedService && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Logs récents — {selectedService.displayName || selectedService.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conteneur : {selectedService.rawName || selectedService.name}
              </p>
            </div>
            <button
              onClick={handleCloseLogs}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Fermer
            </button>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-gray-100">
            {loadingLogs && (
              <div className="flex items-center gap-3 text-gray-300">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                Lecture des logs...
              </div>
            )}

            {!loadingLogs && logsError && (
              <div className="text-rose-300">{logsError}</div>
            )}

            {!loadingLogs && !logsError && serviceLogs.length === 0 && (
              <div className="text-gray-300">Aucun log disponible sur la période demandée.</div>
            )}

            {!loadingLogs && !logsError && serviceLogs.length > 0 && (
              <ul className="space-y-2">
                {serviceLogs.slice(0, 200).map((log, index) => (
                  <li key={`${log.timestamp}-${index}`} className="flex gap-4">
                    <span className="text-blue-300">{formatLogTimestamp(log.timestamp)}</span>
                    <span className="flex-1 whitespace-pre-wrap text-gray-100">{log.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'performance':
        return renderPerformance();
      case 'network':
        return renderNetwork();
      case 'services':
        return renderServices();
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Analytics & Monitoring
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Analyse approfondie des services JobbingTrack en temps réel.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-gray-500 dark:text-gray-400 md:items-end">
            <span>
              Services actifs :{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {aggregatedStats.healthyCount}
              </span>
              /{totalServices}
            </span>
            <span>Dernière mise à jour : {lastUpdated}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderActiveTab()}
      </div>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/features';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import preferencesService from '@/lib/services/preferencesService';
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
  Network,
  Cpu,
  MemoryStick,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

const TABS = [
  { id: 'overview', label: 'Synthèse' },
  { id: 'system', label: 'Système' },
  { id: 'performance', label: 'Performance' },
  { id: 'network', label: 'Réseau & Fiabilité' },
  { id: 'services', label: 'Services & Logs' },
  { id: 'logs', label: 'Erreurs Récentes' },
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

const formatTimestamp = (timestamp: string, timeRange: string = '24h') => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  
  if (timeRange === '1h' || timeRange === '6h') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (timeRange === '24h') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit' });
  }
};

const formatLogTimestamp = (nanoString: string) => {
  const milliseconds = Number(nanoString) / 1_000_000;
  if (!Number.isFinite(milliseconds)) return nanoString;
  return new Date(milliseconds).toLocaleString('fr-FR', { hour12: false });
};

// Couleurs pour les graphiques
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  success: '#22C55E',
  purple: '#A855F7',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#6366F1',
  orange: '#FB923C'
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastHistoryTimestamp, setLastHistoryTimestamp] = useState<number | null>(null);
  const [initialHistoryLoaded, setInitialHistoryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedService, setSelectedService] = useState<ServiceMetrics | null>(null);
  const [serviceLogs, setServiceLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [aggregatedLogs, setAggregatedLogs] = useState<any[]>([]);
  const [loadingAggregatedLogs, setLoadingAggregatedLogs] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [analyticsRefreshInterval, setAnalyticsRefreshInterval] = useState(10000);
  const [metricsRefreshInterval, setMetricsRefreshInterval] = useState(15000);

  // Charger les préférences de rafraîchissement
  useEffect(() => {
    const loadRefreshIntervals = async () => {
      try {
        const analyticsInterval = await preferencesService.getRefreshInterval('analytics');
        const metricsInterval = await preferencesService.getRefreshInterval('metrics');
        setAnalyticsRefreshInterval(analyticsInterval);
        setMetricsRefreshInterval(metricsInterval);
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
      }
    };
    loadRefreshIntervals();
  }, []);

  // Conversion du time range en millisecondes
  const getTimeRangeMs = () => {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange];
  };

  // Charger les dernières données depuis l'historique pour affichage immédiat
  const loadLastKnownMetrics = async () => {
    try {
      const history = await centralMetricsService.getMetricsHistory({ limit: 1 });
      if (history && history.length > 0) {
        const lastMetric = history[0];
        
        // Convertir les données de l'historique en format MetricsData
        const historicalMetrics: MetricsData = {
          system: {
            cpu: { 
              usage: lastMetric.cpu_percent ? `${lastMetric.cpu_percent.toFixed(1)}%` : 'N/A',
              cores: 'N/A',
              model: 'N/A'
            },
            memory: { 
              total: 'N/A',
              used: 'N/A',
              free: 'N/A',
              usage: lastMetric.memory_percent ? `${lastMetric.memory_percent.toFixed(1)}%` : 'N/A'
            },
            load: { average: 'N/A', cores: 'N/A' },
            disk: []
          },
          containers: {},
          services: {},
          timestamp: lastMetric.timestamp || new Date().toISOString(),
          network: lastMetric.network_rx_mb || lastMetric.network_tx_mb ? {
            totalRxMb: lastMetric.network_rx_mb || 0,
            totalTxMb: lastMetric.network_tx_mb || 0,
            totalMb: (lastMetric.network_rx_mb || 0) + (lastMetric.network_tx_mb || 0)
          } : undefined,
          responseTime: lastMetric.response_time_avg ? {
            avg: lastMetric.response_time_avg
          } : undefined,
          errors: lastMetric.error_rate ? {
            rate: lastMetric.error_rate
          } : undefined,
          health: lastMetric.availability_percent ? {
            availability_percent: lastMetric.availability_percent
          } : undefined
        };
        
        setMetrics(historicalMetrics);
        console.log('[ANALYTICS] ✅ Dernières données connues chargées depuis l\'historique');
      }
    } catch (error) {
      console.error('[ANALYTICS] ⚠️ Erreur chargement dernières données:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeMetrics = async () => {
      // 1. Charger d'abord les dernières données disponibles
      if (!initialLoadDone) {
        await loadLastKnownMetrics();
        setInitialLoadDone(true);
      }
      
      // 2. Ensuite charger les données fraîches
      try {
        const data = await centralMetricsService.fetchMetrics();
        if (mounted && data) {
          setMetrics((prev: any) => {
            if (!prev) return data;
            
            // Ne mettre à jour que si on a de nouvelles données valides
            return {
              ...prev,
              ...data,
              system: data.system ? { ...prev.system, ...data.system } : prev.system,
              containers: data.containers ? { ...prev.containers, ...data.containers } : prev.containers,
              network: data.network ? { ...prev.network, ...data.network } : prev.network,
              responseTime: data.responseTime ? { ...prev.responseTime, ...data.responseTime } : prev.responseTime,
              errors: data.errors ? { ...prev.errors, ...data.errors } : prev.errors,
              health: data.health ? { ...prev.health, ...data.health } : prev.health,
              services: data.services ? { ...prev.services, ...data.services } : prev.services,
              servicesList: data.servicesList ? data.servicesList : prev.servicesList
            };
          });
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur chargement métriques:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeMetrics();
    const interval = setInterval(async () => {
      // Lors des actualisations suivantes, ne pas recharger l'historique
      try {
        const data = await centralMetricsService.fetchMetrics();
        if (mounted && data) {
          setMetrics((prev: any) => {
            if (!prev) return data;
            
            return {
              ...prev,
              ...data,
              system: data.system ? { ...prev.system, ...data.system } : prev.system,
              containers: data.containers ? { ...prev.containers, ...data.containers } : prev.containers,
              network: data.network ? { ...prev.network, ...data.network } : prev.network,
              responseTime: data.responseTime ? { ...prev.responseTime, ...data.responseTime } : prev.responseTime,
              errors: data.errors ? { ...prev.errors, ...data.errors } : prev.errors,
              health: data.health ? { ...prev.health, ...data.health } : prev.health,
              services: data.services ? { ...prev.services, ...data.services } : prev.services,
              servicesList: data.servicesList ? data.servicesList : prev.servicesList
            };
          });
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur actualisation métriques:', error);
      }
    }, analyticsRefreshInterval); // ⚡ Rafraîchir selon les préférences utilisateur

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [analyticsRefreshInterval]);

  // Charger l'historique des métriques (chargement initial complet, puis incrémental)
  useEffect(() => {
    let mounted = true;

    const loadHistory = async (isInitialLoad: boolean = false) => {
      try {
        setLoadingHistory(true);
        const timeRangeMs = getTimeRangeMs();
        const endTime = Date.now();
        const startTime = endTime - timeRangeMs;

        // Si c'est le chargement initial ou si le timeRange a changé, charger tout l'historique
        if (isInitialLoad || !initialHistoryLoaded || !lastHistoryTimestamp) {
          const history = await centralMetricsService.getMetricsHistory({
            limit: 1000,
            startTime,
            endTime
          });

          if (mounted && history && Array.isArray(history) && history.length > 0) {
            // Trier par timestamp et stocker le dernier timestamp
            const sortedHistory = [...history].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            setMetricsHistory(sortedHistory);
            
            // Stocker le dernier timestamp pour les chargements incrémentaux
            const lastTimestamp = new Date(sortedHistory[sortedHistory.length - 1].timestamp).getTime();
            setLastHistoryTimestamp(lastTimestamp);
            setInitialHistoryLoaded(true);
          }
        } else {
          // Chargement incrémental : seulement les nouvelles données depuis le dernier timestamp
          const incrementalHistory = await centralMetricsService.getMetricsHistory({
            limit: 100, // Limiter à 100 nouvelles entrées max
            startTime: lastHistoryTimestamp! + 1, // +1 pour éviter les doublons
            endTime
          });

          if (mounted && incrementalHistory && Array.isArray(incrementalHistory) && incrementalHistory.length > 0) {
            // Fusionner avec l'historique existant et trier
            setMetricsHistory(prev => {
              const merged = [...prev, ...incrementalHistory];
              // Trier par timestamp
              const sorted = merged.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              
              // Limiter à 1000 points max pour éviter la surcharge mémoire
              // Garder les points les plus récents
              const limited = sorted.slice(-1000);
              
              // Mettre à jour le dernier timestamp
              const lastTimestamp = new Date(limited[limited.length - 1].timestamp).getTime();
              setLastHistoryTimestamp(lastTimestamp);
              
              return limited;
            });
          }
        }
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    // Chargement initial complet
    loadHistory(true);
    
    // Ensuite, chargement incrémental périodique
    const interval = setInterval(() => {
      loadHistory(false);
    }, metricsRefreshInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [timeRange, metricsRefreshInterval, initialHistoryLoaded, lastHistoryTimestamp]);

  // Charger les logs agrégés (erreurs récentes)
  const loadAggregatedLogs = async () => {
    setLoadingAggregatedLogs(true);
    try {
      const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const response = await fetch(`${METRICS_URL}/api/v1/persistence/logs?limit=100&level=ERROR`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAggregatedLogs(data.data);
        } else {
          setAggregatedLogs([]);
        }
      } else {
        setAggregatedLogs([]);
      }
    } catch (error) {
      console.error('Erreur chargement logs agrégés:', error);
      setAggregatedLogs([]);
    } finally {
      setLoadingAggregatedLogs(false);
    }
  };

  // Charger les logs agrégés au montage et périodiquement
  useEffect(() => {
    loadAggregatedLogs();
    const interval = setInterval(loadAggregatedLogs, 10000); // Toutes les 10 secondes
    return () => clearInterval(interval);
  }, []);

  // Charger les logs d'un service
  const loadServiceLogs = async (service: ServiceMetrics) => {
    setLoadingLogs(true);
    setLogsError(null);
    setSelectedService(service);
    
    try {
      // Extraire le nom du service (sans jobbingtrack-)
      const serviceName = service.rawName?.replace('jobbingtrack-', '') || service.name;
      
      const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const response = await fetch(`${METRICS_URL}/api/v1/logs/${serviceName}?limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs && data.logs.length > 0) {
          setServiceLogs(data.logs);
          setLogsError(null);
        } else if (data.success && data.logs && data.logs.length === 0) {
          setLogsError(data.message || 'Aucun log disponible pour ce service');
          setServiceLogs([]);
        } else {
          // Service non disponible ou erreur
          setLogsError(data.error || data.message || 'Service non disponible ou non démarré');
          setServiceLogs([]);
        }
      } else {
        setLogsError(`Erreur ${response.status}: Impossible de récupérer les logs`);
        setServiceLogs([]);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      setLogsError('Erreur de connexion au service de monitoring (port 8014). Vérifiez que le metrics-aggregator est démarré.');
      setServiceLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Préparer les données pour les graphiques (avec limitation pour éviter la surcharge)
  const chartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) return [];
    
    // ✅ Trier par timestamp croissant (plus ancien à gauche, plus récent à droite)
    const sortedHistory = [...metricsHistory].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Limiter le nombre de points selon la plage de temps pour optimiser les performances
    // Plus la plage est grande, plus on peut avoir de points, mais avec une limite max
    const maxPoints = timeRange === '1h' ? 60 : 
                      timeRange === '6h' ? 180 : 
                      timeRange === '24h' ? 288 : 
                      timeRange === '7d' ? 336 : 720; // 30d
    
    // Si on a trop de points, on les sous-échantillonne intelligemment
    let dataToUse = sortedHistory;
    if (sortedHistory.length > maxPoints) {
      // Prendre un point tous les N points pour garder une représentation équilibrée
      const step = Math.ceil(sortedHistory.length / maxPoints);
      dataToUse = sortedHistory.filter((_, index) => index % step === 0 || index === sortedHistory.length - 1);
    }
    
    return dataToUse.map((item: any) => ({
      time: formatTimestamp(item.timestamp, timeRange),
      cpu: toNumber(item.cpu_percent, 0),
      memory: toNumber(item.memory_percent, 0),
      networkRx: toNumber(item.network_rx_mb, 0),
      networkTx: toNumber(item.network_tx_mb, 0),
      responseTime: toNumber(item.response_time_avg, 0),
      errorRate: toNumber(item.error_rate, 0),
      availability: toNumber(item.availability_percent, 100),
      loadScore: toNumber(item.load_score, 0)
    }));
  }, [metricsHistory, timeRange]);

  // Calculer les statistiques agrégées
  const aggregatedStats = useMemo(() => {
    // Retourner des valeurs par défaut (null) si pas de données, au lieu d'un objet vide
    if (!metrics) return {
      servicesTotal: 0,
      servicesHealthy: 0,
      servicesDegraded: 0,
      servicesOffline: 0,
      avgCpuUsage: null,
      totalMemoryMb: null,
      totalNetworkRxMb: null,
      totalNetworkTxMb: null,
      totalNetworkMb: null,
      avgResponseTime: null,
      totalErrors: 0,
      avgErrorRate: null
    };

    const servicesList = metrics.servicesList || Object.values(metrics.services || {});

    // ✅ Utiliser les données des conteneurs JobbingTrack (source fiable)
    let avgCpuUsage = null;
    let totalMemoryMb = null;
    
    // Priorité 1: Données conteneurs JobbingTrack (la plus fiable)
    if (metrics.jobbingtrack?.containers?.cpu?.averagePercent !== undefined) {
      avgCpuUsage = metrics.jobbingtrack.containers.cpu.averagePercent;
    }
    
    if (metrics.jobbingtrack?.containers?.memory?.used !== undefined) {
      totalMemoryMb = metrics.jobbingtrack.containers.memory.used;
    }

    // Priorité 2: Données système globales (si conteneurs non disponibles)
    if (avgCpuUsage === null && metrics.system?.cpu?.usage && metrics.system.cpu.usage !== 'N/A') {
      const cpuStr = metrics.system.cpu.usage.toString().replace('%', '');
      const cpuNum = parseFloat(cpuStr);
      if (!isNaN(cpuNum)) {
        avgCpuUsage = cpuNum;
      }
    }
    
    if (totalMemoryMb === null && metrics.system?.memory?.used && metrics.system.memory.used !== 'N/A') {
      const memoryStr = metrics.system.memory.used.toString().replace(/[^0-9.]/g, '');
      const memoryNum = parseFloat(memoryStr);
      if (!isNaN(memoryNum)) {
        totalMemoryMb = memoryNum;
      }
    }

    // Priorité 3: Calculer depuis les services (dernier recours)
    if (avgCpuUsage === null && servicesList.length > 0) {
      const totalCpuUsage = servicesList.reduce((sum, s: any) => 
        sum + toNumber(s.metrics?.cpu?.percentage, 0), 0);
      avgCpuUsage = totalCpuUsage / servicesList.length;
    }

    if (totalMemoryMb === null && servicesList.length > 0) {
      totalMemoryMb = servicesList.reduce((sum, s: any) => 
        sum + toNumber(s.metrics?.memory?.usageMb, 0), 0);
    }

    const totalNetworkRxMb = metrics.network?.totalRxMb !== undefined 
      ? metrics.network.totalRxMb
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.rx_mb, 0), 0);
      
    const totalNetworkTxMb = metrics.network?.totalTxMb !== undefined
      ? metrics.network.totalTxMb
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.tx_mb, 0), 0);
      
    const totalNetworkMb = totalNetworkRxMb + totalNetworkTxMb;

    const healthyCount = servicesList.filter((s: any) => s.status === 'healthy').length;
    const degradedCount = servicesList.filter((s: any) => s.status === 'degraded').length;
    const offlineCount = servicesList.filter((s: any) => 
      s.status === 'offline' || s.status === 'unknown').length;

    const responseTimes = servicesList
      .map((s: any) => s.responseTimeMs)
      .filter((rt): rt is number => typeof rt === 'number' && rt > 0);
    let avgResponseTime = metrics.responseTime?.avg || null;
    
    if (avgResponseTime === null && responseTimes.length > 0) {
      avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    }

    const totalErrors = servicesList.reduce((sum, s: any) => 
      sum + toNumber(s.errorCount5m, 0), 0);
    const avgErrorRate = metrics.errors?.rate !== undefined
      ? metrics.errors.rate
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.errorRatePerMin, 0), 0);

    return {
      servicesTotal: servicesList.length,
      servicesHealthy: healthyCount,
      servicesDegraded: degradedCount,
      servicesOffline: offlineCount,
      avgCpuUsage,
      totalMemoryMb,
      totalNetworkRxMb,
      totalNetworkTxMb,
      totalNetworkMb,
      avgResponseTime,
      totalErrors,
      avgErrorRate
    };
  }, [metrics]);

  if (loading && !metrics) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const servicesList = metrics?.servicesList || Object.values(metrics?.services || {});

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                ⚡ Performances & Analytics
              </h1>
              {/* Indicateur de mise à jour en temps réel */}
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
              </div>
            </div>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Monitoring complet des performances système et services • Actualisation toutes les 10s
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Dernière heure</option>
            <option value="6h">6 heures</option>
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <OverviewTab 
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            loadingHistory={loadingHistory}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            loadingHistory={loadingHistory}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            servicesList={servicesList}
            loadingHistory={loadingHistory}
          />
        )}

        {activeTab === 'network' && (
          <NetworkTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            servicesList={servicesList}
            loadingHistory={loadingHistory}
          />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            servicesList={servicesList}
            selectedService={selectedService}
            serviceLogs={serviceLogs}
            loadingLogs={loadingLogs}
            logsError={logsError}
            onSelectService={loadServiceLogs}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logs={aggregatedLogs}
            loading={loadingAggregatedLogs}
            onRefresh={loadAggregatedLogs}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Composant Overview Tab
function OverviewTab({ metrics, chartData, aggregatedStats, loadingHistory }: any) {
  // Calculer les tendances depuis l'historique
  const last30Points = chartData.slice(-30)
  const cpuTrend = last30Points.length > 0 
    ? aggregatedStats.avgCpuUsage - (last30Points.reduce((sum: number, d: any) => sum + d.cpu, 0) / last30Points.length)
    : 0
  const memoryTrend = last30Points.length > 0
    ? aggregatedStats.totalMemoryMb - (last30Points.reduce((sum: number, d: any) => sum + d.memory, 0) / last30Points.length)
    : 0
  const responseTimeTrend = last30Points.length > 0
    ? aggregatedStats.avgResponseTime - (last30Points.reduce((sum: number, d: any) => sum + d.responseTime, 0) / last30Points.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          title="Services"
          value={aggregatedStats.servicesTotal || 0}
          subtitle={`${aggregatedStats.servicesHealthy || 0} sains`}
          color="blue"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          title="CPU Moyen"
          value={aggregatedStats.avgCpuUsage !== null ? `${aggregatedStats.avgCpuUsage.toFixed(1)}%` : '...'}
          trend={cpuTrend}
          trendType="positive-is-bad"
          color="purple"
          loading={aggregatedStats.avgCpuUsage === null}
        />
        <StatCard
          icon={<MemoryStick className="w-6 h-6" />}
          title="Mémoire Totale"
          value={aggregatedStats.totalMemoryMb !== null ? formatMb(aggregatedStats.totalMemoryMb) : '...'}
          trend={memoryTrend}
          trendType="positive-is-bad"
          color="green"
          loading={aggregatedStats.totalMemoryMb === null}
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          trend={responseTimeTrend}
          trendType="positive-is-bad"
          color="orange"
          loading={aggregatedStats.avgResponseTime === null}
        />
      </div>

      {/* Graphiques principaux */}
      {chartData.length > 0 && !loadingHistory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU & Mémoire */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU & Mémoire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  name="CPU (%)"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={COLORS.secondary} 
                  strokeWidth={2}
                  name="Mémoire (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Réseau */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🌐 Trafic Réseau
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stackId="1"
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.6}
                  name="RX (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stackId="1"
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="TX (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse & Erreurs
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.purple} 
                  strokeWidth={2}
                  name="Temps réponse (ms)"
                  dot={false}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="errorRate" 
                  fill={COLORS.danger}
                  name="Taux d'erreur (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Disponibilité */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Disponibilité
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[90, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="availability" 
                  stroke={COLORS.success} 
                  strokeWidth={3}
                  name="Disponibilité (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loadingHistory && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chargement de l'historique...</p>
        </div>
      )}
    </div>
  );
}

// Composant Performance Tab
function PerformanceTab({ metrics, chartData, aggregatedStats, servicesList, loadingHistory }: any) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'responseTime' | 'errorRate'>('cpu');

  return (
    <div className="space-y-6">
      {/* Métriques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          color="purple"
          loading={aggregatedStats.avgResponseTime === null}
        />

        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Erreurs (5 min)"
          value={aggregatedStats.totalErrors || 0}
          color="orange"
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Taux Erreur"
          value={aggregatedStats.avgErrorRate !== null ? `${aggregatedStats.avgErrorRate.toFixed(2)}/min` : '...'}
          color="orange"
          loading={aggregatedStats.avgErrorRate === null}
        />

        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Moyen Total"
          value={aggregatedStats.avgCpuUsage !== null ? `${Math.min(aggregatedStats.avgCpuUsage, 100).toFixed(1)}%` : '...'}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null}
        />
      </div>

      {/* Graphiques de performance avec navigation temporelle */}
      {chartData.length > 0 && !loadingHistory && (
        <div className="space-y-6">
          {/* CPU Moyen Total dans le temps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU Moyen Total - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  name="CPU Moyen (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Graphique temporel des performances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📈 Évolution des Performances
            </h3>
            {chartData.length > 0 && chartData.some((d: any) => d.responseTime > 0 || d.cpu > 0 || d.memory > 0) ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Temps réponse (ms)') {
                        return [value > 0 ? `${value.toFixed(0)} ms` : 'N/A', name];
                      }
                      return [value > 0 ? `${value.toFixed(1)}%` : 'N/A', name];
                    }}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cpu" 
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                    name="CPU (%)"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="memory" 
                    stroke={COLORS.secondary}
                    fill={COLORS.secondary}
                    fillOpacity={0.3}
                    name="Mémoire (%)"
                  />
                  {chartData.some((d: any) => d.responseTime > 0) && (
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke={COLORS.purple}
                      strokeWidth={2}
                      name="Temps réponse (ms)"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chargement des données de performance...</p>
                <p className="text-xs mt-2">Les données apparaîtront ici une fois collectées</p>
              </div>
            )}
          </div>
          {/* CPU par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                💻 CPU par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                  data={servicesList
                    .map((s: any) => ({ 
                      name: s.displayName || s.name,
                      cpu: Math.min(toNumber(s.metrics?.cpu?.percentage, 0), 100) // Limiter à 100%
                }))
                    .filter((item: any) => item.cpu > 0)} // Filtrer après le map
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'CPU']}
                />
                <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée CPU disponible pour les services</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Temps de réponse - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse Moyen - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.purple} 
                  strokeWidth={3}
                  name="Temps Réponse (ms)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Temps de réponse par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚡ Temps de Réponse par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => ({ 
                      name: s.displayName || s.name,
                    responseTime: s.responseTimeMs || 0
                  }))
                  .filter((item: any) => item.responseTime > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(0)} ms`, 'Temps Réponse']}
                />
                <Bar dataKey="responseTime" fill={COLORS.purple} name="Temps (ms)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de temps de réponse disponible</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Mémoire par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Mémoire par Service
            </h3>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                  data={servicesList
                    .map((s: any) => ({ 
                      name: s.displayName || s.name,
                  memory: toNumber(s.metrics?.memory?.usageMb, 0)
                }))
                    .filter((item: any) => item.memory > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(0)} MB`, 'Mémoire']}
                />
                <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (MB)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <MemoryStick className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de mémoire disponible pour les services</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Taux d'erreur - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Taux d'Erreur - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke={COLORS.danger}
                  fill={COLORS.danger}
                  fillOpacity={0.3}
                  name="Taux d'Erreur (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Taux d'erreur par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚠️ Taux d'Erreur par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 && servicesList.some((s: any) => toNumber(s.errorRatePerMin, 0) > 0) ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => ({ 
                      name: s.displayName || s.name,
                    errorRate: toNumber(s.errorRatePerMin, 0)
                  }))
                  .filter((item: any) => item.errorRate > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(2)} erreurs/min`, 'Taux']}
                />
                <Bar dataKey="errorRate" fill={COLORS.danger} name="Erreurs/min" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune erreur détectée ✅</p>
                <p className="text-sm mt-1 text-green-600 dark:text-green-400">Tous les services fonctionnent correctement</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant Network Tab
function NetworkTab({ metrics, chartData, aggregatedStats, servicesList, loadingHistory }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques réseau */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RX</span>
            <Network className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkRxMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total TX</span>
            <Network className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkTxMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
            <Wifi className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Disponibilité</span>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics?.health?.availability_percent?.toFixed(1) || 'N/A'}%
          </div>
        </div>
      </div>

      {/* Graphiques réseau */}
      {chartData.length > 0 && !loadingHistory && (
        <div className="space-y-6">
          {/* Trafic réseau global */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🌐 Trafic Réseau Global
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stackId="1"
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.6}
                  name="Réception (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stackId="1"
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="Émission (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trafic réseau par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Trafic Réseau par Service
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => {
                    // Essayer plusieurs sources pour les données réseau
                    const rx = toNumber(
                      s.networkMb?.rx || 
                      s.networkMb?.rx_mb || 
                      s.metrics?.network?.rx_mb || 
                      (s.metrics?.network?.rx_bytes ? (s.metrics.network.rx_bytes / 1024 / 1024) : 0), 
                      0
                    )
                    const tx = toNumber(
                      s.networkMb?.tx || 
                      s.networkMb?.tx_mb || 
                      s.metrics?.network?.tx_mb || 
                      (s.metrics?.network?.tx_bytes ? (s.metrics.network.tx_bytes / 1024 / 1024) : 0), 
                      0
                    )
                    return {
                      name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 20),
                      rx: Math.max(0, rx),
                      tx: Math.max(0, tx),
                      total: rx + tx
                    }
                  })
                  .sort((a: any, b: any) => (b.total || 0) - (a.total || 0))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '9px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'RX (MB)' || name === 'TX (MB)') {
                      return [`${value.toFixed(2)} MB`, name]
                    }
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="rx" fill={COLORS.info} name="RX (MB)" />
                <Bar dataKey="tx" fill={COLORS.warning} name="TX (MB)" />
              </BarChart>
            </ResponsiveContainer>
            {servicesList.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun service avec données réseau disponible</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant System Tab
function SystemTab({ metrics, chartData, aggregatedStats, loadingHistory }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques système principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Moyen"
          value={aggregatedStats.avgCpuUsage !== null ? `${Math.min(aggregatedStats.avgCpuUsage, 100).toFixed(1)}%` : '...'}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null}
        />
        <StatCard
          icon={<MemoryStick className="w-5 h-5" />}
          title="Mémoire Moyenne"
          value={aggregatedStats.totalMemoryMb !== null ? `${aggregatedStats.totalMemoryMb.toFixed(0)} MB` : '...'}
          color="green"
          loading={aggregatedStats.totalMemoryMb === null}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          color="purple"
          loading={aggregatedStats.avgResponseTime === null}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          title="Disponibilité"
          value={aggregatedStats.servicesTotal > 0 
            ? `${((aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100).toFixed(1)}%`
            : '...'}
          color="green"
          loading={aggregatedStats.servicesTotal === 0}
        />
      </div>

      {/* Graphiques système */}
      {chartData.length > 0 && !loadingHistory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU détaillé */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 Utilisation CPU
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpuSystem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCpuSystem)"
                  name="CPU (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mémoire détaillée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Utilisation Mémoire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMemorySystem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMemorySystem)"
                  name="Mémoire (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Charge système combinée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Charge Système Globale
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
                <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (%)" />
                <Line 
                  type="monotone" 
                  dataKey="loadScore" 
                  stroke={COLORS.warning}
                  strokeWidth={3}
                  name="Score de charge"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loadingHistory && !initialHistoryLoaded && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement de l'historique...</p>
        </div>
      )}
    </div>
  );
}

// Composant Services Tab
function ServicesTab({ servicesList, selectedService, serviceLogs, loadingLogs, logsError, onSelectService }: any) {
  return (
    <div className="space-y-6">
      {/* Liste des services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicesList.map((service: any) => (
          <div
            key={service.id || service.name}
            onClick={() => onSelectService(service)}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all ${
              selectedService?.name === service.name
                ? 'ring-2 ring-blue-600 dark:ring-blue-400'
                : 'hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {service.displayName || service.name}
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                service.status === 'healthy' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : service.status === 'degraded'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {service.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">CPU</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {toNumber(service.metrics?.cpu?.percentage, 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Mémoire</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatMb(service.metrics?.memory?.usageMb)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Temps réponse</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatMs(service.responseTimeMs)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs du service sélectionné */}
      {selectedService && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📋 Logs: {selectedService.displayName || selectedService.name}
            </h3>
            <button
              onClick={() => onSelectService(selectedService)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              disabled={loadingLogs}
            >
              {loadingLogs ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {loadingLogs && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {logsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{logsError}</p>
            </div>
          )}

          {!loadingLogs && !logsError && serviceLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun log disponible
            </div>
          )}

          {!loadingLogs && serviceLogs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1 font-mono text-xs">
                {serviceLogs.map((log: any, index: number) => (
                  <div 
                    key={index}
                    className={`${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-gray-500' :
                      'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className="ml-2 font-semibold">[{log.level?.toUpperCase() || 'INFO'}]</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant Logs Tab
function LogsTab({ logs, loading, onRefresh }: any) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'text-red-400 bg-red-900/20 border-red-800';
      case 'WARN':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📋 Erreurs Récentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Logs critiques (ERROR, WARN, FATAL) enregistrés depuis tous les services
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : 'Actualiser'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des logs...</p>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            ✅ Aucune erreur récente enregistrée
          </p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-900 text-gray-300 p-2 rounded overflow-x-auto">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                      {log.metadata && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            Métadonnées
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-900 text-gray-300 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant StatCard
function StatCard({ icon, title, value, subtitle, color, loading, trend, trendType = 'negative-is-bad' }: any) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  };

  // Déterminer la couleur de la tendance selon le type
  const getTrendColor = () => {
    if (trend === undefined || trend === null || trend === 0) return 'text-gray-500 dark:text-gray-400'
    
    if (trendType === 'positive-is-bad') {
      // Pour CPU, Mémoire, Temps de réponse : augmentation = mauvais (rouge), diminution = bon (vert)
      return trend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
    } else {
      // Pour Disponibilité : augmentation = bon (vert), diminution = mauvais (rouge)
      return trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }
  }

  const formatTrend = (trendValue: number) => {
    if (Math.abs(trendValue) < 0.1) return '0.0'
    if (Math.abs(trendValue) < 1) return trendValue.toFixed(1)
    return trendValue.toFixed(0)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 relative">
      {loading && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {trend > 0 ? '↗' : '↘'} {formatTrend(Math.abs(trend))}
            {typeof trend === 'number' && Math.abs(trend) < 1 ? '%' : ''}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <div className={`text-2xl font-bold text-gray-900 dark:text-gray-100 ${loading ? 'opacity-50' : ''}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

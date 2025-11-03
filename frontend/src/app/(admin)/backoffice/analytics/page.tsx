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
  indigo: '#6366F1'
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedService, setSelectedService] = useState<ServiceMetrics | null>(null);
  const [serviceLogs, setServiceLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

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
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Charger l'historique des métriques
  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const timeRangeMs = getTimeRangeMs();
        const endTime = Date.now();
        const startTime = endTime - timeRangeMs;

        const history = await centralMetricsService.getMetricsHistory({
          limit: 1000,
          startTime,
          endTime
        });

        if (mounted && history && Array.isArray(history)) {
          setMetricsHistory(history);
        }
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 60000); // Rafraîchir toutes les minutes

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [timeRange]);

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
        if (data.success && data.logs) {
          setServiceLogs(data.logs);
        } else {
          setLogsError('Aucun log disponible');
          setServiceLogs([]);
        }
      } else {
        setLogsError('Erreur lors du chargement des logs');
        setServiceLogs([]);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      setLogsError('Erreur de connexion au service de logs');
      setServiceLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Préparer les données pour les graphiques
  const chartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) return [];
    
    return metricsHistory.map((item: any) => ({
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

    // Essayer d'abord d'utiliser les données système globales si disponibles
    let avgCpuUsage = null;
    let totalMemoryMb = null;
    
    if (metrics.system?.cpu?.usage && metrics.system.cpu.usage !== 'N/A') {
      const cpuStr = metrics.system.cpu.usage.toString().replace('%', '');
      const cpuNum = parseFloat(cpuStr);
      if (!isNaN(cpuNum)) {
        avgCpuUsage = cpuNum;
      }
    }
    
    if (metrics.system?.memory?.used && metrics.system.memory.used !== 'N/A') {
      const memoryStr = metrics.system.memory.used.toString().replace(/[^0-9.]/g, '');
      const memoryNum = parseFloat(memoryStr);
      if (!isNaN(memoryNum)) {
        totalMemoryMb = memoryNum;
      }
    }

    // Si pas de données système, calculer depuis les services
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              ⚡ Performances & Analytics
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Monitoring complet des performances système et services
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
      </div>
    </AdminLayout>
  );
}

// Composant Overview Tab
function OverviewTab({ metrics, chartData, aggregatedStats, loadingHistory }: any) {
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
          color="purple"
          loading={aggregatedStats.avgCpuUsage === null}
        />
        <StatCard
          icon={<MemoryStick className="w-6 h-6" />}
          title="Mémoire Totale"
          value={aggregatedStats.totalMemoryMb !== null ? formatMb(aggregatedStats.totalMemoryMb) : '...'}
          color="green"
          loading={aggregatedStats.totalMemoryMb === null}
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
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
          title="CPU Moyen"
          value={aggregatedStats.avgCpuUsage !== null ? `${Math.min(aggregatedStats.avgCpuUsage, 100).toFixed(1)}%` : '...'}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null}
        />
      </div>

      {/* Graphiques de performance */}
      {chartData.length > 0 && !loadingHistory && (
        <div className="space-y-6">
          {/* CPU par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU Moyen par Service
            </h3>
            {servicesList.filter((s: any) => {
              const cpuValue = toNumber(s.metrics?.cpu?.percentage, 0);
              return cpuValue > 0;
            }).length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={servicesList
                    .filter((s: any) => {
                      const cpuValue = toNumber(s.metrics?.cpu?.percentage, 0);
                      return cpuValue > 0;
                    })
                    .map((s: any) => ({ 
                      name: s.displayName?.split(' ')[0] || s.name,
                      cpu: Math.min(toNumber(s.metrics?.cpu?.percentage, 0), 100) // Limiter à 100%
                    }))}
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
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée CPU disponible pour les services</p>
              </div>
            )}
          </div>

          {/* Temps de réponse par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse par Service
            </h3>
            {servicesList.filter((s: any) => s.responseTimeMs && s.responseTimeMs > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={servicesList
                    .filter((s: any) => s.responseTimeMs && s.responseTimeMs > 0)
                    .map((s: any) => ({ 
                      name: s.displayName?.split(' ')[0] || s.name,
                      responseTime: s.responseTimeMs
                    }))}
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
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="responseTime" fill={COLORS.purple} name="Temps (ms)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de temps de réponse disponible</p>
                <p className="text-sm mt-1">Les services sans temps de réponse sont considérés comme inactifs</p>
              </div>
            )}
          </div>

          {/* Mémoire par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Mémoire par Service
            </h3>
            {servicesList.filter((s: any) => toNumber(s.metrics?.memory?.usageMb, 0) > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={servicesList
                    .filter((s: any) => toNumber(s.metrics?.memory?.usageMb, 0) > 0)
                    .map((s: any) => ({ 
                      name: s.displayName?.split(' ')[0] || s.name,
                      memory: toNumber(s.metrics?.memory?.usageMb, 0)
                    }))}
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
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (MB)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <MemoryStick className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de mémoire disponible pour les services</p>
              </div>
            )}
          </div>

          {/* Taux d'erreur par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Taux d'Erreur par Service
            </h3>
            {servicesList.filter((s: any) => s.errorRatePerMin && s.errorRatePerMin > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={servicesList
                    .filter((s: any) => s.errorRatePerMin && s.errorRatePerMin > 0)
                    .map((s: any) => ({ 
                      name: s.displayName?.split(' ')[0] || s.name,
                      errorRate: toNumber(s.errorRatePerMin, 0)
                    }))}
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
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="errorRate" fill={COLORS.danger} name="Erreurs/min" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune erreur détectée ✅</p>
                <p className="text-sm mt-1 text-green-600 dark:text-green-400">Tous les services fonctionnent correctement</p>
              </div>
            )}
          </div>

          {/* Graphique temporel des performances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📈 Évolution des Performances
            </h3>
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
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.purple}
                  strokeWidth={2}
                  name="Temps réponse (ms)"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
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
                data={servicesList.map((s: any) => ({ 
                  name: s.displayName?.split(' ')[0] || s.name,
                  rx: toNumber(s.networkMb?.rx || s.metrics?.network?.rx_mb, 0),
                  tx: toNumber(s.networkMb?.tx || s.metrics?.network?.tx_mb, 0)
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '10px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                <Bar dataKey="rx" fill={COLORS.info} name="RX (MB)" />
                <Bar dataKey="tx" fill={COLORS.warning} name="TX (MB)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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

// Composant StatCard
function StatCard({ icon, title, value, subtitle, color, loading }: any) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  };

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

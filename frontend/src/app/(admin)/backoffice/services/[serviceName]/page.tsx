'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import Link from 'next/link';
import { 
  Server, Activity, TrendingUp, Database, Clock, 
  AlertCircle, CheckCircle, XCircle, ArrowLeft,
  RefreshCw, Terminal, BarChart3, Zap, Network
} from 'lucide-react';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const serviceName = params.serviceName as string;
  const fullServiceName = serviceName.startsWith('jobbingtrack-') ? serviceName : `jobbingtrack-${serviceName}`;
  
  const [serviceMetrics, setServiceMetrics] = useState<any>(null);
  const [serviceLogs, setServiceLogs] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isLogsWidgetVisible, setIsLogsWidgetVisible] = useState(false);

  // Observer pour détecter si le widget des logs est visible
  useEffect(() => {
    if (!logsContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsLogsWidgetVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 } // Déclencher quand au moins 10% du widget est visible
    );

    observer.observe(logsContainerRef.current);

    return () => {
      if (logsContainerRef.current) {
        observer.unobserve(logsContainerRef.current);
      }
    };
  }, []);

  // Auto-scroll vers le bas des logs UNIQUEMENT si le widget est visible
  useEffect(() => {
    if (autoScroll && logsEndRef.current && isLogsWidgetVisible) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serviceLogs, autoScroll, isLogsWidgetVisible]);

  const loadServiceData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004';
      let merged: any = null;

      // Métriques : uniquement via metrics-aggregator (docker service + /api/v1/metrics en fallback)
      for (const nameToTry of [fullServiceName, serviceName]) {
        try {
          const metricsResponse = await fetch(`${metricsUrl}/api/v1/docker/service/${encodeURIComponent(nameToTry)}`);
          if (metricsResponse.ok) {
            const data = await metricsResponse.json();
            const s = data.service;
            if (s) {
              if (!merged) {
                merged = {
                  name: s.name || fullServiceName,
                  cpu_percent: s.cpu_percent ?? 0,
                  memory_percent: s.memory_percent ?? 0,
                  memory_usage_mb: s.memory_usage_mb ?? 0,
                  memory_limit_mb: s.memory_limit_mb ?? 0,
                  network_rx_mb: s.network_rx_mb ?? 0,
                  network_tx_mb: s.network_tx_mb ?? 0,
                  response_time_ms: s.response_time_ms ?? null,
                  health_status_http: s.health_status_http ?? s.health ?? 'unknown',
                  health_status_docker: s.health_status_docker ?? 'none',
                  pids: s.pids ?? null,
                  image: s.image,
                  ports: s.ports,
                  created: s.created
                };
              } else {
                merged.health_status_docker = s.health_status_docker ?? merged.health_status_docker;
                merged.pids = s.pids ?? merged.pids;
                merged.image = s.image ?? merged.image;
                merged.ports = s.ports ?? merged.ports;
                merged.created = s.created ?? merged.created;
                if (s.cpu_percent != null) merged.cpu_percent = s.cpu_percent;
                if (s.memory_percent != null) merged.memory_percent = s.memory_percent;
                if (s.memory_usage_mb != null) merged.memory_usage_mb = s.memory_usage_mb;
                if (s.response_time_ms != null) merged.response_time_ms = s.response_time_ms;
              }
              break;
            }
          }
        } catch {
          // try next name
        }
      }

      if (!merged) {
        try {
          const metricsRes = await fetch(`${metricsUrl}/api/v1/metrics`);
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            const containers = metricsData.containers && typeof metricsData.containers === 'object' ? metricsData.containers : {};
            const raw = containers[fullServiceName] || containers[serviceName];
            if (raw) {
              const c = raw.cpu || {};
              const m = raw.memory || {};
              merged = {
                name: fullServiceName,
                cpu_percent: c.percentage ?? 0,
                memory_percent: m.percentage ?? 0,
                memory_usage_mb: m.usage ?? 0,
                memory_limit_mb: m.limit ?? 0,
                network_rx_mb: (raw.network?.rx ?? 0) / (1024 * 1024),
                network_tx_mb: (raw.network?.tx ?? 0) / (1024 * 1024),
                response_time_ms: null,
                health_status_http: 'unknown',
                health_status_docker: 'none',
                pids: null
              };
            }
          }
        } catch {
          // ignore
        }
      }

      if (merged) {
        setServiceMetrics(merged);
      }
      
      // Récupérer les logs : metrics-aggregator (docker service logs) — l'API gateway n'expose pas /api/v1/logs/:service
      try {
        const logsResponse = await fetch(`${metricsUrl}/api/v1/docker/service/${fullServiceName}/logs?lines=100`);
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          const lines = Array.isArray(logsData?.lines) ? logsData.lines : [];
          setServiceLogs({
            lines,
            errorLines: Array.isArray(logsData?.errorLines) ? logsData.errorLines : lines.filter((l: string) => /error|exception|fatal/i.test(l)),
            total: logsData?.total ?? lines.length,
            errors: logsData?.errors ?? 0,
            warnings: logsData?.warnings ?? 0
          });
        }
      } catch (logsErr) {
        // Ne pas faire planter la page
      }
      
      // Historique : via metrics-aggregator (centralMetricsService ou docker/service/:name/history)
      try {
        const metrics = await centralMetricsService.getAggregatorMetrics();
        if (metrics && metrics.servicesList) {
          const service = metrics.servicesList.find((s: any) => s.rawName === fullServiceName || s.name === fullServiceName || s.name === serviceName || s.rawName === serviceName);
          if (service && metrics.chartData) {
            // Construire l'historique depuis chartData pour ce service
            const history = metrics.chartData
              .map((point: any) => ({
                timestamp: point.time || point.timestamp,
                cpu_percent: point.services?.[service.rawName]?.cpu || service.metrics?.cpu?.percentage || 0,
                memory_percent: point.services?.[service.rawName]?.memory || service.metrics?.memory?.percentage || 0,
                memory_usage_mb: point.services?.[service.rawName]?.memory_mb || service.metrics?.memory?.usageMb || 0,
                network_rx_mb: point.services?.[service.rawName]?.network_rx || service.metrics?.network?.rx_mb || 0,
                network_tx_mb: point.services?.[service.rawName]?.network_tx || service.metrics?.network?.tx_mb || 0
              }))
              .filter((h: any) => h.timestamp)
              .slice(-50); // Derniers 50 points
            setServiceHistory(history);
          }
        }
      } catch {
        try {
          const historyResponse = await fetch(`${metricsUrl}/api/v1/docker/service/${fullServiceName}/history?limit=50`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setServiceHistory(historyData.data || []);
          }
        } catch (error) {
          console.warn('[SERVICE DETAIL] Erreur historique:', error);
        }
      }
    } catch (error) {
      console.error('[SERVICE DETAIL] Erreur chargement données service:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceData();
    // Rafraîchir toutes les 5 secondes pour des données plus en temps réel
    // ✅ OPTIMISATION : Réduire la fréquence de polling pour économiser CPU
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        loadServiceData()
      }
    }, 20000); // 20 secondes au lieu de 5 secondes
    return () => clearInterval(interval);
  }, [serviceName]);

  const handleRefresh = () => {
    loadServiceData(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // Détection améliorée du statut : priorité au statut Docker
  const dockerHealth = serviceMetrics?.health_status_docker || 'none';
  const httpHealth = serviceMetrics?.health_status_http || 'unknown';
  const isHealthy = dockerHealth === 'healthy' || (dockerHealth === 'none' && httpHealth === 'healthy');
  
  const cpuPercent = serviceMetrics?.cpu_percent || 0;
  const memoryPercent = serviceMetrics?.memory_percent || 0;
  const memoryUsageMb = serviceMetrics?.memory_usage_mb || 0;
  const memoryLimitMb = serviceMetrics?.memory_limit_mb || 0;
  const networkRxMb = serviceMetrics?.network_rx_mb || 0;
  const networkTxMb = serviceMetrics?.network_tx_mb || 0;
  const pids = serviceMetrics?.pids || 0;
  const responseTime = serviceMetrics?.response_time_ms;
  
  // Log uniquement en mode développement et seulement lors du premier rendu
  if (process.env.NODE_ENV === 'development' && !serviceMetrics) {
    console.log('[SERVICE DETAIL] Statuts:', { dockerHealth, httpHealth, isHealthy, cpuPercent, memoryPercent, networkRxMb, networkTxMb });
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/backoffice/services"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
              title="Retour à la liste des services"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Server className="h-8 w-8 mr-3 text-blue-600" />
                {serviceName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {serviceMetrics ? 'Monitoring détaillé du service' : 'Service non détecté — vérifiez que le conteneur est démarré et que metrics-aggregator est accessible'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg border-2 ${
          isHealthy
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isHealthy ? (
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600 mr-3" />
              )}
              <div>
                <h3 className={`text-lg font-bold ${isHealthy ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                  {isHealthy ? 'Service opérationnel' : 'Service non disponible'}
                </h3>
                <p className={`text-sm ${isHealthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isHealthy ? 'Tous les systèmes fonctionnent normalement' : 'Le service rencontre des problèmes'}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    dockerHealth === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    dockerHealth === 'unhealthy' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    dockerHealth === 'starting' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    Docker: {dockerHealth}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    httpHealth === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    httpHealth === 'degraded' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                    httpHealth === 'unhealthy' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    HTTP: {httpHealth}
                  </span>
                </div>
              </div>
            </div>
            {responseTime && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{responseTime} ms</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className={`text-sm font-medium ${cpuPercent > 70 ? 'text-red-600' : 'text-blue-600'}`}>
                {cpuPercent > 70 ? 'Élevé' : 'Normal'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {cpuPercent.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisation CPU</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  cpuPercent > 70 ? 'bg-red-600' :
                  cpuPercent > 40 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(cpuPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <span className={`text-sm font-medium ${memoryPercent > 80 ? 'text-red-600' : 'text-purple-600'}`}>
                {memoryPercent > 80 ? 'Élevé' : 'Normal'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {memoryUsageMb.toFixed(0)} MB
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisation Mémoire</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  memoryPercent > 80 ? 'bg-red-600' :
                  memoryPercent > 50 ? 'bg-yellow-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(memoryPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium text-green-600">Actifs</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {pids}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processus Actifs</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Network className="h-8 w-8 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">I/O</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(networkRxMb + networkTxMb).toFixed(2)} MB
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Traffic Réseau Total</p>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>↓ RX: {networkRxMb.toFixed(2)} MB</span>
              <span>↑ TX: {networkTxMb.toFixed(2)} MB</span>
            </div>
          </div>
        </div>

        {/* Performance History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2" />
              Historique des Performances
            </h2>
            <span className="text-sm text-gray-500">
              {serviceHistory.length > 0 ? `${serviceHistory.length} points de données` : 'Aucune donnée disponible'}
            </span>
          </div>
          
          {serviceHistory.length > 0 ? (
            <div>
            
            {/* Graphique CPU */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Utilisation CPU</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={serviceHistory}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis stroke="#9CA3AF" unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${value.toFixed(2)}%`, 'CPU']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleString('fr-FR');
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cpu_percent" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorCpu)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique Mémoire */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Utilisation Mémoire</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={serviceHistory}>
                  <defs>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis stroke="#9CA3AF" unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${value.toFixed(2)}%`, 'Mémoire']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleString('fr-FR');
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="memory_percent" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorMemory)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique Réseau */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Traffic Réseau</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={serviceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis stroke="#9CA3AF" unit=" MB" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${value.toFixed(2)} MB`]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleString('fr-FR');
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="network_rx_mb" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="RX (Réception)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="network_tx_mb" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="TX (Transmission)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun historique de performance disponible pour ce service.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les données d'historique s'accumuleront au fil du temps.
              </p>
            </div>
          )}
        </div>

        {/* Logs en Temps Réel */}
        <div ref={logsContainerRef} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Terminal className="h-6 w-6 mr-2" />
              Logs du Service (Temps Réel)
            </h2>
            {serviceLogs?.lines && serviceLogs.lines.length > 0 && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    autoScroll 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {autoScroll ? '✓ Auto-Scroll Actif' : 'Auto-Scroll Désactivé'}
                </button>
                <span className="text-sm text-gray-500">
                  {serviceLogs?.total ?? serviceLogs?.lines?.length ?? 0} lignes
                </span>
                {(serviceLogs?.errors ?? 0) > 0 && (
                  <span className="flex items-center text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serviceLogs?.errors} erreurs
                  </span>
                )}
                {(serviceLogs?.warnings ?? 0) > 0 && (
                  <span className="flex items-center text-sm font-medium text-yellow-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serviceLogs?.warnings} warnings
                  </span>
                )}
              </div>
            )}
          </div>
            
            {/* Error Lines Summary */}
            {serviceLogs?.errorLines && serviceLogs.errorLines.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Erreurs Récentes ({serviceLogs.errorLines.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {serviceLogs.errorLines.slice(0, 10).map((line: string, index: number) => (
                    <div key={index} className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          {/* All Logs - Affichage Terminal Style */}
          {serviceLogs?.lines && serviceLogs.lines.length > 0 ? (
            <>
              <div className="relative">
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-[500px] overflow-y-auto">
                  {serviceLogs.lines.slice(-100).map((line: string, index: number) => {
                    // Parser le timestamp Docker (format: 2025-12-02T17:21:30.123456789Z message)
                    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/);
                    const timestamp = timestampMatch ? timestampMatch[1] : null;
                    const message = timestampMatch ? timestampMatch[2] : line;
                    
                    // Formater la date pour l'affichage
                    let formattedDate = '';
                    if (timestamp) {
                      try {
                        const date = new Date(timestamp);
                        formattedDate = date.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3
                        });
                      } catch (e) {
                        formattedDate = timestamp;
                      }
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className={`py-0.5 leading-relaxed ${
                          message.toLowerCase().includes('error') || message.toLowerCase().includes('exception') || message.toLowerCase().includes('fatal')
                            ? 'text-red-400 font-semibold'
                            : message.toLowerCase().includes('warn')
                            ? 'text-yellow-400'
                            : message.toLowerCase().includes('info')
                            ? 'text-blue-300'
                            : message.toLowerCase().includes('debug')
                            ? 'text-gray-500'
                            : 'text-green-400'
                        }`}
                      >
                        {formattedDate && (
                          <span className="text-gray-500 mr-2">[{formattedDate}]</span>
                        )}
                        {message}
                      </div>
                    );
                  })}
                  {/* Référence pour auto-scroll */}
                  <div ref={logsEndRef} />
                </div>
                {!autoScroll && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <button
                      onClick={() => {
                        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        setAutoScroll(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-lg transition-colors"
                    >
                      ↓ Aller en bas et activer auto-scroll
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                🔄 Rafraîchissement automatique toutes les 5 secondes
              </p>
            </>
          ) : (
            <div className="text-center py-12">
              <Terminal className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun log disponible pour ce service.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les logs apparaîtront ici une fois que le service aura généré des sorties.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import Link from 'next/link';
import { 
  Server, Activity, TrendingUp, Database, Clock, 
  AlertCircle, CheckCircle, XCircle, ArrowLeft,
  RefreshCw, Terminal, BarChart3, Zap, Network, Shield
} from 'lucide-react';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import {
  formatLocalDateTime,
  formatLocalChartAxisTick,
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
  parseChartTimestamp,
} from '@/lib/utils/date';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

type HistoryPoint = {
  timestamp: string
  cpu_percent: number
  memory_percent: number
  memory_usage_mb: number
  network_rx_mb: number
  network_tx_mb: number
}

function formatCpuPercent(value: number | null | undefined): string {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0
  if (n === 0) return '0,00 %'
  if (n > 0 && n < 0.005) return '< 0,01 %'
  if (n < 1) return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} %`
  if (n < 10) return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function formatMegabytes(mb: number | null | undefined): string {
  if (mb == null || Number.isNaN(mb)) return '—'
  const abs = Math.abs(mb)
  if (abs > 0 && abs < 0.01) return `${(mb * 1024).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} KB`
  return `${mb.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} MB`
}

function cpuBarWidthPercent(cpu: number): string {
  if (cpu <= 0) return '0%'
  const w = Math.min(100, Math.max(cpu < 0.05 ? 1.2 : 0.8, cpu))
  return `${w}%`
}

function normalizeServerHistoryRows(rows: any[]): HistoryPoint[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((raw) => {
      const fromUnix =
        raw.unix_timestamp != null && raw.unix_timestamp !== ''
          ? parseChartTimestamp(raw.unix_timestamp)?.toISOString() ?? null
          : null
      const tsRaw =
        raw.timestamp != null && String(raw.timestamp).trim() !== ''
          ? raw.timestamp
          : fromUnix
      if (!tsRaw) return null
      const ts = normalizeMetricTimestampToIso(typeof tsRaw === 'string' ? tsRaw : new Date(tsRaw).toISOString())
      if (!ts) return null
      return {
        timestamp: ts,
        cpu_percent: Number(raw.cpu_percent ?? raw.metrics?.cpu?.percentage ?? 0) || 0,
        memory_percent: Number(raw.memory_percent ?? raw.metrics?.memory?.percentage ?? 0) || 0,
        memory_usage_mb: Number(raw.memory_usage_mb ?? 0) || 0,
        network_rx_mb: Number(raw.network_rx_mb ?? raw.network_rx ?? 0) || 0,
        network_tx_mb: Number(raw.network_tx_mb ?? raw.network_tx ?? 0) || 0
      }
    })
    .filter(Boolean) as HistoryPoint[]
}

function mergeHistoryChronological(server: HistoryPoint[], session: HistoryPoint[], maxPoints = 320): HistoryPoint[] {
  const all = [...server, ...session]
    .filter((r) => r?.timestamp)
    .map((r) => ({
      ...r,
      _t: metricTimestampToMs(r.timestamp) ?? 0
    }))
    .filter((r) => !Number.isNaN(r._t))
    .sort((a, b) => a._t - b._t)
  const out: HistoryPoint[] = []
  let lastBucket = -Infinity
  for (const row of all) {
    const bucket = Math.floor(row._t / 2000)
    if (out.length && bucket === lastBucket) {
      const { _t, ...rest } = row
      out[out.length - 1] = rest as HistoryPoint
    } else {
      const { _t, ...rest } = row
      out.push(rest as HistoryPoint)
      lastBucket = bucket
    }
  }
  return out.slice(-maxPoints)
}

export default function ServiceDetailPage() {
  const params = useParams();
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
  const [lastMetricsAt, setLastMetricsAt] = useState<Date | null>(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(15);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const sessionHistoryRef = useRef<HistoryPoint[]>([]);

  useEffect(() => {
    sessionHistoryRef.current = []
  }, [serviceName]);

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
                  block_read_mb: s.block_read_mb ?? 0,
                  block_write_mb: s.block_write_mb ?? 0,
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
                if (s.block_read_mb != null) merged.block_read_mb = s.block_read_mb;
                if (s.block_write_mb != null) merged.block_write_mb = s.block_write_mb;
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
                block_read_mb: 0,
                block_write_mb: 0,
                response_time_ms: null,
                health_status_http: 'unknown',
                health_status_docker: 'none',
                pids: raw.pids ?? null
              };
            }
          }
        } catch {
          // ignore
        }
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
      
      // Historique : snapshots disque (/history) + complément chartData agrégateur + courbe « session » (points à chaque rafraîchissement)
      let serverHistoryPoints: HistoryPoint[] = []
      try {
        const historyResponse = await fetch(
          `${metricsUrl}/api/v1/docker/service/${encodeURIComponent(fullServiceName)}/history?limit=280`
        )
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          const raw = Array.isArray(historyData.data) ? historyData.data : []
          serverHistoryPoints = normalizeServerHistoryRows(raw).sort(
            (a, b) =>
              (metricTimestampToMs(a.timestamp) ?? 0) - (metricTimestampToMs(b.timestamp) ?? 0)
          )
        }
      } catch {
        // ignore
      }

      if (serverHistoryPoints.length === 0) {
        try {
          const metrics = await centralMetricsService.getAggregatorMetrics()
          const chartData = (metrics as { chartData?: any[] })?.chartData
          if (metrics && metrics.servicesList && Array.isArray(chartData) && chartData.length > 0) {
            const service = metrics.servicesList.find(
              (s: any) =>
                s.rawName === fullServiceName ||
                s.name === fullServiceName ||
                s.name === serviceName ||
                s.rawName === serviceName
            )
            if (service) {
              const serviceKey = service.rawName ?? service.name ?? ''
              serverHistoryPoints = chartData
                .map((point: any) => ({
                  timestamp: point.time || point.timestamp,
                  cpu_percent: Number(point.services?.[serviceKey]?.cpu ?? service.metrics?.cpu?.percentage ?? 0) || 0,
                  memory_percent: Number(point.services?.[serviceKey]?.memory ?? service.metrics?.memory?.percentage ?? 0) || 0,
                  memory_usage_mb: Number(point.services?.[serviceKey]?.memory_mb ?? service.metrics?.memory?.usageMb ?? 0) || 0,
                  network_rx_mb: Number(point.services?.[serviceKey]?.network_rx ?? service.metrics?.network?.rx_mb ?? 0) || 0,
                  network_tx_mb: Number(point.services?.[serviceKey]?.network_tx ?? service.metrics?.network?.tx_mb ?? 0) || 0
                }))
                .filter((h: { timestamp?: string }) => Boolean(h.timestamp))
                .slice(-80)
            }
          }
        } catch {
          // ignore
        }
      }

      if (merged) {
        const ts = new Date().toISOString()
        sessionHistoryRef.current = [
          ...sessionHistoryRef.current,
          {
            timestamp: ts,
            cpu_percent: Number(merged.cpu_percent) || 0,
            memory_percent: Number(merged.memory_percent) || 0,
            memory_usage_mb: Number(merged.memory_usage_mb) || 0,
            network_rx_mb: Number(merged.network_rx_mb) || 0,
            network_tx_mb: Number(merged.network_tx_mb) || 0
          }
        ].slice(-260)
        setLastMetricsAt(new Date())
      }

      setServiceHistory(mergeHistoryChronological(serverHistoryPoints, sessionHistoryRef.current))

      if (merged) {
        setServiceMetrics(merged)
      }
    } catch (error) {
      console.error('[SERVICE DETAIL] Erreur chargement données service:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceData()
    if (!autoRefreshEnabled || refreshIntervalSec <= 0) return undefined
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        loadServiceData()
      }
    }, refreshIntervalSec * 1000)
    return () => clearInterval(interval)
  }, [serviceName, autoRefreshEnabled, refreshIntervalSec])

  const handleRefresh = () => {
    loadServiceData(true);
  };

  const historyCpuMax = useMemo(() => {
    if (!serviceHistory.length) return 1
    const m = Math.max(0.02, ...serviceHistory.map((h) => Number(h.cpu_percent) || 0))
    return Math.min(100, m * 1.2 + 0.05)
  }, [serviceHistory])

  const historyMemMax = useMemo(() => {
    if (!serviceHistory.length) return 1
    const m = Math.max(0.5, ...serviceHistory.map((h) => Number(h.memory_percent) || 0))
    return Math.min(100, m * 1.15 + 0.5)
  }, [serviceHistory])

  const historyChartRows = useMemo(() => {
    return serviceHistory
      .map((row) => {
        const timeMs = metricTimestampToMs(row.timestamp)
        if (timeMs == null || Number.isNaN(timeMs)) return null
        return { ...row, timeMs }
      })
      .filter(Boolean) as (HistoryPoint & { timeMs: number })[]
  }, [serviceHistory])

  const historyAxisShowDate = useMemo(() => {
    if (historyChartRows.length < 2) return false
    const span =
      historyChartRows[historyChartRows.length - 1].timeMs - historyChartRows[0].timeMs
    return span > 24 * 60 * 60 * 1000
  }, [historyChartRows])

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
  const blockReadMb = serviceMetrics?.block_read_mb ?? 0;
  const blockWriteMb = serviceMetrics?.block_write_mb ?? 0;
  const pids = serviceMetrics?.pids ?? 0;
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
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="rounded border-gray-400"
                />
                Auto
              </label>
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-800 dark:text-gray-200"
                disabled={!autoRefreshEnabled}
              >
                <option value={10}>10 s</option>
                <option value={15}>15 s</option>
                <option value={30}>30 s</option>
                <option value={60}>60 s</option>
              </select>
              {lastMetricsAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatLocalDateTime(lastMetricsAt.toISOString())}
                </span>
              )}
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
                  Docker reflète le healthcheck du conteneur. HTTP est une sonde depuis l&apos;agrégateur vers
                  l&apos;endpoint du service sur le réseau Docker : si Docker est sain mais HTTP dégradé, cause
                  fréquente = endpoint injoignable depuis l&apos;agrégateur ou réponse 4xx/5xx sur le chemin de health.
                </p>
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
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatCpuPercent(cpuPercent)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisation CPU (Docker stats)</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Valeur brute : {typeof serviceMetrics?.cpu_percent === 'number' ? serviceMetrics.cpu_percent.toFixed(6) : '—'} %
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  cpuPercent > 70 ? 'bg-red-600' : cpuPercent > 40 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: cpuBarWidthPercent(cpuPercent) }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <span className={`text-sm font-medium ${memoryPercent > 80 ? 'text-red-600' : 'text-purple-600'}`}>
                {memoryPercent > 80 ? 'Élevé' : 'Normal'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatMegabytes(memoryUsageMb)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mémoire · {memoryPercent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} % de la limite
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Limite conteneur : {formatMegabytes(memoryLimitMb)}
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  memoryPercent > 80 ? 'bg-red-600' : memoryPercent > 50 ? 'bg-yellow-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(memoryPercent, memoryPercent > 0 ? 0.5 : 0))}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium text-green-600">cgroup</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{pids}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processus / tâches (PIDs)</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 leading-relaxed">
              Compteur renvoyé par <strong>docker stats</strong> pour ce conteneur (processus visibles dans le cgroup, pas la liste des commandes).
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Network className="h-8 w-8 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Net</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatMegabytes(networkRxMb + networkTxMb)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Trafic cumulé interface (depuis dernier reset conteneur)</p>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
              <span>↓ RX : {formatMegabytes(networkRxMb)}</span>
              <span>↑ TX : {formatMegabytes(networkTxMb)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Disque (Block I/O)</span>
          <span className="mx-2">·</span>
          Lecture cumulée : <span className="tabular-nums font-medium">{formatMegabytes(blockReadMb)}</span>
          <span className="mx-2">·</span>
          Écriture cumulée : <span className="tabular-nums font-medium">{formatMegabytes(blockWriteMb)}</span>
          <p className="text-xs text-gray-500 mt-1">
            Cumuls depuis la création / dernier redémarrage du conteneur (même logique que le réseau).
          </p>
        </div>

        {/* Performance History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2" />
              Historique des Performances
            </h2>
            <span className="text-sm text-gray-500 text-right max-w-md">
              {serviceHistory.length > 0
                ? `${serviceHistory.length} points (fichiers agrégateur + session courante)`
                : 'Aucune donnée — attendez quelques cycles ou activez l’auto-rafraîchissement'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            L’axe CPU est zoomé automatiquement quand la charge est faible. Les points « session » s’ajoutent à chaque rafraîchissement même sans historique disque.
          </p>
          
          {serviceHistory.length > 0 ? (
            <div>
            
            {/* Graphique CPU */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Utilisation CPU</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historyChartRows}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timeMs"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#9CA3AF"
                    minTickGap={28}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: historyAxisShowDate })}
                  />
                  <YAxis stroke="#9CA3AF" unit="%" domain={[0, historyCpuMax]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${Number(value).toFixed(4)}%`, 'CPU']}
                    labelFormatter={(_, payload) => {
                      const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload?.timestamp
                      return ts != null ? formatLocalDateTime(ts) : '—'
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
                <AreaChart data={historyChartRows}>
                  <defs>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timeMs"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#9CA3AF"
                    minTickGap={28}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: historyAxisShowDate })}
                  />
                  <YAxis stroke="#9CA3AF" unit="%" domain={[0, historyMemMax]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Mémoire']}
                    labelFormatter={(_, payload) => {
                      const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload?.timestamp
                      return ts != null ? formatLocalDateTime(ts) : '—'
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
                <LineChart data={historyChartRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="timeMs"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#9CA3AF"
                    minTickGap={28}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: historyAxisShowDate })}
                  />
                  <YAxis stroke="#9CA3AF" unit=" MB" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: any) => [`${value.toFixed(2)} MB`]}
                    labelFormatter={(_, payload) => {
                      const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload?.timestamp
                      return ts != null ? formatLocalDateTime(ts) : '—'
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

        {/* Lot A3 — point d’entrée corrélation logs × sécurité (vue détail service) */}
        <div className="mb-6 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                Corrélation observabilité / sécurité (chantier A3)
              </p>
              <p className="text-xs text-indigo-800/90 dark:text-indigo-200/90 mt-1">
                Les logs ci-dessous viennent du conteneur / agrégateur. Pour les événements firewall, menaces et analyses réseau, ouvrez la vue sécurité ; pour les logs applicatifs filtrés par service, la page logs centralisée.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/backoffice/security"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Vue sécurité
                </Link>
                <Link
                  href={`/backoffice/services/logs?service=${encodeURIComponent(serviceName.replace(/^jobbingtrack-/, ''))}`}
                  className="inline-flex items-center rounded-md border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-indigo-800 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                >
                  Logs multi-services (filtre)
                </Link>
              </div>
            </div>
          </div>
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
                    
                    // Formater la date pour l'affichage (heure locale utilisateur)
                    let formattedDate = '';
                    if (timestamp) {
                      try {
                        formattedDate = formatLocalDateTime(timestamp);
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
                {autoRefreshEnabled
                  ? `Rafraîchissement des métriques et des logs aligné sur la cadence ci-dessus (${refreshIntervalSec} s).`
                  : 'Auto-rafraîchissement désactivé — utilisez « Actualiser ».'}
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


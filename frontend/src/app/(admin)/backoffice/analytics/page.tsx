'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { ChartPeriodCaption } from '@/components/analytics/ChartPeriodCaption';
import { formatRangeLabel, formatCustomRangeLabel, localCalendarDayBounds } from '@/components/analytics/timeRangeUtils';
import type { TimeRangeOption as AnalyticsPresetRange } from '@/components/analytics/TimeRangeSelector';
import { formatLocalChartAxisTick, formatLocalDateTime, normalizeMetricTimestampToIso } from '@/lib/utils/date';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from '@/lib/icons';

interface CPUMetric {
  timestamp: string;
  cpu_usage_percent: number;
}

type PageTimeRange = AnalyticsPresetRange | 'custom';

export default function AnalyticsPage() {
  const [cpuData, setCpuData] = useState<CPUMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);
  /** Horodatage du dernier fetch HTTP (affichage « temps réel » côté UI). */
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<PageTimeRange>('today');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Calculer la limite et la date de début (plage personnalisée = date picker)
  const getTimeRangeParams = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let limit: number;
    
    if (timeRange === 'custom') {
      const { start, end: endDate } = localCalendarDayBounds(customStart, customEnd);
      startDate = start;
      const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
      limit = Math.ceil(durationMs / (60 * 1000)); // 1 point par minute max
      limit = Math.min(limit, 43200); // plafonner à 30 jours
    } else {
      switch (timeRange) {
        case 'today': {
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          startDate = startOfDay;
          limit = Math.min(1440, Math.ceil((now.getTime() - startOfDay.getTime()) / (60 * 1000)));
          break;
        }
        case '1h':
          startDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
          limit = 60;
          break;
        case '6h':
          startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          limit = 360;
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          limit = 1440;
          break;
        case '3d':
          startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          limit = 4320;
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          limit = 10080;
          break;
        case '14d':
          startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          limit = 20160;
          break;
        case '21d':
          startDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
          limit = 30240;
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          limit = 43200;
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          limit = 1440;
      }
    }
    
    return { startDate, limit };
  }, [timeRange, customStart, customEnd]);

  const chartPeriodLabel = useMemo(() => {
    if (timeRange === 'custom') return formatCustomRangeLabel(customStart, customEnd);
    const end = new Date();
    const { startDate } = getTimeRangeParams();
    return formatRangeLabel(startDate, end, timeRange as AnalyticsPresetRange);
  }, [timeRange, customStart, customEnd, getTimeRangeParams]);

  const refreshIntervalMs = useMemo(() => {
    if (timeRange === '1h' || timeRange === '6h') return 15_000;
    if (timeRange === 'today' || timeRange === '24h') return 30_000;
    if (timeRange === 'custom') return 45_000;
    return 60_000;
  }, [timeRange]);

  const periodHintText = useMemo(() => {
    if (timeRange === 'custom') {
      return 'Plage calendaire locale : les graphiques utilisent les dates « Du / au » ci-dessus.';
    }
    if (timeRange === '24h') {
      return 'Dernières 24 h glissantes jusqu’à maintenant (borne de droite = instant présent).';
    }
    if (timeRange === '1h' || timeRange === '6h') {
      return 'Fenêtre glissante courte jusqu’à maintenant.';
    }
    if (timeRange === 'today') {
      return 'Depuis minuit aujourd’hui (heure locale) jusqu’à maintenant.';
    }
    return 'Fenêtre glissante jusqu’à maintenant ; les libellés d’axe restent en heure locale.';
  }, [timeRange]);

  const refreshHintText = useMemo(() => {
    const s = Math.round(refreshIntervalMs / 1000);
    return `Rafraîchissement automatique des données toutes les ${s} s (plus fréquent sur les vues courtes).`;
  }, [refreshIntervalMs]);

  // Fonction pour récupérer les données CPU depuis metrics-aggregator-c
  const fetchCPUData = useCallback(async () => {
    try {
      // Ne passer en chargement que si on n'a pas encore de données (évite N/A qui clignote au refetch)
      if (!hasDataRef.current) setLoading(true);
      const { startDate, limit } = getTimeRangeParams();
      
      // Construire l'URL avec startDate et endDate
      const endDate = new Date();
      const params = new URLSearchParams({
        limit: Math.min(limit, 500).toString(),
        offset: '0',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      // L'API historique est sur metrics-aggregator (5004).
      const metricsAggregatorUrl = process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL || process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004';
      const url = `${metricsAggregatorUrl}/api/v1/persistence/system/metrics?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) return;

      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        const mapped = result.data
          .filter((item: any) => {
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : 
                       (item.cpu_usage_percent !== undefined ? item.cpu_usage_percent : null);
            return cpu !== null && cpu !== undefined && !isNaN(Number(cpu));
          })
          .map((item: any) => {
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : 
                       (item.cpu_usage_percent !== undefined ? item.cpu_usage_percent : 0);
            const timestamp = normalizeMetricTimestampToIso(item.timestamp);
            if (!timestamp) return null;
            return {
              timestamp,
              cpu_usage_percent: Number(cpu)
            };
          })
          .filter((row): row is CPUMetric => row != null)
          .sort((a: CPUMetric, b: CPUMetric) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        
        setCpuData(mapped);
        if (mapped.length > 0) hasDataRef.current = true;
      }
    } catch {
      // Erreur silencieuse (réseau ou API)
    } finally {
      setLastFetchedAt(new Date());
      setLoading(false);
    }
  }, [getTimeRangeParams]);

  useEffect(() => {
    fetchCPUData();
    const interval = setInterval(fetchCPUData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchCPUData, refreshIntervalMs]);

  // Fonction pour compresser/agréger les points de données
  const compressDataPoints = useCallback((data: CPUMetric[], targetMaxPoints: number = 200) => {
    if (data.length === 0) return [];
    
    // ✅ CORRECTION : Toujours compresser si on a plus de points que targetMaxPoints
    // Mais aussi compresser même avec moins de points si c'est pour améliorer la lisibilité
    const shouldCompress = data.length > targetMaxPoints;
    
    if (!shouldCompress) return data;
    
    const firstTimestamp = new Date(data[0].timestamp).getTime();
    const lastTimestamp = new Date(data[data.length - 1].timestamp).getTime();
    const totalDuration = lastTimestamp - firstTimestamp;
    const intervalMs = Math.ceil(totalDuration / targetMaxPoints);
    
    // Grouper les points par intervalle et calculer la moyenne
    const compressed: CPUMetric[] = [];
    let currentIntervalStart = firstTimestamp;
    let currentGroup: CPUMetric[] = [];
    
    for (const point of data) {
      const pointTimestamp = new Date(point.timestamp).getTime();
      
      // Si le point est dans l'intervalle actuel, l'ajouter au groupe
      if (pointTimestamp < currentIntervalStart + intervalMs) {
        currentGroup.push(point);
      } else {
        // L'intervalle actuel est terminé, calculer la moyenne
        if (currentGroup.length > 0) {
          const avgCpu = currentGroup.reduce((sum, p) => sum + p.cpu_usage_percent, 0) / currentGroup.length;
          const avgTimestamp = currentGroup[Math.floor(currentGroup.length / 2)].timestamp; // Utiliser le timestamp médian
          
          compressed.push({
            timestamp: avgTimestamp,
            cpu_usage_percent: avgCpu
          });
        }
        
        // Commencer un nouveau groupe
        currentGroup = [point];
        currentIntervalStart += intervalMs;
      }
    }
    
    // Ajouter le dernier groupe
    if (currentGroup.length > 0) {
      const avgCpu = currentGroup.reduce((sum, p) => sum + p.cpu_usage_percent, 0) / currentGroup.length;
      const avgTimestamp = currentGroup[Math.floor(currentGroup.length / 2)].timestamp;
      
      compressed.push({
            timestamp: avgTimestamp,
            cpu_usage_percent: avgCpu
          });
    }
    
    return compressed;
  }, []);

  // Préparer les données pour le graphique avec compression
  const chartData = useMemo(() => {
    if (cpuData.length === 0) return [];

    // Définir le nombre maximum de points selon le timeRange (compression pour lisibilité)
    let targetMaxPoints = 200;
    if (timeRange === 'today') targetMaxPoints = 100;
    else if (timeRange === '1h') targetMaxPoints = 30;
    else if (timeRange === '6h') targetMaxPoints = 90;
    else if (timeRange === '24h') targetMaxPoints = 100;
    else if (timeRange === '3d') targetMaxPoints = 150;
    else if (timeRange === '7d') targetMaxPoints = 200;   // 7 jours
    else if (timeRange === '14d') targetMaxPoints = 250; // 2 semaines
    else if (timeRange === '21d') targetMaxPoints = 300; // 3 semaines
    else if (timeRange === '30d') targetMaxPoints = 350;
    else if (timeRange === 'custom') targetMaxPoints = 350; // plage personnalisée

    const compressedData = compressDataPoints(cpuData, targetMaxPoints);

    return compressedData.map((item) => {
      const timeMs = new Date(item.timestamp).getTime();
      return {
        timeMs,
        time: formatLocalChartAxisTick(timeMs, { withDate: false }),
        datetime: formatLocalDateTime(item.timestamp),
        cpu: item.cpu_usage_percent,
        timestamp: item.timestamp
      };
    });
  }, [cpuData, timeRange, compressDataPoints]);

  // Préparer les données pour le graphique SANS compression (brutes)
  const chartDataRaw = useMemo(() => {
    if (cpuData.length === 0) return [];
    return cpuData.map((item) => {
      const timeMs = new Date(item.timestamp).getTime();
      return {
        timeMs,
        time: formatLocalChartAxisTick(timeMs, { withDate: false }),
        datetime: formatLocalDateTime(item.timestamp),
        cpu: item.cpu_usage_percent,
        timestamp: item.timestamp
      };
    });
  }, [cpuData]);

  const chartXDomain = useMemo((): [number, number] => {
    const now = new Date();
    if (timeRange === 'custom') {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      return [start.getTime(), end.getTime()];
    }
    const { startDate } = getTimeRangeParams();
    return [startDate.getTime(), now.getTime()];
  }, [timeRange, customStart, customEnd, getTimeRangeParams, lastFetchedAt]);

  const chartAxisShowDate =
    chartXDomain[1] - chartXDomain[0] > 24 * 60 * 60 * 1000;

  const chartRawAxisShowDate = chartAxisShowDate;

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            Métriques système (monitoring)
          </h1>
          
          <div className="flex flex-wrap items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as PageTimeRange)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <option value="today">Aujourd'hui</option>
            <option value="1h">Dernière heure (glissant)</option>
            <option value="6h">Dernières 6 h (glissant)</option>
            <option value="24h">Dernières 24 h (glissant)</option>
            <option value="3d">Derniers 3 jours</option>
            <option value="7d">Derniers 7 jours</option>
            <option value="14d">Dernières 2 semaines</option>
            <option value="21d">Dernières 3 semaines</option>
            <option value="30d">Dernier mois</option>
            <option value="custom">Plage personnalisée</option>
          </select>
          {timeRange === 'custom' && (
            <>
              <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                Du
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm"
                />
              </label>
              <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                au
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm"
                />
              </label>
            </>
          )}
        </div>
        </div>
        <div className="mt-2 space-y-1 max-w-3xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">{periodHintText}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">{refreshHintText}</p>
          {lastFetchedAt && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Dernier chargement depuis l&apos;agrégateur :{' '}
              <span className="font-medium tabular-nums">
                {formatLocalDateTime(lastFetchedAt)}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: '/backoffice/analytics/performances',
              title: 'Historique système',
              desc: 'CPU, mémoire, réseau — mêmes plages / personnalisé que les autres vues.',
            },
            {
              href: '/backoffice/analytics/containers',
              title: 'Conteneurs',
              desc: 'Métriques par conteneur et corrélations.',
            },
            {
              href: '/backoffice/analytics/network',
              title: 'Réseau',
              desc: 'Charge et évolution réseau.',
            },
            {
              href: '/backoffice/analytics/application',
              title: 'Application',
              desc: 'Stats applicatives et rafraîchissement live.',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:hover:border-blue-500"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Information sur les données */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p><strong>Points bruts:</strong> {cpuData.length} | <strong>Points affichés (compressés):</strong> {chartData.length}</p>
            {cpuData.length > 0 && (
              <>
                <p><strong>Dernière valeur:</strong> {cpuData[cpuData.length - 1]?.cpu_usage_percent.toFixed(2)}%</p>
                <p>
                  <strong>Dernier point série (API) :</strong>{' '}
                  {cpuData[cpuData.length - 1]?.timestamp}
                </p>
                {cpuData.length > chartData.length ? (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    ⚡ <strong>Compression active:</strong> Les données sont compressées pour améliorer la lisibilité ({((cpuData.length - chartData.length) / cpuData.length * 100).toFixed(1)}% de réduction: {cpuData.length} → {chartData.length} points)
                  </p>
                ) : (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    ℹ️ <strong>Pas de compression:</strong> Les données ({cpuData.length} points) sont déjà inférieures au maximum recommandé. Les deux graphiques afficheront les mêmes données.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Graphique CPU avec compression */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            CPU Système (%) - {cpuData.length > chartData.length ? 'AVEC Compression' : 'Sans compression'} ({chartData.length} points)
          </h2>
          <ChartPeriodCaption label={chartPeriodLabel} />
          
          {loading && cpuData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Chargement des données...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timeMs"
                  type="number"
                  domain={chartXDomain}
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={chartAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={chartAxisShowDate ? 88 : 72}
                  minTickGap={chartAxisShowDate ? 36 : 24}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: chartAxisShowDate })}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp;
                    return ts != null ? formatLocalDateTime(ts) : '—';
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'CPU Système']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="CPU Système (%)"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Graphique CPU SANS compression (brut) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            CPU Système (%) - Données Brutes - SANS Compression ({chartDataRaw.length} points)
          </h2>
          <ChartPeriodCaption label={chartPeriodLabel} />
          
          {loading && cpuData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Chargement des données...</div>
            </div>
          ) : chartDataRaw.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartDataRaw} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timeMs"
                  type="number"
                  domain={chartXDomain}
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={chartRawAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={chartRawAxisShowDate ? 88 : 72}
                  minTickGap={chartRawAxisShowDate ? 36 : 24}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: chartRawAxisShowDate })}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp;
                    return ts != null ? formatLocalDateTime(ts) : '—';
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'CPU Système']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="CPU Système (%) - Brut"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/features';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from '@/lib/icons';

interface CPUMetric {
  timestamp: string;
  cpu_usage_percent: number;
}

type TimeRangeOption = 'today' | '1h' | '6h' | '24h' | '3d' | '7d' | '14d' | '21d' | '30d' | 'custom';

export default function AnalyticsPage() {
  const [cpuData, setCpuData] = useState<CPUMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('today');
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
      startDate = new Date(customStart + 'T00:00:00.000Z');
      const endDate = new Date(customEnd + 'T23:59:59.999Z');
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

  // Fonction pour récupérer les données CPU depuis metrics-aggregator-c
  const fetchCPUData = useCallback(async () => {
    try {
      // Ne passer en chargement que si on n'a pas encore de données (évite N/A qui clignote au refetch)
      if (!hasDataRef.current) setLoading(true);
      const { startDate, limit } = getTimeRangeParams();
      
      // Construire l'URL avec startDate et endDate
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0'
      });
      
      // Ne pas envoyer startDate/endDate pour l'instant - tester sans filtres
      // Le service Node.js semble avoir un problème avec les dates
      // TODO: Corriger le parsing des dates dans le service Node.js
      // const endDate = new Date();
      // params.append('startDate', startDate.toISOString());
      // params.append('endDate', endDate.toISOString());
      
      // L'API historique est UNIQUEMENT sur metrics-aggregator (5004). monitoring-c (5098) n'expose pas /persistence.
      const metricsAggregatorUrl = process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL || process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004';
      const url = `${metricsAggregatorUrl}/api/v1/persistence/system/metrics?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        console.error('[CPU TEST] Erreur API:', response.status, response.statusText);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Mapper les données pour ne garder que timestamp et cpuUsagePercent
        // L'API retourne cpuUsagePercent (camelCase) depuis Prisma
        console.log('[CPU TEST] Données brutes reçues:', result.data.length, 'points');
        if (result.data.length > 0) {
          console.log('[CPU TEST] Premier point brut:', result.data[0]);
        }
        
        const mapped = result.data
          .filter((item: any) => {
            // L'API retourne cpuUsagePercent (camelCase) depuis Prisma
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : 
                       (item.cpu_usage_percent !== undefined ? item.cpu_usage_percent : null);
            const isValid = cpu !== null && cpu !== undefined && !isNaN(Number(cpu));
            if (!isValid && result.data.length > 0) {
              console.warn('[CPU TEST] Point invalide filtré:', item);
            }
            return isValid;
          })
          .map((item: any) => {
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : 
                       (item.cpu_usage_percent !== undefined ? item.cpu_usage_percent : 0);
            // Convertir timestamp en ISO string si c'est un objet Date
            let timestamp = item.timestamp;
            if (timestamp instanceof Date) {
              timestamp = timestamp.toISOString();
            } else if (typeof timestamp === 'string' && !timestamp.includes('T')) {
              // Si c'est une date PostgreSQL sans timezone, ajouter 'Z'
              timestamp = timestamp + 'Z';
            }
            return {
              timestamp: timestamp,
              cpu_usage_percent: Number(cpu)
            };
          })
          .sort((a: CPUMetric, b: CPUMetric) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        
        console.log('[CPU TEST] Données récupérées:', mapped.length, 'points');
        if (mapped.length > 0) {
          console.log('[CPU TEST] Premier point:', mapped[0]);
          console.log('[CPU TEST] Dernier point:', mapped[mapped.length - 1]);
        }
        
        setCpuData(mapped);
        if (mapped.length > 0) hasDataRef.current = true;
      } else {
        console.warn('[CPU TEST] Format de réponse inattendu:', result);
      }
    } catch (error) {
      console.error('[CPU TEST] Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  }, [getTimeRangeParams]);

  // Charger les données au montage et lors du changement de timeRange
  useEffect(() => {
    fetchCPUData();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchCPUData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchCPUData]);

  // Fonction pour compresser/agréger les points de données
  const compressDataPoints = useCallback((data: CPUMetric[], targetMaxPoints: number = 200) => {
    if (data.length === 0) return [];
    
    // ✅ CORRECTION : Toujours compresser si on a plus de points que targetMaxPoints
    // Mais aussi compresser même avec moins de points si c'est pour améliorer la lisibilité
    const shouldCompress = data.length > targetMaxPoints;
    
    if (!shouldCompress) {
      console.log(`[COMPRESSION] Pas de compression nécessaire: ${data.length} points <= ${targetMaxPoints} max`);
      return data; // Pas besoin de compression
    }
    
    console.log(`[COMPRESSION] Début compression: ${data.length} points → ${targetMaxPoints} max`);
    
    // Calculer l'intervalle de compression (en millisecondes)
    const firstTimestamp = new Date(data[0].timestamp).getTime();
    const lastTimestamp = new Date(data[data.length - 1].timestamp).getTime();
    const totalDuration = lastTimestamp - firstTimestamp;
    const intervalMs = Math.ceil(totalDuration / targetMaxPoints);
    
    console.log(`[COMPRESSION] Durée totale: ${totalDuration}ms, Intervalle: ${intervalMs}ms`);
    
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
    
    console.log(`[COMPRESSION] Compression terminée: ${data.length} points → ${compressed.length} points (réduction: ${((1 - compressed.length / data.length) * 100).toFixed(1)}%)`);
    
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

    // ✅ CORRECTION : Compresser les données (la fonction gère déjà le cas où compression n'est pas nécessaire)
    const compressedData = compressDataPoints(cpuData, targetMaxPoints);
    
    console.log(`[CPU TEST] Données pour graphique compressé: ${cpuData.length} points bruts → ${compressedData.length} points compressés (max: ${targetMaxPoints}, compression: ${cpuData.length > targetMaxPoints ? 'OUI' : 'NON'})`);

    return compressedData.map((item) => {
      const date = new Date(item.timestamp);
      return {
        time: date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        datetime: date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        cpu: item.cpu_usage_percent,
        timestamp: item.timestamp
      };
    });
  }, [cpuData, timeRange, compressDataPoints]);

  // Préparer les données pour le graphique SANS compression (brutes)
  const chartDataRaw = useMemo(() => {
    if (cpuData.length === 0) return [];

    console.log(`[CPU TEST] Données pour graphique brut: ${cpuData.length} points (PAS de compression)`);

    return cpuData.map((item) => {
      const date = new Date(item.timestamp);
      return {
        time: date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        datetime: date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        cpu: item.cpu_usage_percent,
        timestamp: item.timestamp
      };
    });
  }, [cpuData]);

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            Test CPU Système
          </h1>
          
          <div className="flex flex-wrap items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <option value="today">Aujourd'hui</option>
            <option value="1h">Dernière heure</option>
            <option value="6h">Dernières 6 h</option>
            <option value="24h">Dernières 24 h</option>
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

        {/* Information sur les données */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p><strong>Points bruts:</strong> {cpuData.length} | <strong>Points affichés (compressés):</strong> {chartData.length}</p>
            {cpuData.length > 0 && (
              <>
                <p><strong>Dernière valeur:</strong> {cpuData[cpuData.length - 1]?.cpu_usage_percent.toFixed(2)}%</p>
                <p><strong>Dernière mise à jour:</strong> {cpuData[cpuData.length - 1]?.timestamp}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            CPU Système (%) - {cpuData.length > chartData.length ? 'AVEC Compression' : 'Sans compression'} ({chartData.length} points)
          </h2>
          
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
                  dataKey="time"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return payload[0].payload.datetime;
                    }
                    return label;
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            CPU Système (%) - Données Brutes - SANS Compression ({chartDataRaw.length} points)
          </h2>
          
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
                  dataKey="time"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return payload[0].payload.datetime;
                    }
                    return label;
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

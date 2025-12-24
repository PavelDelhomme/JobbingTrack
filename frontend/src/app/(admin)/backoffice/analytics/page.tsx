'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from '@/lib/icons';

interface CPUMetric {
  timestamp: string;
  cpu_usage_percent: number;
}

export default function AnalyticsPage() {
  const [cpuData, setCpuData] = useState<CPUMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '3d'>('24h');

  // Calculer la limite et la date de début basées sur le timeRange
  const getTimeRangeParams = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let limit: number;
    
    switch (timeRange) {
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
        limit = 4320; // 3 jours * 24h * 60 minutes
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        limit = 1440;
    }
    
    return { startDate, limit };
  }, [timeRange]);

  // Fonction pour récupérer les données CPU depuis metrics-aggregator-c
  const fetchCPUData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, limit } = getTimeRangeParams();
      
      // Construire l'URL avec startDate et endDate
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0'
      });
      
      // Ajouter startDate et endDate si supporté par l'API
      const endDate = new Date();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      
      const response = await fetch(
        `http://localhost:5004/api/v1/persistence/system/metrics?${params.toString()}`
      );
      
      if (!response.ok) {
        console.error('[CPU TEST] Erreur API:', response.status, response.statusText);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Mapper les données pour ne garder que timestamp et cpuUsagePercent
        // L'API retourne cpuUsagePercent (camelCase)
        const mapped = result.data
          .filter((item: any) => {
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : item.cpu_usage_percent;
            return cpu !== null && cpu !== undefined && !isNaN(Number(cpu));
          })
          .map((item: any) => {
            const cpu = item.cpuUsagePercent !== undefined ? item.cpuUsagePercent : item.cpu_usage_percent;
            return {
              timestamp: item.timestamp,
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
    if (data.length <= targetMaxPoints) return data; // Pas besoin de compression
    
    // Calculer l'intervalle de compression (en millisecondes)
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

    // Définir le nombre maximum de points selon le timeRange
    let targetMaxPoints = 200;
    if (timeRange === '1h') targetMaxPoints = 60;       // 1 point par minute
    else if (timeRange === '6h') targetMaxPoints = 180;  // 1 point par 2 minutes
    else if (timeRange === '24h') targetMaxPoints = 200; // ~1 point par 7-8 minutes
    else if (timeRange === '3d') targetMaxPoints = 300;  // ~1 point par 14-15 minutes

    // Compresser les données si nécessaire
    const compressedData = compressDataPoints(cpuData, targetMaxPoints);
    
    console.log(`[CPU TEST] Données: ${cpuData.length} points bruts → ${compressedData.length} points compressés (max: ${targetMaxPoints})`);

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
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '6h' | '24h' | '3d')}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <option value="1h">Dernière heure</option>
            <option value="6h">Dernières 6 heures</option>
            <option value="24h">Dernières 24 heures</option>
            <option value="3d">Derniers 3 jours</option>
          </select>
        </div>

        {/* Information sur les données */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p><strong>Points bruts:</strong> {cpuData.length} | <strong>Points affichés (compressés):</strong> {chartData.length}</p>
            {cpuData.length > 0 && (
              <>
                <p><strong>Dernière valeur:</strong> {cpuData[cpuData.length - 1]?.cpu_usage_percent.toFixed(2)}%</p>
                <p><strong>Dernière mise à jour:</strong> {cpuData[cpuData.length - 1]?.timestamp}</p>
                {cpuData.length > chartData.length && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    ⚡ Les données sont compressées pour améliorer la lisibilité ({((cpuData.length - chartData.length) / cpuData.length * 100).toFixed(1)}% de réduction)
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Graphique CPU avec compression */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            CPU Système (%) - Avec Compression ({chartData.length} points)
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
            CPU Système (%) - Données Brutes (SANS compression)
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

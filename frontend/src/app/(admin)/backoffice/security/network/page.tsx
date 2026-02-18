'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { Activity, Server, Network, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

interface NetworkStats {
  totalConnections: number;
  tcpConnections: number;
  udpConnections: number;
  connectionsByState: Record<string, number>;
  connectionsByContainer: Record<string, number>;
  topSourceIps: Record<string, number>;
  topDestinationPorts: Record<string, number>;
  timestamp: string;
}

export default function NetworkStatsPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ OPTIMISATION : useCallback avec cache
  const loadStats = useCallback(async () => {
    try {
      // ✅ OPTIMISATION : Vérifier le cache d'abord
      const cacheKey = 'network_stats_cache'
      const cached = sessionStorage.getItem(cacheKey)
      const cacheTime = cached ? JSON.parse(cached).timestamp : 0
      const now = Date.now()
      
      // Utiliser le cache si moins de 10 secondes
      if (cached && (now - cacheTime) < 10000 && !loading) {
        const cachedData = JSON.parse(cached).data
        setStats(cachedData)
        // Rafraîchir en arrière-plan
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/network/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 5000 // ✅ OPTIMISATION : Timeout de 5 secondes
      });
      if (response.data.success) {
        const statsData = response.data.data.stats
        setStats(statsData)
        // ✅ OPTIMISATION : Mettre en cache
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: statsData,
          timestamp: now
        }))
      } else {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (err: any) {
      console.error('Erreur chargement stats réseau:', err);
      // ✅ OPTIMISATION : Utiliser le cache en cas d'erreur
      const cacheKey = 'network_stats_cache'
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const cachedData = JSON.parse(cached).data
        setStats(cachedData)
      }
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadStats();
    // ✅ OPTIMISATION : Rafraîchir toutes les 45 secondes au lieu de 30
    const interval = setInterval(loadStats, 45000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const getTopItems = (items: Record<string, number>, limit: number = 10) => {
    return Object.entries(items)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Network className="h-8 w-8" />
              Réseau (sécurité)
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Statistiques réseau orientées sécurité : connexions, IPs, ports, conteneurs.
            </p>
          </div>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Actualiser
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connexions Totales</p>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats?.totalConnections || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString('fr-FR') : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connexions TCP</p>
              <Network className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats?.tcpConnections || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.totalConnections ? 
                Math.round((stats.tcpConnections / stats.totalConnections) * 100) : 0}% du total
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connexions UDP</p>
              <Network className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats?.udpConnections || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.totalConnections ? 
                Math.round((stats.udpConnections / stats.totalConnections) * 100) : 0}% du total
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connexions Actives</p>
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {stats?.connectionsByState?.ESTABLISHED || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Établies
            </p>
          </div>
        </div>

        {/* Connexions par conteneur */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-6 w-6" />
            Connexions par Conteneur
          </h2>
          {stats?.connectionsByContainer && Object.keys(stats.connectionsByContainer).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Conteneur</th>
                    <th className="text-left p-3">Connexions</th>
                    <th className="text-left p-3">Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopItems(stats.connectionsByContainer).map(([container, count]) => (
                    <tr key={container} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-semibold">{container || 'unknown'}</td>
                      <td className="p-3">{count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${stats.totalConnections ? (count / stats.totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.totalConnections ? 
                              Math.round((count / stats.totalConnections) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune connexion par conteneur détectée</p>
          )}
        </div>

        {/* Top 10 Ports Destination */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top 10 Ports Destination</h2>
          {stats?.topDestinationPorts && Object.keys(stats.topDestinationPorts).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Port</th>
                    <th className="text-left p-3">Connexions</th>
                    <th className="text-left p-3">Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopItems(stats.topDestinationPorts, 10).map(([port, count]) => (
                    <tr key={port} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono font-semibold">{port}</td>
                      <td className="p-3">{count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${stats.totalConnections ? (count / stats.totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.totalConnections ? 
                              Math.round((count / stats.totalConnections) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucun port destination détecté</p>
          )}
        </div>

        {/* Connexions par état */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Connexions par État</h2>
          {stats?.connectionsByState && Object.keys(stats.connectionsByState).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.connectionsByState).map(([state, count]) => (
                <div key={state} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{state}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune connexion par état détectée</p>
          )}
        </div>

        {/* Top IPs Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top 10 IPs Sources</h2>
          {stats?.topSourceIps && Object.keys(stats.topSourceIps).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">IP Source</th>
                    <th className="text-left p-3">Connexions</th>
                    <th className="text-left p-3">Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopItems(stats.topSourceIps, 10).map(([ip, count]) => (
                    <tr key={ip} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono text-sm">{ip}</td>
                      <td className="p-3">{count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-orange-600 h-2 rounded-full"
                              style={{
                                width: `${stats.totalConnections ? (count / stats.totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.totalConnections ? 
                              Math.round((count / stats.totalConnections) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune IP source détectée</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

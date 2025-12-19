'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { Network, RefreshCw, Server, Activity } from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

interface Connection {
  localIp: string;
  localPort: number;
  remoteIp: string;
  remotePort: number;
  protocol: string;
  state: string;
  containerId?: string;
  containerName?: string;
}

export default function NetworkPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);

  const loadNetworkStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/network/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setStats(response.data.data.stats);
        setConnections(response.data.data.connections || []);
      }
    } catch (err: any) {
      console.error('Erreur chargement stats réseau:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNetworkStats();
    const interval = setInterval(loadNetworkStats, 10000); // Rafraîchir toutes les 10 secondes
    return () => clearInterval(interval);
  }, [loadNetworkStats]);

  const containerStats = selectedContainer
    ? connections.filter(c => c.containerId === selectedContainer || c.containerName?.includes(selectedContainer))
    : connections;

  const chartData = Object.entries(stats?.connectionsByContainer || {}).map(([name, count]) => ({
    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
    connections: count
  }));

  const topIpsData = Object.entries(stats?.topSourceIps || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const topPortsData = Object.entries(stats?.topDestinationPorts || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([port, count]) => ({ port, count }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Network className="h-8 w-8" />
              Réseau
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Statistiques réseau et connexions actives
            </p>
          </div>
          <button
            onClick={loadNetworkStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : !stats ? (
          <div className="text-center py-8 text-gray-500">Aucune donnée réseau disponible</div>
        ) : (
          <>
            {/* Statistiques globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connexions totales</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalConnections}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <Server className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TCP</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.tcpConnections}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <Server className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">UDP</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.udpConnections}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <Network className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conteneurs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {Object.keys(stats.connectionsByContainer).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connexions par conteneur */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Connexions par conteneur</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="connections" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top IPs sources */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Top 10 IPs sources</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topIpsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ip" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top ports */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top 10 ports destination</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPortsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="port" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Connexions actives */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Connexions actives</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3">Protocole</th>
                      <th className="text-left p-3">IP Source</th>
                      <th className="text-left p-3">Port Source</th>
                      <th className="text-left p-3">IP Dest</th>
                      <th className="text-left p-3">Port Dest</th>
                      <th className="text-left p-3">État</th>
                      <th className="text-left p-3">Conteneur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containerStats.slice(0, 50).map((conn, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="p-3">{conn.protocol}</td>
                        <td className="p-3 font-mono text-sm">{conn.remoteIp}</td>
                        <td className="p-3">{conn.remotePort}</td>
                        <td className="p-3 font-mono text-sm">{conn.localIp}</td>
                        <td className="p-3">{conn.localPort}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            conn.state === 'ESTABLISHED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            conn.state === 'LISTEN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {conn.state}
                          </span>
                        </td>
                        <td className="p-3">{conn.containerName || conn.containerId || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}


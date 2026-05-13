'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { FRONTEND_URLS } from '@/config/ports.config';
import { Activity, Server, Network, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_GATEWAY_URL = FRONTEND_URLS.api;

interface ContainerCorrelation {
  unmapped: number;
  hostLayer: number;
  dockerNamed: number;
  total: number;
  unmappedPercent: number;
  hostLayerPercent: number;
  dockerNamedPercent: number;
}

interface NetworkStats {
  totalConnections: number;
  tcpConnections: number;
  udpConnections: number;
  connectionsByState: Record<string, number>;
  connectionsByContainer: Record<string, number>;
  topSourceIps: Record<string, number>;
  topDestinationPorts: Record<string, number>;
  unmappedConnections?: number;
  containerCorrelation?: ContainerCorrelation;
  correlationHint?: string;
  timestamp: string;
}

const SUSPICIOUS_PORTS = new Set(['21', '22', '23', '3389', '5900', '1433', '3306']);

function getIpNature(ip: string): string {
  if (ip === '::1' || ip.startsWith('127.')) return 'localhost';
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return 'privée / Docker';
  const secondOctet = Number(ip.split('.')[1]);
  if (ip.startsWith('172.') && secondOctet >= 16 && secondOctet <= 31) return 'privée / Docker';
  if (ip.startsWith('169.254.')) return 'link-local';
  return 'publique ou NAT';
}

function getIpMonitoringReason(ip: string, count: number, suspiciousIpThreshold: number): string {
  if (count >= suspiciousIpThreshold) return `volume >= seuil ${suspiciousIpThreshold}`;
  if (getIpNature(ip) !== 'publique ou NAT') return 'trafic interne visible';
  return 'top source observée';
}

export default function NetworkStatsPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portFilter, setPortFilter] = useState<string>('');
  const [minConnectionsAlert, setMinConnectionsAlert] = useState<number>(100);
  const [suspiciousIpThreshold, setSuspiciousIpThreshold] = useState<number>(20);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const refreshInFlightRef = useRef(false);

  const loadStats = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/network/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 5000 // ✅ OPTIMISATION : Timeout de 5 secondes
      });
      if (response.data.success) {
        const statsData = response.data.data.stats
        setStats(statsData)
      } else {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (err: any) {
      console.error('Erreur chargement stats réseau:', err);
      setStats(null);
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

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

  const suspiciousPorts = stats?.topDestinationPorts
    ? Object.entries(stats.topDestinationPorts).filter(([port]) => SUSPICIOUS_PORTS.has(port)).sort((a, b) => b[1] - a[1])
    : [];

  const suspiciousIps = stats?.topSourceIps
    ? Object.entries(stats.topSourceIps).filter(([ip, count]) => count >= suspiciousIpThreshold || ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')).sort((a, b) => b[1] - a[1]).slice(0, 10)
    : [];
  const totalConnections = stats?.totalConnections ?? 0;
  const monitoredSourceIps = useMemo(
    () =>
      stats?.topSourceIps
        ? Object.entries(stats.topSourceIps)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({
              ip,
              count,
              nature: getIpNature(ip),
              reason: getIpMonitoringReason(ip, count, suspiciousIpThreshold),
            }))
        : [],
    [stats?.topSourceIps, suspiciousIpThreshold]
  );

  const securityAlerts = [
    stats?.totalConnections && stats.totalConnections > minConnectionsAlert
      ? `Volume réseau élevé (${stats.totalConnections} connexions > seuil ${minConnectionsAlert})`
      : null,
    suspiciousPorts.length > 0 ? `${suspiciousPorts.length} port(s) sensible(s) détecté(s)` : null,
    suspiciousIps.length > 0 ? `${suspiciousIps.length} IP source(s) à surveiller` : null,
  ].filter(Boolean) as string[];

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

        {stats?.containerCorrelation && stats.totalConnections > 0 && (
          <div
            className={`rounded-lg border p-4 ${
              (stats.containerCorrelation.unmappedPercent ?? 0) >= 45
                ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            }`}
          >
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Corrélation conteneurs (actionnable)</h2>
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
              Part des sockets classées : <strong>nom Docker / identifiant</strong> {stats.containerCorrelation.dockerNamedPercent}% ·{' '}
              <strong>couche hôte / port</strong> (local, port:N…) {stats.containerCorrelation.hostLayerPercent}% ·{' '}
              <strong>non résolu</strong> {stats.containerCorrelation.unmappedPercent}%
            </p>
            {stats.correlationHint && (
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">{stats.correlationHint}</p>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Paramètres sécurité réseau</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seuil volume connexions (alerte)</label>
              <input
                type="number"
                min="1"
                value={minConnectionsAlert}
                onChange={(e) => setMinConnectionsAlert(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Seuil IP suspecte (nb connexions)</label>
              <input
                type="number"
                min="1"
                value={suspiciousIpThreshold}
                onChange={(e) => setSuspiciousIpThreshold(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlySuspicious}
                  onChange={(e) => setShowOnlySuspicious(e.target.checked)}
                />
                <span className="text-sm">Afficher uniquement les ports sensibles</span>
              </label>
            </div>
          </div>
          <div className="mt-4">
            {securityAlerts.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-300">Aucune alerte réseau active avec vos seuils actuels.</p>
            ) : (
              <ul className="space-y-1">
                {securityAlerts.map((alert) => (
                  <li key={alert} className="text-sm text-amber-700 dark:text-amber-300">- {alert}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

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

        {/* Analyse sécurité réseau */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Analyse sécurité réseau</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded border border-orange-200 dark:border-orange-900 p-4 bg-orange-50 dark:bg-orange-900/20">
              <p className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Ports sensibles observés</p>
              {suspiciousPorts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">Aucun port sensible observé dans les top connexions.</p>
              ) : (
                <ul className="space-y-1">
                  {suspiciousPorts.map(([port, count]) => (
                    <li key={port} className="flex justify-between"><span>Port {port}</span><span className="font-semibold">{count}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded border border-red-200 dark:border-red-900 p-4 bg-red-50 dark:bg-red-900/20">
              <p className="font-semibold text-red-800 dark:text-red-200 mb-2">Sources à surveiller</p>
              {suspiciousIps.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">Aucune source anormale détectée.</p>
              ) : (
                <ul className="space-y-1">
                  {suspiciousIps.map(([ip, count]) => (
                    <li key={ip} className="flex justify-between"><span className="font-mono">{ip}</span><span className="font-semibold">{count}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {(stats?.unmappedConnections || 0) > 0 && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              {stats?.unmappedConnections} connexion(s) n&apos;ont pas pu être rattachées à un conteneur (label `unmapped`).
              Vérifie les namespaces réseau Docker pour améliorer la corrélation.
            </p>
          )}
        </div>

        {/* Connexions par conteneur */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-6 w-6" />
            Connexions par conteneur ou indice
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Les libellés viennent du moteur de corrélation (Docker, port d&apos;écoute, hôte). Ce ne sont pas des conteneurs « unknown » opaques : un pic sur « port:… » ou « host-network » est attendu si le service tourne sur l&apos;hôte vu depuis /proc.
          </p>
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
                      <td className="p-3 font-semibold">
                        {container === 'unmapped' ? 'non-corrélé (à qualifier)' : container || 'non-corrélé (à qualifier)'}
                      </td>
                      <td className="p-3">{count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${stats?.totalConnections ? (count / stats.totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stats?.totalConnections ?
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top 10 Ports Destination</h2>
            <input
              value={portFilter}
              onChange={(e) => setPortFilter(e.target.value)}
              placeholder="Filtrer un port"
              className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
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
                  {getTopItems(stats.topDestinationPorts, 10)
                    .filter(([port]) => !portFilter || port.includes(portFilter))
                    .filter(([port]) => !showOnlySuspicious || SUSPICIOUS_PORTS.has(port))
                    .map(([port, count]) => (
                    <tr key={port} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono font-semibold">{port}</td>
                      <td className="p-3">{count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${totalConnections ? (count / totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {totalConnections ?
                              Math.round((count / totalConnections) * 100) : 0}%
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
          <h2 className="text-xl font-semibold mb-2">IPs sources surveillées</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Liste actionnable des IPs observées côté ingress/gateway: nature réseau, motif de surveillance et filtre direct vers les menaces.
          </p>
          {monitoredSourceIps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">IP Source</th>
                    <th className="text-left p-3">Nature</th>
                    <th className="text-left p-3">Connexions</th>
                    <th className="text-left p-3">Motif</th>
                    <th className="text-left p-3">Pourcentage</th>
                    <th className="text-left p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredSourceIps.map(({ ip, count, nature, reason }) => (
                    <tr key={ip} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono text-sm">{ip}</td>
                      <td className="p-3 text-sm">{nature}</td>
                      <td className="p-3">{count}</td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{reason}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-orange-600 h-2 rounded-full"
                              style={{
                                width: `${totalConnections ? (count / totalConnections) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {totalConnections ?
                              Math.round((count / totalConnections) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/b4ck0ff1ce/security/threats?sourceIp=${encodeURIComponent(ip)}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Voir menaces
                        </Link>
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

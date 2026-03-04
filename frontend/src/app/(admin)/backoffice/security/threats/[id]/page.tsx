'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import { formatLocalDateTime } from '@/lib/utils/date';
import { ArrowLeft, AlertTriangle, Shield, Ban, Clock, MapPin, Server, Activity } from 'lucide-react';
import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

interface NetworkThreat {
  id: string;
  threatType: string;
  sourceIp: string;
  destIp?: string;
  destPort?: number;
  severity: string;
  detectedAt: string;
  blocked: boolean;
  metadata?: any;
}

export default function ThreatDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [threat, setThreat] = useState<NetworkThreat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadThreat = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/threats/${params.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.success) {
          setThreat(response.data.data);
        } else {
          setError('Menace non trouvée');
        }
      } catch (err: any) {
        console.error('Erreur chargement menace:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement de la menace');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadThreat();
    }
  }, [params.id]);

  const handleBlock = async () => {
    if (!confirm('Êtes-vous sûr de vouloir bloquer cette menace ?')) return;
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/threats/${params.id}/block`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      router.push('/backoffice/security/threats');
    } catch (err: any) {
      console.error('Erreur blocage menace:', err);
      alert('Erreur lors du blocage de la menace');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getThreatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SYN_FLOOD': 'SYN Flood',
      'PORT_SCAN': 'Port Scanning',
      'BRUTE_FORCE': 'Brute Force',
      'DDoS': 'DDoS Attack'
    };
    return labels[type] || type;
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

  if (error || !threat) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.push('/backoffice/security/threats')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour aux menaces
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">{error || 'Menace non trouvée'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const metadata = threat.metadata || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/backoffice/security/threats')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                Détails de la Menace
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {getThreatTypeLabel(threat.threatType)}
              </p>
            </div>
          </div>
          {!threat.blocked && (
            <button
              onClick={handleBlock}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Ban className="h-5 w-5" />
              Bloquer cette menace
            </button>
          )}
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Informations Générales
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type de menace</p>
                <p className="font-semibold text-lg">{getThreatTypeLabel(threat.threatType)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sévérité</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getSeverityColor(threat.severity)}`}>
                  {threat.severity}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
                <p className="font-semibold">
                  {threat.blocked ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <Ban className="h-4 w-4" />
                      Bloqué
                    </span>
                  ) : (
                    <span className="text-yellow-600">Non bloqué</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Détecté le</p>
                <p className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatLocalDateTime(threat.detectedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Adresses IP
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">IP Source</p>
                <p className="font-mono text-lg font-semibold">{threat.sourceIp}</p>
              </div>
              {threat.destIp && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">IP Destination</p>
                  <p className="font-mono text-lg font-semibold">{threat.destIp}</p>
                </div>
              )}
              {threat.destPort && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Port Destination</p>
                  <p className="font-semibold text-lg">{threat.destPort}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détails de la menace */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Détails de l'Attaque
          </h2>
          <div className="space-y-4">
            {metadata.message && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Message</p>
                <p className="font-semibold">{metadata.message}</p>
              </div>
            )}
            {metadata.count && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre de tentatives</p>
                <p className="font-semibold text-lg">{metadata.count}</p>
              </div>
            )}
            {metadata.ports && metadata.ports.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ports ciblés</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.ports.map((port: number, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded text-sm font-mono">
                      {port}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {metadata.protocols && metadata.protocols.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Protocoles utilisés</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.protocols.map((proto: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded text-sm">
                      {proto}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {metadata.totalConnections && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Connexions totales</p>
                <p className="font-semibold text-lg">{metadata.totalConnections}</p>
              </div>
            )}
            {metadata.containerInfo && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conteneur affecté</p>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <p className="font-semibold">{metadata.containerInfo.containerName}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connexions détaillées */}
        {metadata.connectionDetails && metadata.connectionDetails.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Connexions Détectées</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">IP Locale</th>
                    <th className="text-left p-3">Port Local</th>
                    <th className="text-left p-3">Port Distant</th>
                    <th className="text-left p-3">Protocole</th>
                    <th className="text-left p-3">État</th>
                  </tr>
                </thead>
                <tbody>
                  {metadata.connectionDetails.map((conn: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono text-sm">{conn.localIp}</td>
                      <td className="p-3">{conn.localPort}</td>
                      <td className="p-3">{conn.remotePort}</td>
                      <td className="p-3">{conn.protocol}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {conn.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Métadonnées brutes (pour debug) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Métadonnées Complètes</h2>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      </div>
    </AdminLayout>
  );
}


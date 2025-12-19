'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { AlertTriangle, Shield, Ban, RefreshCw, Eye } from 'lucide-react';
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

export default function ThreatsPage() {
  const [threats, setThreats] = useState<NetworkThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const loadThreats = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (severityFilter) params.severity = severityFilter;
      
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/threats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        params
      });
      if (response.data.success) {
        setThreats(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.error('Erreur chargement menaces:', err);
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter]);

  useEffect(() => {
    loadThreats();
    const interval = setInterval(loadThreats, 30000); // Rafraîchir toutes les 30 secondes
    return () => clearInterval(interval);
  }, [loadThreats]);

  const handleBlockThreat = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir bloquer cette menace ?')) return;
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/threats/${id}/block`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadThreats();
    } catch (err: any) {
      console.error('Erreur blocage menace:', err);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-8 w-8" />
              Menaces Réseau
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Menaces réseau détectées et bloquées
            </p>
          </div>
          <button
            onClick={loadThreats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filtrer par sévérité:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Toutes</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        {/* Liste des menaces */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : threats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune menace détectée</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">IP Source</th>
                      <th className="text-left p-3">Port Dest</th>
                      <th className="text-left p-3">Sévérité</th>
                      <th className="text-left p-3">Détecté le</th>
                      <th className="text-left p-3">Statut</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.map((threat) => (
                      <tr key={threat.id} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="p-3">
                          <span className="font-semibold">{getThreatTypeLabel(threat.threatType)}</span>
                        </td>
                        <td className="p-3 font-mono text-sm">{threat.sourceIp}</td>
                        <td className="p-3">{threat.destPort || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-sm ${getSeverityColor(threat.severity)}`}>
                            {threat.severity}
                          </span>
                        </td>
                        <td className="p-3">
                          {new Date(threat.detectedAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3">
                          {threat.blocked ? (
                            <span className="flex items-center gap-1 text-red-600">
                              <Ban className="h-4 w-4" />
                              Bloqué
                            </span>
                          ) : (
                            <span className="text-gray-500">Non bloqué</span>
                          )}
                        </td>
                        <td className="p-3">
                          {!threat.blocked && (
                            <button
                              onClick={() => handleBlockThreat(threat.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                            >
                              <Ban className="h-4 w-4" />
                              Bloquer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total: {total} menaces
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span className="px-3 py-1">Page {page}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={threats.length < 50}
                    className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


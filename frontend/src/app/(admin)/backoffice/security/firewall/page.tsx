'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { Shield, Plus, Trash2, Edit, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  sourceIp?: string;
  destPort?: number;
  protocol: string;
  action: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlockedIp {
  ip: string;
}

export default function FirewallPage() {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    sourceIp: '',
    destPort: '',
    protocol: 'TCP',
    action: 'DENY',
    priority: 100
  });

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/rules`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setRules(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlockedIps = useCallback(async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/blocked-ips`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setBlockedIps(response.data.data?.map((ip: string) => ({ ip })) || []);
      }
    } catch (err) {
      console.error('Erreur chargement IPs bloquées:', err);
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadBlockedIps();
    const interval = setInterval(() => {
      loadRules();
      loadBlockedIps();
    }, 30000); // Rafraîchir toutes les 30 secondes
    return () => clearInterval(interval);
  }, [loadRules, loadBlockedIps]);

  const handleCreateRule = async () => {
    try {
      const ruleData = {
        ...newRule,
        destPort: newRule.destPort ? parseInt(newRule.destPort) : undefined,
        sourceIp: newRule.sourceIp || undefined
      };
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/rules`, ruleData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddRule(false);
      setNewRule({
        name: '',
        description: '',
        sourceIp: '',
        destPort: '',
        protocol: 'TCP',
        action: 'DENY',
        priority: 100
      });
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création de la règle');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;
    try {
      await axios.delete(`${API_GATEWAY_URL}/api/v1/security/firewall/rules/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression de la règle');
    }
  };

  const handleBlockIp = async (ip: string) => {
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/block-ip`, { ip }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadBlockedIps();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du blocage de l\'IP');
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/unblock-ip`, { ip }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadBlockedIps();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du déblocage de l\'IP');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Firewall
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestion des règles de firewall et des IPs bloquées
            </p>
          </div>
          <button
            onClick={() => { loadRules(); loadBlockedIps(); }}
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

        {/* Règles de Firewall */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Règles de Firewall
            </h2>
            <button
              onClick={() => setShowAddRule(!showAddRule)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Ajouter une règle
            </button>
          </div>

          {showAddRule && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Nouvelle règle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom *</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Protocole *</label>
                  <select
                    value={newRule.protocol}
                    onChange={(e) => setNewRule({ ...newRule, protocol: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Action *</label>
                  <select
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">IP Source (CIDR)</label>
                  <input
                    type="text"
                    value={newRule.sourceIp}
                    onChange={(e) => setNewRule({ ...newRule, sourceIp: e.target.value })}
                    placeholder="192.168.1.0/24"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Port Destination</label>
                  <input
                    type="number"
                    value={newRule.destPort}
                    onChange={(e) => setNewRule({ ...newRule, destPort: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priorité</label>
                  <input
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCreateRule}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Créer
                </button>
                <button
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune règle de firewall</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Nom</th>
                    <th className="text-left p-3">Protocole</th>
                    <th className="text-left p-3">IP Source</th>
                    <th className="text-left p-3">Port</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Priorité</th>
                    <th className="text-left p-3">Statut</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3">{rule.name}</td>
                      <td className="p-3">{rule.protocol}</td>
                      <td className="p-3">{rule.sourceIp || 'Toutes'}</td>
                      <td className="p-3">{rule.destPort || 'Tous'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          rule.action === 'ALLOW' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          rule.action === 'DENY' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {rule.action}
                        </span>
                      </td>
                      <td className="p-3">{rule.priority}</td>
                      <td className="p-3">
                        {rule.enabled ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* IPs Bloquées */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            IPs Bloquées
          </h2>
          {blockedIps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune IP bloquée</div>
          ) : (
            <div className="space-y-2">
              {blockedIps.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="font-mono">{item.ip}</span>
                  <button
                    onClick={() => handleUnblockIp(item.ip)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Débloquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { TableSkeleton } from "@/lib/ui";
import { SecuritySubNav } from "../SecuritySubNav";
import { Pagination } from "@/components/ui/Pagination";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { FRONTEND_URLS } from "@/config/ports.config";
import { formatLocalDateTime } from "@/lib/utils/date";
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import axios from "axios";

const API_GATEWAY_URL = FRONTEND_URLS.api;

/** Bandeau : vérifie Gateway + proxy /api/v1/security/* (GET firewall/rules : moins sensible au WAF que /waf/stats). */
function SecurityBackendStatusStrip() {
  const [state, setState] = useState<"loading" | "ok" | "warn" | "err">(
    "loading",
  );
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    const probeSecurity = async () => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      // Préférer une route « admin » volumineuse mais stable ; évite faux « service unavailable » si WAF touche /waf/stats
      return axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/rules`, {
        timeout: 12000,
        headers,
        validateStatus: () => true,
      });
    };

    (async () => {
      try {
        const h = await axios.get(`${API_GATEWAY_URL}/health`, {
          timeout: 8000,
        });
        if (!alive) return;
        if (h.status !== 200) {
          setState("err");
          setMsg(`API Gateway ne répond pas correctement (HTTP ${h.status}).`);
          return;
        }
        let w = await probeSecurity();
        if (!alive) return;
        // Redémarrage Docker : une 2e tentative après 1s évite ENOTFOUND / 503 transitoires
        if (w.status === 503 || w.status === 502) {
          await new Promise((r) => setTimeout(r, 1000));
          if (!alive) return;
          w = await probeSecurity();
        }
        if (!alive) return;
        const dataOk =
          w.status === 200 &&
          (w.data?.success === true ||
            w.data?.success === undefined ||
            Array.isArray(w.data?.data) ||
            Array.isArray(w.data?.rules));
        if (dataOk) {
          setState("ok");
          setMsg(
            "API Gateway et routes /api/v1/security/* répondent (proxy vers security-service). Le backoffice utilise le port API Gateway (ex. 5002), pas le port direct du security-service (5017).",
          );
        } else if (w.status === 403) {
          setState("warn");
          setMsg(
            "API Gateway OK, mais une requête de contrôle a été bloquée par le WAF (403). Connectez-vous au backoffice ou ajustez les règles WAF.",
          );
        } else {
          setState("warn");
          setMsg(
            `API Gateway OK, mais le proxy security a renvoyé HTTP ${w.status}. Vérifiez que le conteneur jobbingtrack-security-service est démarré (make status).`,
          );
        }
      } catch (e: unknown) {
        if (!alive) return;
        setState("err");
        setMsg(e instanceof Error ? e.message : "Réseau indisponible");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const box =
    state === "ok"
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 text-green-900 dark:text-green-100"
      : state === "warn"
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-900 dark:text-amber-100"
        : state === "err"
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-900 dark:text-red-100"
          : "bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-700";

  return (
    <div className={`rounded-lg border p-4 text-sm ${box}`}>
      <p className="font-semibold mb-1">Connexion sécurité (via API Gateway)</p>
      {state === "loading" && <p>Vérification en cours…</p>}
      {state !== "loading" && <p>{msg}</p>}
    </div>
  );
}

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
  reason?: string;
  blockedAt?: string;
  blockOrigin?: string;
  threatId?: string;
}

function formatBlockedIpsOriginsSubtitle(byOrigin: unknown): string {
  if (!byOrigin || typeof byOrigin !== "object") return "";
  const o = byOrigin as Record<string, number>;
  const parts: string[] = [];
  if (o.manual_rule) parts.push(`manuel ${o.manual_rule}`);
  if (o.lab_simulation) parts.push(`lab ${o.lab_simulation}`);
  if (o.automatic_threat) parts.push(`auto ${o.automatic_threat}`);
  if (o.iptables) parts.push(`iptables ${o.iptables}`);
  if (o.log_inferred) parts.push(`logs ${o.log_inferred}`);
  return parts.join(" · ");
}

const BLOCKED_IPS_PAGE_SIZE = 25;

export default function FirewallPage() {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [blockedIpsTotal, setBlockedIpsTotal] = useState(0);
  const { page: blockedPage, setPage: setBlockedPage } = useUrlPagination(
    "blockedPage",
    1,
  );
  const [blockedIpsMeta, setBlockedIpsMeta] = useState<{
    byOrigin?: Record<string, number>;
    count?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [showAddBlockedIp, setShowAddBlockedIp] = useState(false);
  const [newBlockedIp, setNewBlockedIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    sourceIp: "",
    destPort: "",
    protocol: "TCP",
    action: "DENY",
    priority: 100,
  });
  const SAFE_TEST_IP = "203.0.113.77";

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/v1/security/firewall/rules`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (response.data.success) {
        setRules(response.data.data || []);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Erreur lors du chargement des règles",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlockedIps = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/v1/security/firewall/blocked-ips`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: { page: blockedPage, limit: BLOCKED_IPS_PAGE_SIZE },
        },
      );
      if (response.data.success) {
        setBlockedIpsMeta(
          response.data.meta && typeof response.data.meta === "object"
            ? response.data.meta
            : null,
        );
        const pagination = response.data.meta?.pagination;
        setBlockedIpsTotal(
          typeof pagination?.total === "number"
            ? pagination.total
            : typeof response.data.meta?.count === "number"
              ? response.data.meta.count
              : 0,
        );
        setBlockedIps(
          response.data.data?.map((item: string | BlockedIp) => {
            if (typeof item === "string") {
              return { ip: item };
            }
            return item;
          }) || [],
        );
      }
    } catch (err) {
      console.error("Erreur chargement IPs bloquées:", err);
    }
  }, [blockedPage]);

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
        sourceIp: newRule.sourceIp || undefined,
      };
      await axios.post(
        `${API_GATEWAY_URL}/api/v1/security/firewall/rules`,
        ruleData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setShowAddRule(false);
      setNewRule({
        name: "",
        description: "",
        sourceIp: "",
        destPort: "",
        protocol: "TCP",
        action: "DENY",
        priority: 100,
      });
      loadRules();
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Erreur lors de la création de la règle",
      );
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) return;
    try {
      await axios.delete(
        `${API_GATEWAY_URL}/api/v1/security/firewall/rules/${id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      loadRules();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Erreur lors de la suppression de la règle",
      );
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    try {
      await axios.put(
        `${API_GATEWAY_URL}/api/v1/security/firewall/rules/${editingRule.id}`,
        {
          name: editingRule.name,
          description: editingRule.description,
          sourceIp: editingRule.sourceIp || undefined,
          destPort: editingRule.destPort || undefined,
          protocol: editingRule.protocol,
          action: editingRule.action,
          priority: editingRule.priority,
          enabled: editingRule.enabled,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setEditingRule(null);
      loadRules();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Erreur lors de la mise à jour de la règle",
      );
    }
  };

  const handleBlockIp = async (ip: string, reason?: string, mode?: string) => {
    try {
      await axios.post(
        `${API_GATEWAY_URL}/api/v1/security/firewall/block-ip`,
        { ip, reason, ...(mode ? { mode } : {}) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      loadBlockedIps();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors du blocage de l'IP");
    }
  };

  const handleAddBlockedIp = async () => {
    if (!newBlockedIp.trim()) {
      setError("Veuillez entrer une adresse IP");
      return;
    }

    // Validation basique de l'IP
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newBlockedIp.trim())) {
      setError("Adresse IP invalide");
      return;
    }

    const lab = newBlockedIp.trim() === SAFE_TEST_IP;
    await handleBlockIp(
      newBlockedIp.trim(),
      blockReason.trim() || undefined,
      lab ? "lab_simulation" : undefined,
    );
    setNewBlockedIp("");
    setBlockReason("");
    setShowAddBlockedIp(false);
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      await axios.post(
        `${API_GATEWAY_URL}/api/v1/security/firewall/unblock-ip`,
        { ip },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      loadBlockedIps();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors du déblocage de l'IP");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />
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
            onClick={() => {
              loadRules();
              loadBlockedIps();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Actualiser
          </button>
        </div>

        <SecurityBackendStatusStrip />

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
              <h3 className="text-lg font-semibold mb-2">
                Nouvelle règle de firewall
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Créez une règle pour bloquer ou autoriser le trafic réseau. Les
                règles sont appliquées via iptables.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nom de la règle *
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (ex: "Bloquer port 9999")
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) =>
                      setNewRule({ ...newRule, name: e.target.value })
                    }
                    placeholder="Ex: Bloquer port SSH"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Protocole *
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (TCP, UDP, ou ICMP)
                    </span>
                  </label>
                  <select
                    value={newRule.protocol}
                    onChange={(e) =>
                      setNewRule({ ...newRule, protocol: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  >
                    <option value="TCP">
                      TCP (Transmission Control Protocol)
                    </option>
                    <option value="UDP">UDP (User Datagram Protocol)</option>
                    <option value="ICMP">
                      ICMP (Internet Control Message Protocol)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (optionnel)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newRule.description}
                    onChange={(e) =>
                      setNewRule({ ...newRule, description: e.target.value })
                    }
                    placeholder="Ex: Bloquer l'accès au port de test"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Action *
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (comportement de la règle)
                    </span>
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) =>
                      setNewRule({ ...newRule, action: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  >
                    <option value="DENY">
                      DENY - Bloquer silencieusement (DROP)
                    </option>
                    <option value="REJECT">
                      REJECT - Rejeter avec message d'erreur
                    </option>
                    <option value="ALLOW">
                      ALLOW - Autoriser explicitement
                    </option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    DENY: Le paquet est supprimé sans réponse. REJECT: Le paquet
                    est rejeté avec un message ICMP.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    IP Source
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (optionnel - CIDR accepté)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newRule.sourceIp}
                    onChange={(e) =>
                      setNewRule({ ...newRule, sourceIp: e.target.value })
                    }
                    placeholder="192.168.1.100 ou 10.0.0.0/8"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Laissez vide pour appliquer à toutes les IPs sources
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Port Destination
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (optionnel - 1-65535)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={newRule.destPort}
                    onChange={(e) =>
                      setNewRule({ ...newRule, destPort: e.target.value })
                    }
                    placeholder="80, 443, 8080, 9999..."
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Laissez vide pour appliquer à tous les ports
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priorité
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (1-1000, plus bas = priorité plus haute)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newRule.priority}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        priority: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Défaut: 100. Les règles avec priorité plus basse sont
                    évaluées en premier.
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  💡 Exemple de règle :
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Nom:</strong> "Bloquer port SSH" |{" "}
                  <strong>Protocole:</strong> TCP |<strong> Port:</strong> 22 |{" "}
                  <strong>Action:</strong> DENY
                  <br />→ Cette règle bloquera toutes les connexions TCP sur le
                  port 22 (SSH)
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCreateRule}
                  disabled={
                    !newRule.name || !newRule.protocol || !newRule.action
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Créer la règle
                </button>
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewRule({
                      name: "",
                      description: "",
                      sourceIp: "",
                      destPort: "",
                      protocol: "TCP",
                      action: "DENY",
                      priority: 100,
                    });
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {editingRule && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4">Modifier la règle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                  placeholder="Nom"
                />
                <input
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.description || ""}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                />
                <input
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.sourceIp || ""}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, sourceIp: e.target.value })
                  }
                  placeholder="IP source"
                />
                <input
                  type="number"
                  min="1"
                  max="65535"
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.destPort || ""}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      destPort: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                  placeholder="Port destination"
                />
                <select
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.protocol}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, protocol: e.target.value })
                  }
                >
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                </select>
                <select
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.action}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, action: e.target.value })
                  }
                >
                  <option value="DENY">DENY</option>
                  <option value="REJECT">REJECT</option>
                  <option value="ALLOW">ALLOW</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  value={editingRule.priority}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      priority: parseInt(e.target.value || "100", 10),
                    })
                  }
                  placeholder="Priorité"
                />
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule.enabled}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  <span>Règle active</span>
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleUpdateRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune règle de firewall
            </div>
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
                    <tr
                      key={rule.id}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="p-3">{rule.name}</td>
                      <td className="p-3">{rule.protocol}</td>
                      <td className="p-3">{rule.sourceIp || "Toutes"}</td>
                      <td className="p-3">{rule.destPort || "Tous"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            rule.action === "ALLOW"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : rule.action === "DENY"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Modifier la règle"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Supprimer la règle"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* IPs Bloquées */}
        <div
          id="liste-ips-bloquees"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 scroll-mt-24"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              IPs Bloquées
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewBlockedIp(SAFE_TEST_IP);
                  setBlockReason(
                    "Test sécurité contrôlé (IP de documentation RFC5737)",
                  );
                  setShowAddBlockedIp(true);
                }}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              >
                Préparer test sûr
              </button>
              <button
                onClick={() => setShowAddBlockedIp(!showAddBlockedIp)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Bloquer une IP
              </button>
            </div>
          </div>
          {blockedIpsMeta && typeof blockedIpsMeta.count === "number" && (
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
              Liste consolidée :{" "}
              <span className="font-semibold">{blockedIpsMeta.count}</span>{" "}
              entrée(s) unique(s)
              {formatBlockedIpsOriginsSubtitle(blockedIpsMeta.byOrigin) ? (
                <>
                  {" "}
                  — {formatBlockedIpsOriginsSubtitle(blockedIpsMeta.byOrigin)}
                </>
              ) : null}
            </p>
          )}
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Astuce : pour tester sans risque, utilise l&apos;IP de documentation{" "}
            <span className="font-mono">{SAFE_TEST_IP}</span> (RFC 5737). Le
            serveur refuse de bloquer la même IP que celle de ta requête
            (anti-verrouillage) ; le mode lab n&apos;accepte que cette IP de
            test.
          </p>

          {showAddBlockedIp && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                Bloquer une nouvelle IP
              </h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Adresse IP *
                  </label>
                  <input
                    type="text"
                    value={newBlockedIp}
                    onChange={(e) => setNewBlockedIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Raison (optionnel)
                  </label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Tentative d'intrusion"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleAddBlockedIp}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Bloquer l'IP
                </button>
                <button
                  onClick={() => {
                    setShowAddBlockedIp(false);
                    setNewBlockedIp("");
                    setBlockReason("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {blockedIps.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune IP bloquée
            </div>
          ) : (
            <div className="space-y-2">
              {blockedIps.map((item, index) => {
                const o = String(item.blockOrigin || "");
                const originLabel =
                  o === "lab_simulation"
                    ? "Test lab"
                    : o === "manual_rule"
                      ? "Manuel"
                      : o === "automatic_threat"
                        ? "Auto"
                        : o === "iptables"
                          ? "iptables"
                          : o === "log_inferred"
                            ? "Logs"
                            : null;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg">{item.ip}</span>
                        {originLabel && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100">
                            {originLabel}
                          </span>
                        )}
                        {item.threatId && (
                          <Link
                            href={`/b4ck0ff1ce/security/threats/${item.threatId}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                          >
                            Fiche menace
                          </Link>
                        )}
                      </div>
                      {item.blockedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatLocalDateTime(item.blockedAt)}
                        </p>
                      )}
                      {item.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.reason}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockIp(item.ip)}
                      className="px-3 py-1 shrink-0 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Débloquer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {blockedIpsTotal > BLOCKED_IPS_PAGE_SIZE && (
            <Pagination
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              currentPage={blockedPage}
              totalPages={Math.max(
                1,
                Math.ceil(blockedIpsTotal / BLOCKED_IPS_PAGE_SIZE),
              )}
              totalItems={blockedIpsTotal}
              itemsPerPage={BLOCKED_IPS_PAGE_SIZE}
              startIndex={(blockedPage - 1) * BLOCKED_IPS_PAGE_SIZE + 1}
              endIndex={Math.min(
                blockedPage * BLOCKED_IPS_PAGE_SIZE,
                blockedIpsTotal,
              )}
              onPageChange={setBlockedPage}
              onNext={() => setBlockedPage(blockedPage + 1)}
              onPrevious={() => setBlockedPage(blockedPage - 1)}
              canGoNext={blockedPage * BLOCKED_IPS_PAGE_SIZE < blockedIpsTotal}
              canGoPrevious={blockedPage > 1}
            />
          )}
        </div>

        {/* Configuration WAF */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Configuration WAF
            </h2>
          </div>
          <WAFConfigSection />
        </div>
      </div>
    </AdminLayout>
  );
}

// Composant pour la configuration WAF
function WAFConfigSection() {
  const [wafConfig, setWafConfig] = useState<any[]>([]);
  const [wafEnabled, setWafEnabled] = useState(false);
  const [wafStats, setWafStats] = useState<any>(null);
  const [loadingWaf, setLoadingWaf] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wafActionLoading, setWafActionLoading] = useState(false);
  const KNOWN_WAF_RULES = [
    "SQL_INJECTION",
    "XSS",
    "PATH_TRAVERSAL",
    "COMMAND_INJECTION",
    "LDAP_INJECTION",
    "SUSPICIOUS_USER_AGENTS",
    "MALICIOUS_PATTERNS",
    "SUSPICIOUS_HEADERS",
  ];

  const loadWAFConfig = useCallback(async () => {
    try {
      setLoadingWaf(true);
      setError(null);

      // Charger la configuration WAF depuis security-service
      const [configRes, statsRes] = await Promise.all([
        axios
          .get(`${API_GATEWAY_URL}/api/v1/security/waf/config`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          .catch(() => ({
            data: { success: false, data: { enabled: false, rules: [] } },
          })),
        axios
          .get(`${API_GATEWAY_URL}/api/v1/security/waf/stats`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          .catch(() => ({ data: { success: false, data: null } })),
      ]);

      if (configRes.data.success) {
        setWafConfig(configRes.data.data.rules || []);
        setWafEnabled(configRes.data.data.enabled || false);
      }

      if (statsRes.data.success) {
        setWafStats(statsRes.data.data);
      }
    } catch (err: any) {
      console.error("Erreur chargement config WAF:", err);
      setError(
        err.response?.data?.error ||
          "Erreur lors du chargement de la configuration WAF",
      );
    } finally {
      setLoadingWaf(false);
    }
  }, []);

  const handleToggleWafRule = useCallback(
    async (ruleName: string, enabled: boolean) => {
      try {
        await axios.put(
          `${API_GATEWAY_URL}/api/v1/security/waf/rules/${ruleName}`,
          { enabled },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        loadWAFConfig();
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            `Erreur lors de la mise à jour de la règle WAF ${ruleName}`,
        );
      }
    },
    [loadWAFConfig],
  );

  const handleToggleWafEnabled = useCallback(async (enabled: boolean) => {
    try {
      await axios.put(
        `${API_GATEWAY_URL}/api/v1/security/waf/toggle`,
        { enabled },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setWafEnabled(enabled);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          `Erreur lors de l'activation/désactivation du WAF`,
      );
    }
  }, []);

  const handleSetAllWafRules = useCallback(
    async (enabled: boolean) => {
      try {
        setWafActionLoading(true);
        setError(null);
        await Promise.all(
          KNOWN_WAF_RULES.map((ruleName) =>
            axios
              .put(
                `${API_GATEWAY_URL}/api/v1/security/waf/rules/${ruleName}`,
                { enabled },
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                },
              )
              .catch((err) => ({ error: err })),
          ),
        );
        await loadWAFConfig();
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            "Erreur lors de la mise à jour globale des règles WAF",
        );
      } finally {
        setWafActionLoading(false);
      }
    },
    [loadWAFConfig],
  );

  useEffect(() => {
    loadWAFConfig();
    const interval = setInterval(loadWAFConfig, 30000);
    return () => clearInterval(interval);
  }, [loadWAFConfig]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Configuration WAF (Web Application Firewall)
      </h2>

      {loadingWaf ? (
        <TableSkeleton rows={6} columns={4} />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Toggle WAF */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">État du WAF</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Activez ou désactivez le Web Application Firewall
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={wafEnabled}
                onChange={(e) => handleToggleWafEnabled(e.target.checked)}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {wafEnabled ? "Activé" : "Désactivé"}
              </span>
            </label>
          </div>

          {/* Statistiques WAF */}
          {wafStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Statut
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {wafStats.status === "active" ? "✅ Actif" : "❌ Inactif"}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Règles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {wafStats.rules || 0}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Règles Activées
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {wafStats.enabledRules || 0}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  IPs Blacklistées
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {wafStats.blacklistedIPs || 0}
                </p>
              </div>
            </div>
          )}

          {/* Règles WAF */}
          {wafEnabled && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Règles de Protection WAF
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetAllWafRules(true)}
                    disabled={wafActionLoading}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    Activer tout
                  </button>
                  <button
                    onClick={() => handleSetAllWafRules(false)}
                    disabled={wafActionLoading}
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
                  >
                    Désactiver tout
                  </button>
                </div>
              </div>
              {wafConfig.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune règle WAF configurée
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3">Règle WAF</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Sévérité</th>
                        <th className="text-left p-3">Patterns</th>
                        <th className="text-left p-3">Statut</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wafConfig.map((rule: any) => (
                        <tr
                          key={rule.name}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-3 font-semibold">{rule.name}</td>
                          <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                            {rule.description}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                rule.severity === "critical"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : rule.severity === "high"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    : rule.severity === "medium"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {rule.severity?.toUpperCase() || "N/A"}
                            </span>
                          </td>
                          <td className="p-3">{rule.patternsCount || 0}</td>
                          <td className="p-3">
                            {rule.enabled ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </td>
                          <td className="p-3">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={rule.enabled !== false}
                                onChange={(e) =>
                                  handleToggleWafRule(
                                    rule.name,
                                    e.target.checked,
                                  )
                                }
                              />
                              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

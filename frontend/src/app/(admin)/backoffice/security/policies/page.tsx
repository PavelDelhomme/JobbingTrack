"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SectionLoader } from "@/lib/ui";
import { SecuritySubNav } from "../SecuritySubNav";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  formatBlockOriginLabel,
  formatFirewallActionLabel,
  formatSecuritySeverity,
  normalizeSecuritySeverity,
} from "@/lib/security/securityLabels";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;

function wafRuleLabel(
  rule: { name?: string; description?: string },
  index: number,
) {
  return (
    rule.name?.trim() || rule.description?.trim() || `Règle WAF ${index + 1}`
  );
}

interface WafConfig {
  enabled: boolean;
  rules: Array<{
    name: string;
    enabled: boolean;
    severity: string;
    description: string;
    patternsCount: number;
  }>;
}

interface FirewallRule {
  id: string;
  name: string;
  action: string;
  protocol: string;
  enabled: boolean;
}

type BlockedIpEntry = {
  ip: string;
  blockedAt?: string;
  reason?: string;
  blockOrigin?: string;
  threatId?: string;
};

export default function SecurityPoliciesPage() {
  useDocumentTitle("Politiques sécurité");

  const [wafConfig, setWafConfig] = useState<WafConfig | null>(null);
  const [wafSaving, setWafSaving] = useState(false);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<Array<string | BlockedIpEntry>>(
    [],
  );
  const [newIP, setNewIP] = useState("");
  const [loading, setLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(
    null,
  );

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchWafConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/security/waf/config`, {
        headers: getAuthHeaders(),
        timeout: 5000,
      });
      if (res.data?.success && res.data?.data) {
        setWafConfig(res.data.data);
      }
    } catch (e) {
      console.error("Erreur config WAF:", e);
    }
  }, []);

  const fetchFirewallRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/security/firewall/rules`, {
        headers: getAuthHeaders(),
        timeout: 5000,
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setFirewallRules(res.data.data);
      }
    } catch (e) {
      console.error("Erreur règles firewall:", e);
    }
  }, []);

  const fetchBlockedIPs = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/v1/security/firewall/blocked-ips`,
        {
          headers: getAuthHeaders(),
        },
      );
      const raw =
        res.data?.success && Array.isArray(res.data?.data)
          ? res.data.data
          : res.data?.ips;
      if (Array.isArray(raw)) {
        setBlockedIPs(raw);
      } else {
        setBlockedIPs([]);
      }
    } catch (e) {
      console.error("Erreur IPs bloquées:", e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchWafConfig(),
        fetchFirewallRules(),
        fetchBlockedIPs(),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchWafConfig, fetchFirewallRules, fetchBlockedIPs]);

  const handleWafToggle = async (enabled: boolean) => {
    setWafSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/v1/security/waf/toggle`,
        { enabled },
        {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        },
      );
      if (res.data?.success && wafConfig)
        setWafConfig({ ...wafConfig, enabled });
    } catch (e) {
      console.error("Erreur toggle WAF:", e);
      alert("Impossible de modifier l'état du WAF");
    } finally {
      setWafSaving(false);
    }
  };

  const handleWafRuleToggle = async (ruleName: string, enabled: boolean) => {
    if (!wafConfig) return;
    setWafSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/v1/security/waf/rules/${encodeURIComponent(ruleName)}`,
        { enabled },
        {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        },
      );
      if (res.data?.success) {
        setWafConfig({
          ...wafConfig,
          rules: wafConfig.rules.map((r) =>
            r.name === ruleName ? { ...r, enabled } : r,
          ),
        });
      }
    } catch (e) {
      console.error("Erreur toggle règle WAF:", e);
      alert("Impossible de modifier la règle");
    } finally {
      setWafSaving(false);
    }
  };

  const handleBlockIP = async () => {
    if (!newIP.trim()) return;
    try {
      await axios.post(
        `${API_URL}/api/v1/security/firewall/block-ip`,
        { ip: newIP.trim() },
        {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        },
      );
      setNewIP("");
      fetchBlockedIPs();
    } catch (e) {
      console.error("Erreur blocage IP:", e);
      alert("Erreur lors du blocage de l'IP");
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      await axios.post(
        `${API_URL}/api/v1/security/firewall/unblock-ip`,
        { ip },
        {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        },
      );
      fetchBlockedIPs();
    } catch (e) {
      console.error("Erreur déblocage IP:", e);
      alert("Erreur lors du déblocage");
    }
  };

  const handleCleanupSecurityData = async () => {
    if (
      !confirm(
        "Nettoyer maintenant les menaces, règles firewall et IPs bloquées ?",
      )
    )
      return;
    setMaintenanceLoading(true);
    setMaintenanceResult(null);
    try {
      const rulesRes = await axios.get(
        `${API_URL}/api/v1/security/firewall/rules`,
        { headers: getAuthHeaders() },
      );
      const rules = Array.isArray(rulesRes.data?.data)
        ? rulesRes.data.data
        : [];
      for (const rule of rules) {
        await axios.delete(
          `${API_URL}/api/v1/security/firewall/rules/${rule.id}`,
          { headers: getAuthHeaders() },
        );
      }

      const ipsRes = await axios.get(
        `${API_URL}/api/v1/security/firewall/blocked-ips`,
        { headers: getAuthHeaders() },
      );
      const ipsRaw = Array.isArray(ipsRes.data?.data) ? ipsRes.data.data : [];
      const ips = ipsRaw
        .map((x: string | { ip?: string }) =>
          typeof x === "string" ? x : x?.ip,
        )
        .filter(Boolean) as string[];
      for (const ip of ips) {
        await axios.post(
          `${API_URL}/api/v1/security/firewall/unblock-ip`,
          { ip },
          {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const threatsRes = await axios.delete(
        `${API_URL}/api/v1/security/firewall/threats?scope=all`,
        { headers: getAuthHeaders() },
      );
      const deletedThreats = threatsRes.data?.data?.deleted ?? 0;

      await Promise.all([
        fetchWafConfig(),
        fetchFirewallRules(),
        fetchBlockedIPs(),
      ]);
      setMaintenanceResult(
        `Nettoyage terminé: ${rules.length} règle(s), ${ips.length} IP(s), ${deletedThreats} menace(s) supprimée(s).`,
      );
    } catch (e) {
      console.error("Erreur nettoyage sécurité:", e);
      setMaintenanceResult(
        "Échec du nettoyage sécurité. Vérifie les services et réessaie.",
      );
    } finally {
      setMaintenanceLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SecuritySubNav />
          <SectionLoader message="Chargement des politiques…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <SecuritySubNav />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Politiques de sécurité
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Paramétrage détaillé : WAF, règles firewall, blocage IP.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Maintenance sécurité
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Purge menaces + règles firewall + IPs bloquées pour repartir
                propre.
              </p>
            </div>
            <button
              onClick={handleCleanupSecurityData}
              disabled={maintenanceLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {maintenanceLoading ? "Nettoyage..." : "Nettoyer maintenant"}
            </button>
          </div>
          {maintenanceResult && (
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              {maintenanceResult}
            </p>
          )}
        </div>

        {/* WAF */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Web Application Firewall (WAF)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Activer ou désactiver le WAF globalement et choisir les règles à
            appliquer.
          </p>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                WAF global
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Protection contre injections (SQL, XSS, etc.)
              </p>
            </div>
            <button
              onClick={() => wafConfig && handleWafToggle(!wafConfig.enabled)}
              disabled={wafSaving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${wafConfig?.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${wafConfig?.enabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>
          {wafConfig && wafConfig.rules?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Règles WAF
              </p>
              <ul className="space-y-2">
                {wafConfig.rules.map((rule, index) => (
                  <li
                    key={rule.name || `${rule.severity}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                        {wafRuleLabel(rule, index)}
                      </span>
                      <span
                        className={`ml-2 px-1.5 py-0.5 text-xs rounded ${normalizeSecuritySeverity(rule.severity) === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : normalizeSecuritySeverity(rule.severity) === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"}`}
                      >
                        {formatSecuritySeverity(rule.severity)}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {rule.description ||
                          "Règle WAF sans description fournie par l’API."}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleWafRuleToggle(rule.name, !rule.enabled)
                      }
                      disabled={wafSaving || !rule.name}
                      className={`text-sm px-3 py-1 rounded ${rule.enabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400"}`}
                    >
                      {rule.enabled ? "Activée" : "Désactivée"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Firewall */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Règles firewall
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {firewallRules.length} règle(s) configurée(s). Gestion détaillée
                dans l’onglet Firewall.
              </p>
            </div>
            <Link
              href="/b4ck0ff1ce/security/firewall"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Ouvrir Firewall
            </Link>
          </div>
          {firewallRules.length > 0 && (
            <ul className="space-y-2">
              {firewallRules.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="text-gray-900 dark:text-gray-100">
                    {r.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFirewallActionLabel(r.action)} / {r.protocol}
                  </span>
                </li>
              ))}
              {firewallRules.length > 5 && (
                <li className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                  + {firewallRules.length - 5} autre(s) règle(s) — voir onglet
                  Firewall
                </li>
              )}
            </ul>
          )}
        </section>

        {/* IPs bloquées */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            IPs bloquées
          </h2>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row">
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="Adresse IP à bloquer (ex: 192.168.1.100)"
              className="min-w-0 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleBlockIP}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Bloquer IP
            </button>
          </div>
          <ul className="space-y-2">
            {blockedIPs.map((item) => {
              const ipStr =
                typeof item === "string"
                  ? item
                  : (item?.ip ?? JSON.stringify(item));
              const row = typeof item === "object" ? item : null;
              const originLabel = row
                ? formatBlockOriginLabel(row.blockOrigin)
                : null;
              return (
                <li
                  key={ipStr}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        {ipStr}
                      </span>
                      {originLabel && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100">
                          {originLabel}
                        </span>
                      )}
                      {row?.threatId && (
                        <Link
                          href={`/b4ck0ff1ce/security/threats/${row.threatId}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Fiche menace
                        </Link>
                      )}
                    </div>
                    {row?.reason && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {row.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblockIP(ipStr)}
                    className="px-3 py-1 shrink-0 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Débloquer
                  </button>
                </li>
              );
            })}
            {blockedIPs.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune IP bloquée
              </p>
            )}
          </ul>
        </section>

        {/* Rappel autres onglets */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Voir aussi :{" "}
          <Link
            href="/b4ck0ff1ce/security/firewall"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Firewall
          </Link>
          {" · "}
          <Link
            href="/b4ck0ff1ce/security/logs"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Logs de sécurité
          </Link>
          {" · "}
          <Link
            href="/b4ck0ff1ce/security/threats"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Menaces
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

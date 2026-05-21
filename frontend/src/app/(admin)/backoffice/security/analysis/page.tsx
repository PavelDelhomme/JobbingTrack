"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SectionLoader } from "@/lib/ui";
import { SecuritySubNav } from "../SecuritySubNav";
import { FRONTEND_URLS } from "@/config/ports.config";
import { formatLocalDateTime } from "@/lib/utils/date";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  countDetectionLikeLogs,
  hasToken,
  isSqliThreat,
  isXssThreat,
} from "@/lib/security/threatSignals";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Shield, AlertTriangle, Lock, Eye, Activity } from "@/lib/icons";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;
const ANALYSIS_LOGS_WINDOW_DAYS = 30;
const ANALYSIS_LOGS_FETCH_LIMIT = 2000;

export default function SecurityAnalysisPage() {
  useDocumentTitle("Analyse sécurité");

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // ✅ OPTIMISATION : useCallback pour éviter les re-créations de fonction
  const loadSecuritySummary = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const logSince = encodeURIComponent(
        new Date(
          Date.now() - ANALYSIS_LOGS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );
      const [statsRes, blockedRes, logsRes, threatsRes] =
        await Promise.allSettled([
          axios.get(`${API_URL}/api/v1/security/stats?days=1`, {
            headers,
            timeout: 7000,
          }),
          axios.get(`${API_URL}/api/v1/security/firewall/blocked-ips`, {
            headers,
            timeout: 7000,
          }),
          axios.get(
            `${API_URL}/api/v1/security/logs?limit=${ANALYSIS_LOGS_FETCH_LIMIT}&startDate=${logSince}`,
            { headers, timeout: 7000 },
          ),
          axios.get(`${API_URL}/api/v1/security/firewall/threats?limit=200`, {
            headers,
            timeout: 7000,
          }),
        ]);

      const statsData =
        statsRes.status === "fulfilled" ? statsRes.value.data : null;
      const blockedData =
        blockedRes.status === "fulfilled" ? blockedRes.value.data : null;
      const logsData =
        logsRes.status === "fulfilled" ? logsRes.value.data : null;
      const threatsData =
        threatsRes.status === "fulfilled" ? threatsRes.value.data : null;
      const failedSources = [
        statsRes.status === "rejected" ? "statistiques" : null,
        blockedRes.status === "rejected" ? "IPs bloquées" : null,
        logsRes.status === "rejected" ? "logs" : null,
        threatsRes.status === "rejected" ? "menaces" : null,
      ].filter(Boolean);

      const stats = statsData?.success ? statsData?.data || {} : {};
      const blockedRaw =
        blockedData?.success && Array.isArray(blockedData?.data)
          ? blockedData.data
          : [];
      const blockedIPItems = blockedRaw
        .map(
          (
            x:
              | string
              | {
                  ip?: string;
                  reason?: string;
                  blockedAt?: string;
                  blockOrigin?: string;
                  threatId?: string;
                },
          ) =>
            typeof x === "string"
              ? { ip: x, reason: "Blocage actif", blockedAt: undefined }
              : { ...x },
        )
        .filter((x: any) => !!x?.ip);
      const blockedIpsMeta =
        blockedData?.meta && typeof blockedData.meta === "object"
          ? blockedData.meta
          : null;
      const logs = Array.isArray(logsData?.data) ? logsData.data : [];
      const threats = Array.isArray(threatsData?.data) ? threatsData.data : [];

      const sqlEventsLogs = logs.filter(
        (l: any) =>
          hasToken(l?.eventType, ["sql_injection", "sql injection"]) ||
          hasToken(l?.category, ["injection"]) ||
          hasToken(l?.message, ["sql injection", "sql_injection"]),
      ).length;
      const xssEventsLogs = logs.filter(
        (l: any) =>
          hasToken(l?.eventType, ["xss"]) ||
          hasToken(l?.category, ["injection"]) ||
          hasToken(l?.message, ["xss", "<script", "onerror="]),
      ).length;
      const sqlEventsThreats = threats.filter((t: any) =>
        isSqliThreat(t),
      ).length;
      const xssEventsThreats = threats.filter((t: any) =>
        isXssThreat(t),
      ).length;
      const sqlEvents = sqlEventsLogs + sqlEventsThreats;
      const xssEvents = xssEventsLogs + xssEventsThreats;
      const failedAuth = logs.filter((l: any) => {
        const evt = String(l?.eventType || "").toLowerCase();
        const cat = String(l?.category || "").toLowerCase();
        return (
          evt.includes("failed") ||
          evt.includes("invalid") ||
          cat === "authentication"
        );
      }).length;
      const suspiciousLogs = logs.filter((l: any) => {
        const lvl = String(l?.level || "").toLowerCase();
        return lvl === "warning" || lvl === "error" || lvl === "critical";
      }).length;
      const labBlocks = logs.filter(
        (l: any) =>
          String(l?.eventType || "").toLowerCase() ===
          "ip_blocked_lab_simulation",
      ).length;
      const manualBlocksStrict = logs.filter(
        (l: any) =>
          String(l?.eventType || "").toLowerCase() === "ip_blocked_manually",
      ).length;
      const manualBlocks = manualBlocksStrict + labBlocks;
      const autoBlocks = logs.filter((l: any) => {
        const evt = String(l?.eventType || "").toLowerCase();
        return (
          evt === "threat_blocked" ||
          evt === "ip_blocked_automatically" ||
          evt === "payload_auto_block"
        );
      }).length;
      const detectionLogsCount = countDetectionLikeLogs(
        logs as Record<string, unknown>[],
      );
      const openThreatsCount = threats.filter((t: any) => !t?.blocked).length;
      const ddosThreats = threats.filter((t: any) =>
        String(t?.threatType || "")
          .toUpperCase()
          .includes("DDOS"),
      ).length;
      const scoreFromOverview = Number(stats?.overview?.riskScore ?? 0);
      const scoreFromLive = Math.max(
        0,
        100 - Math.min(70, threats.length * 2 + suspiciousLogs),
      );
      const securityScore =
        Number.isFinite(scoreFromOverview) && scoreFromOverview > 0
          ? Math.round(scoreFromOverview)
          : Math.round(scoreFromLive);
      const otherInjectionCount = Math.max(
        0,
        threats.length - sqlEventsThreats - xssEventsThreats - ddosThreats,
      );

      setSummary({
        ...stats,
        securityScore,
        blockedIPs: blockedIPItems,
        blockedIpsMeta,
        uniqueBlockedIPs: blockedIPItems.length,
        manualBlocks,
        manualBlocksStrict,
        labBlocks,
        autoBlocks,
        detectionLogsCount,
        openThreatsCount,
        totalFailedLogins: Number(
          stats?.overview?.criticalEvents ?? failedAuth,
        ),
        totalSuspiciousActivities: Number(
          stats?.overview?.totalEvents ?? suspiciousLogs,
        ),
        totalSqlInjections: Number(stats?.overview?.sqlInjections ?? sqlEvents),
        totalXssAttempts: Number(stats?.overview?.xssAttempts ?? xssEvents),
        totalOtherInjections: Number(
          stats?.overview?.otherInjections ?? otherInjectionCount,
        ),
        totalThreatsLive: threats.length,
        totalLogsLive: logs.length,
      });
      setServiceError(
        failedSources.length > 0
          ? `Données partielles: ${failedSources.join(", ")} indisponible(s).`
          : null,
      );
    } catch (error) {
      console.error("Erreur chargement analyse:", error);
      setServiceError(
        "Impossible de charger les données de sécurité en temps réel.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecuritySummary();
  }, [loadSecuritySummary]);

  // ✅ CORRECTION : useMemo doit être appelé à chaque render, pas conditionnellement
  // Déplacer avant le if (loading) pour respecter les règles des Hooks
  const { securityScore } = useMemo(() => {
    const score = summary?.avgSecurityScore ?? summary?.securityScore ?? 0;
    return { securityScore: score };
  }, [summary?.avgSecurityScore, summary?.securityScore]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SecuritySubNav />
          <SectionLoader message="Chargement de l'analyse…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Analyse de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Évaluation complète de la sécurité de votre application
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Logs sécurité : fenêtre glissante de {ANALYSIS_LOGS_WINDOW_DAYS}{" "}
            jours (limite UI {ANALYSIS_LOGS_FETCH_LIMIT} entrées). Menaces :
            jusqu’à 200 entrées récentes. Les dates et heures sont affichées en{" "}
            <strong>heure locale</strong> du navigateur (les API renvoient des
            timestamps ISO, en pratique UTC ou stockage serveur).
          </p>
        </div>
        {serviceError && (
          <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
            {serviceError}
          </div>
        )}

        {/* Score principal */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg opacity-90">Score de Sécurité Global</p>
              <p className="text-6xl font-bold mt-2">
                {securityScore}
                <span className="text-3xl">/100</span>
              </p>
              <p className="mt-2 opacity-90">
                {securityScore >= 80
                  ? "✓ Excellent niveau de sécurité"
                  : securityScore >= 60
                    ? "⚠ Niveau de sécurité acceptable"
                    : "✗ Nécessite une attention immédiate"}
              </p>
            </div>
            <Shield className="h-32 w-32 opacity-20" />
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/b4ck0ff1ce/security/threats?threatType=BRUTE_FORCE"
            className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tentatives Échouées
              </p>
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.totalFailedLogins || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Voir les menaces brute force
            </p>
          </Link>

          <Link
            href="/b4ck0ff1ce/security/threats?blocked=false"
            className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Activités Suspectes
              </p>
              <Eye className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {summary?.totalSuspiciousActivities || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Voir les menaces ouvertes
            </p>
          </Link>

          <Link
            href="/b4ck0ff1ce/security/firewall#liste-ips-bloquees"
            className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                IPs Bloquées
              </p>
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {summary?.uniqueBlockedIPs || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Voir la liste consolidée
            </p>
          </Link>

          <Link
            href="/b4ck0ff1ce/security/threats?threatType=SQL_INJECTION"
            className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tentatives d&apos;Injection
              </p>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {(summary?.totalSqlInjections || 0) +
                (summary?.totalXssAttempts || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Voir les injections SQL
            </p>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Source des données:
          </span>{" "}
          corrélation temps réel `stats + logs + threats` (24h), avec fallback
          sur le calcul live quand `riskScore` est absent.
          <span className="ml-2">
            Menaces live:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {summary?.totalThreatsLive ?? 0}
            </strong>
          </span>
          <span className="ml-3">
            Logs live:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {summary?.totalLogsLive ?? 0}
            </strong>
          </span>
          <span className="ml-3">
            Blocages auto / manuels (logs récents):{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {summary?.autoBlocks ?? 0} / {summary?.manualBlocks ?? 0}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 p-5">
            <h2 className="text-sm font-semibold text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Détections (signaux)
            </h2>
            <p className="text-3xl font-bold text-cyan-800 dark:text-cyan-300 mt-2">
              {summary?.detectionLogsCount ?? 0}
            </p>
            <p className="text-xs text-cyan-800/90 dark:text-cyan-300/90 mt-1">
              Évènements de détection dans les logs (menace / WAF / intrusion…),
              sans confondre avec un blocage effectif.
            </p>
            <p className="text-xs mt-2 text-cyan-900 dark:text-cyan-200">
              Menaces non marquées « bloquées » en base :{" "}
              <strong>{summary?.openThreatsCount ?? 0}</strong>
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Blocages manuels &amp; lab
            </h2>
            <p className="text-3xl font-bold text-amber-800 dark:text-amber-300 mt-2">
              {summary?.manualBlocks ?? 0}
            </p>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/90 mt-1">
              Manuel : <strong>{summary?.manualBlocksStrict ?? 0}</strong> ·
              Test IP RFC5737 (lab) : <strong>{summary?.labBlocks ?? 0}</strong>
            </p>
          </div>
          <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-5">
            <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Blocages automatiques
            </h2>
            <p className="text-3xl font-bold text-rose-800 dark:text-rose-300 mt-2">
              {summary?.autoBlocks ?? 0}
            </p>
            <p className="text-xs text-rose-900/80 dark:text-rose-200/90 mt-1">
              Moteur menaces, règles automatiques, payload_auto_block…
            </p>
          </div>
        </div>

        {/* Détections d'injection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Tentatives d&apos;Injection Détectées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                SQL Injection
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                {summary?.totalSqlInjections || 0}
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                XSS
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                {summary?.totalXssAttempts || 0}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Autres
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {summary?.totalOtherInjections || 0}
              </p>
            </div>
          </div>
        </div>

        {/* IPs bloquées */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6 text-red-600" />
            IPs Bloquées Actuellement
          </h2>
          {summary?.blockedIpsMeta &&
            typeof summary.blockedIpsMeta.count === "number" && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                API consolidée : {summary.blockedIpsMeta.count} entrée(s) — voir
                aussi{" "}
                <Link
                  href="/b4ck0ff1ce/security/firewall#liste-ips-bloquees"
                  className="text-blue-600 hover:underline"
                >
                  Firewall
                </Link>
                .
              </p>
            )}
          <div className="space-y-2">
            {summary?.blockedIPs?.length > 0 ? (
              summary.blockedIPs.map(
                (
                  ipItem: {
                    ip: string;
                    reason?: string;
                    blockedAt?: string;
                    blockOrigin?: string;
                    threatId?: string;
                  },
                  index: number,
                ) => {
                  const origin = String(ipItem.blockOrigin || "");
                  const originLabel =
                    origin === "lab_simulation"
                      ? "Test lab"
                      : origin === "manual_rule"
                        ? "Manuel"
                        : origin === "automatic_threat"
                          ? "Auto (menace)"
                          : origin === "iptables"
                            ? "iptables"
                            : origin === "log_inferred"
                              ? "Logs"
                              : "Actif";
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {ipItem.ip}
                        </span>
                        {ipItem.blockedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatLocalDateTime(ipItem.blockedAt)}
                          </p>
                        )}
                        {ipItem.reason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ipItem.reason}
                          </p>
                        )}
                        {ipItem.threatId && (
                          <Link
                            href={`/b4ck0ff1ce/security/threats/${ipItem.threatId}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Fiche menace
                          </Link>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded shrink-0 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                        {originLabel}
                      </span>
                    </div>
                  );
                },
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune IP bloquée actuellement
              </p>
            )}
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4">
            Recommandations de Sécurité
          </h2>
          <div className="space-y-3">
            {securityScore >= 80 ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-green-600 dark:text-green-400 text-xl">
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Sécurité Robuste
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Votre application maintient un excellent niveau de
                      sécurité
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 text-xl">
                    ℹ
                  </span>
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Surveillance Continue
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Continuez à surveiller régulièrement les logs de sécurité
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-orange-600 dark:text-orange-400 text-xl">
                    ⚠
                  </span>
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">
                      Augmenter la Surveillance
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Activez l&apos;authentification à deux facteurs pour tous
                      les utilisateurs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-xl">
                    ✗
                  </span>
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Action Requise
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Vérifiez et bloquez les IPs suspectes identifiées
                    </p>
                  </div>
                </div>
                {(summary?.totalSqlInjections || 0) +
                  (summary?.totalXssAttempts || 0) >
                  0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-xl">
                      🛡
                    </span>
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        Durcir immédiatement les protections d’injection
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Vérifie les règles WAF SQL/XSS, active le blocage
                        automatique et confirme les logs de rejet côté gateway.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

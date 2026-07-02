"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SecurityPageShell } from "../SecuritySubNav";
import { SectionLoader } from "@/lib/ui";
import { FRONTEND_URLS } from "@/config/ports.config";
import { formatLocalDateTime } from "@/lib/utils/date";
import { formatBlockOriginLabelOrUnknown } from "@/lib/security/securityLabels";
import {
  ANALYSIS_BLOCKED_IPS_PAGE_SIZE,
  ANALYSIS_LOGS_FETCH_LIMIT,
  ANALYSIS_LOGS_WINDOW_DAYS,
  ANALYSIS_REFRESH_MS,
  buildSecurityRecommendations,
  fetchSecurityAnalysisSummary,
  type SecurityAnalysisSummary,
} from "@/lib/security/securityAnalysisSummary";
import { Shield, AlertTriangle, Lock, Eye, Activity } from "@/lib/icons";

const API_URL = FRONTEND_URLS.api;

export default function SecurityAnalysisPage() {

  const [summary, setSummary] = useState<SecurityAnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [blockedPage, setBlockedPage] = useState(1);

  const loadSecuritySummary = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const analysis = await fetchSecurityAnalysisSummary(API_URL, token, {
        blockedPage,
        blockedLimit: ANALYSIS_BLOCKED_IPS_PAGE_SIZE,
      });
      setSummary(analysis);
      setServiceError(null);
    } catch (error) {
      console.error("Erreur chargement analyse:", error);
      setServiceError(
        "Impossible de charger les données de sécurité en temps réel.",
      );
    } finally {
      setLoading(false);
    }
  }, [blockedPage]);

  useEffect(() => {
    void loadSecuritySummary();
  }, [loadSecuritySummary]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadSecuritySummary();
    }, ANALYSIS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadSecuritySummary]);

  const securityScore = summary?.securityScore ?? 0;
  const recommendations = useMemo(
    () => (summary ? buildSecurityRecommendations(summary) : []),
    [summary],
  );
  const blockedPagination = summary?.blockedIpsMeta?.pagination;
  const blockedTotalPages = blockedPagination?.pages ?? 1;

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SectionLoader message="Chargement de l'analyse…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <SecurityPageShell
      title={
        <span className="flex items-center gap-2">
          <Shield className="h-7 w-7" />
          Analyse de Sécurité
        </span>
      }
      description={
        <>
          <p>Évaluation complète de la sécurité de votre application</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Fenêtre {ANALYSIS_LOGS_WINDOW_DAYS} j · limite logs{" "}
            {ANALYSIS_LOGS_FETCH_LIMIT} · score calculé avec la même pondération
            que la vue d’ensemble Sécurité (menaces, bruit logs, IPs bloquées,
            WAF). Rafraîchissement {ANALYSIS_REFRESH_MS / 1000} s.
          </p>
        </>
      }
    >
      <div className="space-y-6">
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
            href="/backoffice/security/threats?threatType=BRUTE_FORCE"
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
            href="/backoffice/security/threats?blocked=false"
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
            href="/backoffice/security/firewall#liste-ips-bloquees"
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
            href="/backoffice/security/threats?threatType=SQL_INJECTION"
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
          corrélation temps réel `stats ({ANALYSIS_LOGS_WINDOW_DAYS} j) + logs +
          threats + firewall`, rafraîchie toutes les{" "}
          {ANALYSIS_REFRESH_MS / 1000} s.
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
              {summary?.detectionsCount ?? 0}
            </p>
            <p className="text-xs text-cyan-800/90 dark:text-cyan-300/90 mt-1">
              Aligné vue d’ensemble : logs détection (hors doublon réseau) +
              menaces typées. Signaux logs bruts :{" "}
              <strong>{summary?.detectionLogsCount ?? 0}</strong>
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
                API consolidée : {summary.uniqueBlockedIPs} IP(s) au total —
                page {blockedPage}/{blockedTotalPages} (
                {ANALYSIS_BLOCKED_IPS_PAGE_SIZE} par page). Voir aussi{" "}
                <Link
                  href="/backoffice/security/firewall#liste-ips-bloquees"
                  className="text-blue-600 hover:underline"
                >
                  Firewall
                </Link>
                .
              </p>
            )}
          <div className="space-y-2">
            {(summary?.blockedIPs?.length ?? 0) > 0 ? (
              summary!.blockedIPs.map((ipItem, index) => {
                const originLabel = formatBlockOriginLabelOrUnknown(
                  ipItem.blockOrigin,
                );
                return (
                  <div
                    key={`${ipItem.ip}-${index}`}
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
                          href={`/backoffice/security/threats/${ipItem.threatId}`}
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
              })
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune IP bloquée actuellement
              </p>
            )}
          </div>
          {blockedTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={blockedPage <= 1 || loading}
                onClick={() => setBlockedPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {blockedPage} / {blockedTotalPages}
              </span>
              <button
                type="button"
                disabled={blockedPage >= blockedTotalPages || loading}
                onClick={() =>
                  setBlockedPage((p) => Math.min(blockedTotalPages, p + 1))
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        {/* Recommandations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-2">
            Recommandations de Sécurité
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Mises à jour automatiquement selon le score live, les menaces
            ouvertes, injections et blocages observés (rafraîchissement{" "}
            {ANALYSIS_REFRESH_MS / 1000} s).
          </p>
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const tone =
                rec.severity === "ok"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : rec.severity === "info"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : rec.severity === "warning"
                      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
              const body = (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border ${tone}`}
                >
                  <span className="text-xl shrink-0">
                    {rec.severity === "ok"
                      ? "✓"
                      : rec.severity === "info"
                        ? "ℹ"
                        : rec.severity === "warning"
                          ? "⚠"
                          : "✗"}
                  </span>
                  <div>
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm opacity-90">{rec.message}</p>
                  </div>
                </div>
              );
              return rec.href ? (
                <Link key={rec.title} href={rec.href} className="block">
                  {body}
                </Link>
              ) : (
                <div key={rec.title}>{body}</div>
              );
            })}
          </div>
        </div>
      </div>
    </SecurityPageShell>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import {
  Play,
  Loader2,
  Shield,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  FileText,
  Search,
  AlertTriangle,
} from "@/lib/icons";

interface TestItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface CveLocateHit {
  source: string;
  path: string;
  line?: number;
  reportId?: string;
  package?: string;
  severity?: string;
  excerpt?: string;
  lockfilePath?: string;
  installedVersion?: string | null;
  image?: string;
  patchedVersion?: string;
  affectedRange?: string;
  exposedSurface?: string;
  fix?: string;
}

interface CveFindingCard {
  id: string;
  package: string;
  installedVersion: string | null;
  severity: string;
  cveIds: string[];
  advisoryTitle?: string | null;
  advisoryUrl?: string | null;
  surface: string;
  service: string;
  lockfilePath: string;
  isDirect: boolean;
  exposedSurface: string;
  exploitability: string;
  fix: {
    type: string;
    recommendation: string;
    fixAvailable: boolean;
  };
  range?: string | null;
  source: string;
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    case "high":
      return "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

export default function SecurityTestsPage() {
  const { loading: authLoading, isAuthenticated, token } = useAuth();
  const [isRunningApp, setIsRunningApp] = useState(false);
  const [isRunningCve, setIsRunningCve] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [cveQuery, setCveQuery] = useState("CVE-2026-21710");
  const [cveResult, setCveResult] = useState<{
    found: boolean;
    hits: CveLocateHit[];
    findings?: CveFindingCard[];
    guidance?: string;
  } | null>(null);
  const [cveLoading, setCveLoading] = useState(false);
  const [findings, setFindings] = useState<CveFindingCard[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [findingsGuidance, setFindingsGuidance] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const availableTests: TestItem[] = [
    {
      id: "waf",
      name: "WAF / Firewall",
      description: "Règles WAF et blocage des requêtes malveillantes",
      category: "Infrastructure",
    },
    {
      id: "auth",
      name: "Authentification",
      description: "Tokens, sessions, permissions",
      category: "Auth",
    },
    {
      id: "injection",
      name: "Injection",
      description: "SQL, XSS, commandes",
      category: "Vulnérabilités",
    },
    {
      id: "headers",
      name: "En-têtes sécurité",
      description: "CSP, HSTS, X-Frame-Options",
      category: "Headers",
    },
  ];

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("fr-FR");
    setLogs((prev) => [...prev, `[${timestamp}] ${stripAnsi(message)}`]);
  };

  const runAppSecurityTests = async () => {
    if (!token || isRunningApp) return;
    setIsRunningApp(true);
    setLogs([]);
    setReportId(null);
    addLog("🚀 Tests sécurité applicatifs (XSS, SQLi, auth, headers…)…");

    try {
      const response = await fetch("/api/test/run-security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testName: "Tests Sécurité applicatifs" }),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur API: ${response.status}`);
      }

      if (data.outputTail) {
        data.outputTail
          .split("\n")
          .slice(-12)
          .forEach((line: string) => line.trim() && addLog(line));
      }

      if (data.warning) {
        addLog(
          "⚠️ Avertissements medium/low — voir rapport (statut AVERTISSEMENT)",
        );
      } else if (data.success) {
        addLog("✅ Tests applicatifs terminés");
      } else {
        addLog("❌ Vulnérabilités critical/high détectées — voir rapport");
      }

      if (data.reportId) {
        setReportId(data.reportId);
        addLog(`📊 Rapport: ${data.reportId}`);
      }
      if (data.hint) addLog(`💡 ${data.hint}`);
    } catch (error: unknown) {
      addLog(
        `❌ Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    } finally {
      setIsRunningApp(false);
    }
  };

  const runCveScan = async () => {
    if (!token || isRunningCve) return;
    setIsRunningCve(true);
    setLogs([]);
    setReportId(null);
    addLog("🧬 Scan CVE dépendances (npm, Rust, Docker si activé)…");

    try {
      const response = await fetch("/api/test/run-cve-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur API: ${response.status}`);
      }

      if (data.outputTail) {
        data.outputTail
          .split("\n")
          .slice(-8)
          .forEach((line: string) => line.trim() && addLog(line));
      }

      addLog(
        data.success
          ? "✅ Scan CVE terminé"
          : "⚠️ Scan CVE terminé avec alertes",
      );
      if (data.reportId) {
        setReportId(data.reportId);
        addLog(`📊 Rapport CVE: ${data.reportId}`);
      }
    } catch (error: unknown) {
      addLog(
        `❌ Erreur scan CVE: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
      addLog(
        "💡 Si python3 manque dans le conteneur frontend : make build-full puis recreate",
      );
    } finally {
      setIsRunningCve(false);
    }
  };

  const locateCve = async () => {
    if (!token || !cveQuery.trim()) return;
    setCveLoading(true);
    setCveResult(null);
    try {
      const response = await fetch(
        `/api/security/cve-locate?cve=${encodeURIComponent(cveQuery.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recherche CVE échouée");
      setCveResult({
        found: data.found,
        hits: data.hits ?? [],
        findings: data.findings ?? [],
        guidance: data.guidance,
      });
    } catch (error: unknown) {
      setCveResult({
        found: false,
        hits: [],
        guidance:
          error instanceof Error ? error.message : "Erreur recherche CVE",
      });
    } finally {
      setCveLoading(false);
    }
  };

  const loadCriticalHighFindings = async () => {
    if (!token) return;
    setFindingsLoading(true);
    setFindings([]);
    setFindingsGuidance(null);
    try {
      const response = await fetch("/api/security/cve-findings?limit=40", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Chargement findings échoué");
      setFindings(data.findings ?? []);
      setFindingsGuidance(data.guidance ?? null);
    } catch (error: unknown) {
      setFindingsGuidance(
        error instanceof Error ? error.message : "Erreur chargement findings",
      );
    } finally {
      setFindingsLoading(false);
    }
  };

  const renderFindingCard = (finding: CveFindingCard, key: string) => (
    <div
      key={key}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${severityBadgeClass(finding.severity)}`}
        >
          {finding.severity}
        </span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {finding.package}
        </span>
        {finding.installedVersion && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            v{finding.installedVersion}
          </span>
        )}
        {finding.isDirect ? (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            direct
          </span>
        ) : (
          <span className="text-xs text-gray-500">transitive</span>
        )}
      </div>
      {finding.cveIds.length > 0 && (
        <p className="text-xs font-mono text-red-700 dark:text-red-300">
          {finding.cveIds.join(", ")}
        </p>
      )}
      {finding.advisoryTitle && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {finding.advisoryTitle}
        </p>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Service
          </dt>
          <dd>{finding.service}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Surface
          </dt>
          <dd>{finding.surface}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Lockfile
          </dt>
          <dd className="font-mono break-all">{finding.lockfilePath}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Exposition
          </dt>
          <dd>{finding.exposedSurface}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Exploitabilité
          </dt>
          <dd>{finding.exploitability}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-800 dark:text-gray-200">
            Correctif
          </dt>
          <dd>
            {finding.fix.recommendation}
            {finding.fix.fixAvailable ? " (semver dispo)" : ""}
          </dd>
        </div>
      </dl>
      {finding.advisoryUrl && (
        <a
          href={finding.advisoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Advisory npm
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="p-6 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            Vous devez être connecté.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const busy = isRunningApp || isRunningCve;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-8 h-8 text-amber-600" />
              Tests Sécurité
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              Deux parcours distincts : <strong>tests applicatifs</strong> (API,
              headers, injections) et <strong>scan CVE</strong> (dépendances,
              images). Équivalent local de{" "}
              <code className="text-sm">make test-security</code> +{" "}
              <code className="text-sm">make test-cve-scan</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runAppSecurityTests}
              disabled={!token || busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isRunningApp ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              Tests applicatifs
            </button>
            <button
              type="button"
              onClick={runCveScan}
              disabled={!token || busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isRunningCve ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
              Scan CVE
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 space-y-2">
          <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Tests offensifs contrôlés (cadrage P1A)
          </h2>
          <p className="text-sm text-amber-950/90 dark:text-amber-100/90">
            Cette page lance des audits applicatifs et CVE{" "}
            <strong>non destructifs</strong> en local/lab uniquement. Les
            campagnes agressives (ZAP actif, nmap, SYN flood, spoofing) sont
            documentées dans{" "}
            <code className="text-xs">
              docs/security/SECURITY_TESTING_MATRIX.md
            </code>{" "}
            et{" "}
            <code className="text-xs">
              docs/security/COMPOSE_RUNTIME_HARDENING.md
            </code>{" "}
            — <strong>jamais sur prod réelle</strong> sans fenêtre autorisée.
          </p>
          <ul className="text-xs text-amber-900/90 dark:text-amber-100/80 list-disc pl-5 space-y-1">
            <li>
              Cible lab : <code>localhost:5002</code> / stack locale HTTPS.
            </li>
            <li>
              Préflight lecture seule :{" "}
              <code>
                node scripts/security/controlled-offensive-preflight.cjs
                --target=http://localhost:5002 --environment=local
              </code>
              .
            </li>
            <li>
              Rapports :{" "}
              <Link href="/b4ck0ff1ce/test-reports" className="underline">
                Rapports de tests
              </Link>{" "}
              (catégorie Sécurité).
            </li>
            <li>
              Validation porteur : confirmer le cadrage, pas lancer une campagne
              agressive depuis l’UI.
            </li>
          </ul>
          <details className="text-xs text-amber-950/90 dark:text-amber-100/90">
            <summary className="cursor-pointer font-medium mt-2">
              Périmètre contrôlé par conteneur (lecture seule)
            </summary>
            <div className="mt-2 overflow-x-auto rounded border border-amber-200/80 dark:border-amber-800/80">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-amber-100/60 dark:bg-amber-950/50">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Surface</th>
                    <th className="px-2 py-1.5 font-semibold">Mode</th>
                    <th className="px-2 py-1.5 font-semibold">Où</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/60 dark:divide-amber-900/50">
                  <tr>
                    <td className="px-2 py-1.5">Préflight périmètre</td>
                    <td className="px-2 py-1.5">Lecture seule</td>
                    <td className="px-2 py-1.5">
                      Script `controlled-offensive-preflight.cjs`
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">WAF / injection / headers</td>
                    <td className="px-2 py-1.5">Passif + payloads bornés</td>
                    <td className="px-2 py-1.5">API gateway, backoffice</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">CVE applicatives / images</td>
                    <td className="px-2 py-1.5">Scan non destructif</td>
                    <td className="px-2 py-1.5">Cette page + rapports</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">Ports / SYN / réseau</td>
                    <td className="px-2 py-1.5">Lab uniquement</td>
                    <td className="px-2 py-1.5">Scripts matrice, pas l’UI</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">ZAP actif / fuzzing massif</td>
                    <td className="px-2 py-1.5">Fenêtre dédiée</td>
                    <td className="px-2 py-1.5">Préprod autorisée</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">Leurres / honeypot VPS</td>
                    <td className="px-2 py-1.5">Design seulement</td>
                    <td className="px-2 py-1.5">
                      docs/security/VPS_EXPOSURE_REDUCTION.md
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Localiser une CVE dans JobbingTrack
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Recherche dans les rapports CVE archivés, lockfiles npm, npm audit
            et runtimes déclarés dans les Dockerfiles (ex. CVE-2026-21710).
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={cveQuery}
              onChange={(e) => setCveQuery(e.target.value)}
              placeholder="CVE-2026-21710"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-w-[220px]"
            />
            <button
              type="button"
              onClick={locateCve}
              disabled={cveLoading || !token}
              className="rounded-lg bg-gray-800 text-white px-4 py-2 text-sm hover:bg-gray-900 disabled:opacity-50"
            >
              {cveLoading ? "Recherche…" : "Rechercher"}
            </button>
          </div>
          {cveResult && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm">
              {cveResult.found ? (
                <p className="text-green-700 dark:text-green-300 font-medium mb-2">
                  CVE trouvée ({cveResult.hits.length} occurrence(s))
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-300 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  CVE non trouvée dans les sources scannées
                </p>
              )}
              {cveResult.guidance && (
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {cveResult.guidance}
                </p>
              )}
              <ul className="space-y-2">
                {cveResult.hits.map((hit, i) => (
                  <li
                    key={i}
                    className="rounded bg-gray-50 dark:bg-gray-900 p-2 font-mono text-xs"
                  >
                    <span className="text-amber-700 dark:text-amber-300">
                      {hit.source}
                    </span>{" "}
                    — {hit.path}
                    {hit.line ? `:${hit.line}` : ""}
                    {hit.image ? ` — ${hit.image}` : ""}
                    {hit.package ? ` — ${hit.package}` : ""}
                    {hit.installedVersion ? `@${hit.installedVersion}` : ""}
                    {hit.severity ? ` (${hit.severity})` : ""}
                    {hit.lockfilePath ? ` — ${hit.lockfilePath}` : ""}
                    {hit.affectedRange ? ` — affecté ${hit.affectedRange}` : ""}
                    {hit.patchedVersion
                      ? ` — correctif ${hit.patchedVersion}+`
                      : ""}
                    {hit.reportId && (
                      <>
                        {" "}
                        <Link
                          href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(hit.reportId)}`}
                          className="text-blue-600 hover:underline"
                        >
                          ouvrir
                        </Link>
                      </>
                    )}
                    {hit.exposedSurface && (
                      <p className="mt-1 whitespace-normal text-gray-600 dark:text-gray-400">
                        Surface : {hit.exposedSurface}
                      </p>
                    )}
                    {hit.fix && (
                      <p className="mt-1 whitespace-normal text-gray-600 dark:text-gray-400">
                        Correctif : {hit.fix}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {cveResult.findings && cveResult.findings.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Fiches finding ({cveResult.findings.length})
                  </h3>
                  {cveResult.findings.map((f) => renderFindingCard(f, f.id))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Findings critical / high (npm audit)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Tri P0 : package, version installée, service, lockfile, surface
            exposée, exploitabilité et correctif pour chaque finding (ex.{" "}
            <code className="text-xs">js-cookie</code> côté frontend).
          </p>
          <button
            type="button"
            onClick={loadCriticalHighFindings}
            disabled={findingsLoading || !token}
            className="rounded-lg bg-red-800 text-white px-4 py-2 text-sm hover:bg-red-900 disabled:opacity-50"
          >
            {findingsLoading
              ? "Analyse npm audit…"
              : "Charger findings critical/high"}
          </button>
          {findingsGuidance && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {findingsGuidance}
            </p>
          )}
          {findings.length > 0 && (
            <div className="mt-4 space-y-3 max-h-[32rem] overflow-y-auto">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {findings.length} finding(s) — triés par sévérité
              </p>
              {findings.map((f) => renderFindingCard(f, f.id))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Couverture des tests applicatifs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTests.map((test) => (
              <div
                key={test.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {test.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {test.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {reportId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Link
              href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(reportId)}`}
              className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:underline font-medium"
            >
              <FileText className="w-4 h-4" />
              Voir le rapport
              <ExternalLink className="w-3 h-3" />
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                {reportId}
              </code>
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Terminal</span>
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  setReportId(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

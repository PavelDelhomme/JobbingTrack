"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { useAuth } from "@/lib/hooks/auth";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import type { FilterBadge } from "@/lib/filters/types";
import {
  DEFAULT_TEST_REPORT_FILTERS,
  TEST_REPORT_SORT_OPTIONS,
  TEST_REPORT_STATUS_OPTIONS,
  type TestReportListFilters,
  type TestReportSortBy,
} from "@/lib/filters/testReportFilterOptions";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  X,
  GitCompare,
  Image,
} from "lucide-react";
import axios from "axios";
import { ReportIframe } from "./ReportIframe";
import { securityStatusLabel } from "@/lib/test-reports/securityStatus";

const API_URL = FRONTEND_URLS.api;

interface CompareReportData {
  id: string;
  name: string;
  date: string;
  time: string;
  /** ISO UTC pour affichage cohérent (optionnel) */
  generatedAtISO?: string;
  category: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    info?: number;
  };
  tests: Array<{
    num: number;
    name: string;
    status: "pass" | "fail";
    expected: string;
    actual: string;
    security?: SecurityComparisonCell;
  }>;
}

interface SecurityComparisonCell {
  kind: string;
  surface: string;
  status: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface CompareResult {
  success: boolean;
  reports?: CompareReportData[];
  comparison?: {
    byTest: Array<{
      testName: string;
      results: Record<string, "pass" | "fail" | "skip">;
      details?: Record<
        string,
        {
          expected?: string;
          actual?: string;
          response?: string;
          security?: SecurityComparisonCell;
        }
      >;
      diff?: string;
    }>;
    sameCategory: string | null;
    securitySummary?: {
      totalCritical: number;
      totalHigh: number;
      rowsCompared: number;
      sensitiveDataPolicy: string;
    } | null;
  };
  error?: string;
}

/** Affiche date/heure du rapport en heure locale du navigateur. Si generatedAtISO est fourni (UTC), on l’utilise pour un affichage cohérent. */
function formatReportDateLocal(
  date: string,
  time: string,
  generatedAtISO?: string,
): string {
  if (generatedAtISO) {
    try {
      const d = new Date(generatedAtISO);
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        });
    } catch {
      // fallback
    }
  }
  if (!date || !time) return `${date || ""} ${time || ""}`.trim();
  const timeNorm = /^\d{2}:\d{2}/.test(time)
    ? time
    : `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6) || "00"}`;
  try {
    const [y, m, d] = date.split("-");
    const [h, min] = timeNorm.split(":");
    if (!y || !m || !d) return `${date} ${timeNorm}`;
    const dObj = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h ?? 0),
      Number(min ?? 0),
      0,
      0,
    );
    if (Number.isNaN(dObj.getTime())) return `${date} ${timeNorm}`;
    return dObj.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return `${date} ${timeNorm}`;
  }
}

function formatReportSize(size?: number): string {
  if (!size || size <= 0) return "Taille inconnue";
  const mb = size / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 1 : 2)} Mo`;
  const kb = size / 1024;
  if (kb >= 1) return `${kb.toFixed(kb >= 10 ? 0 : 1)} Ko`;
  return `${size} o`;
}

/** Retourne les lignes où les résultats diffèrent entre les rapports (régression ou amélioration). */
function getDifferencesOnly(
  byTest: Array<{
    testName: string;
    results: Record<string, "pass" | "fail" | "skip">;
    diff?: string;
  }>,
  reportIds: string[],
) {
  if (!byTest.length || reportIds.length < 2) return [];
  return byTest.filter((row) => {
    const statuses = reportIds
      .map((id) => row.results[id])
      .filter((s) => s !== "skip");
    if (statuses.length < 2) return false;
    const first = statuses[0];
    return statuses.some((s) => s !== first);
  });
}

function isSecurityCompare(compareResult: CompareResult): boolean {
  return (
    compareResult.comparison?.sameCategory === "Sécurité" ||
    compareResult.reports?.some((report) => report.category === "Sécurité") ===
      true
  );
}

function securitySeverityClass(level: "critical" | "high" | "medium" | "low") {
  const classes = {
    critical:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 border-orange-200 dark:border-orange-800",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  };
  return classes[level];
}

function hasSecurityFindings(cell?: SecurityComparisonCell): boolean {
  return Boolean(cell && (cell.critical > 0 || cell.high > 0));
}

function normalizeSecurityKind(kind: string): string {
  const k = kind.trim().toLowerCase();
  if (k === "docker" || k === "container" || k === "image") return "docker";
  if (k === "node" || k === "npm") return "node";
  if (k === "rust" || k === "cargo") return "rust";
  if (k === "flutter" || k === "dart") return "flutter";
  return k || "autre";
}

function filterSecurityCompareRows(
  rows: NonNullable<CompareResult["comparison"]>["byTest"],
  reportIds: string[],
  options: {
    kind: string;
    onlyExploitable: boolean;
    hideAbsent: boolean;
  },
) {
  if (!rows) return [];
  return rows.filter((row) => {
    const cells = reportIds
      .map((id) => row.details?.[id]?.security)
      .filter(Boolean) as SecurityComparisonCell[];
    if (options.hideAbsent && cells.length === 0) return false;
    if (options.hideAbsent && cells.length < reportIds.length) {
      // garder les lignes partiellement absentes (info utile)
    }
    if (options.onlyExploitable && !cells.some((c) => hasSecurityFindings(c))) {
      return false;
    }
    if (options.kind !== "all") {
      const kinds = cells.map((c) => normalizeSecurityKind(c.kind));
      if (cells.length > 0 && !kinds.some((k) => k === options.kind)) {
        return false;
      }
    }
    return true;
  });
}

interface SensitiveSurface {
  kind: string;
  surface: string;
  status: string;
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  notes: string;
  findings: string[];
  command?: string;
  error?: string | null;
}

interface TestReport {
  id: string;
  category?: string;
  name?: string;
  timestamp: string;
  date: string;
  time: string;
  /** ISO UTC pour affichage en heure locale */
  generatedAtISO?: string;
  path: string;
  summaryPath?: string;
  htmlPath?: string;
  pdfPath?: string;
  jsonPath?: string;
  totalTests?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  /** Résumé JSON (ex. rapports sécurité imbriqués) */
  summary?: unknown;
  status?: "success" | "failed" | "partial" | "unknown";
  type?:
    | "performance-backend"
    | "performance-frontend"
    | "playwright"
    | "unitaire"
    | "e2e"
    | "coverage"
    | "security"
    | "other";
  size?: number;
}

export default function TestReportsPage() {
  const searchParams = useSearchParams();
  const openReportId = searchParams.get("open");
  const hasOpenedRef = useRef(false);
  const { user, loading: authLoading, isAuthenticated, token } = useAuth();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<TestReportListFilters>(DEFAULT_TEST_REPORT_FILTERS);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(
    null,
  );
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [securityKindFilter, setSecurityKindFilter] = useState<string>("all");
  const [securityOnlyExploitable, setSecurityOnlyExploitable] = useState(false);
  const [securityHideAbsent, setSecurityHideAbsent] = useState(false);
  const [sensitiveModalOpen, setSensitiveModalOpen] = useState(false);
  const [sensitivePassword, setSensitivePassword] = useState("");
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [sensitiveError, setSensitiveError] = useState<string | null>(null);
  const [sensitiveSurfaces, setSensitiveSurfaces] = useState<
    SensitiveSurface[] | null
  >(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadReports();
    }
  }, [authLoading, isAuthenticated]);

  // Ouvrir automatiquement le rapport si ?open=ID est dans l'URL
  useEffect(() => {
    if (!openReportId || reports.length === 0 || hasOpenedRef.current) return;
    const found = reports.some((r) => r.id === openReportId);
    if (found) {
      hasOpenedRef.current = true;
      loadReportContent(openReportId);
    }
  }, [openReportId, reports]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    if (isFullscreen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isFullscreen]);

  const openSensitiveDetails = async () => {
    if (!compareResult?.reports?.length || !token) return;
    const reportId = compareResult.reports[0]?.id;
    if (!reportId?.startsWith("security-")) {
      setSensitiveError(
        "Disponible uniquement pour les rapports sécurité CVE.",
      );
      setSensitiveModalOpen(true);
      return;
    }
    if (!sensitivePassword.trim()) {
      setSensitiveError("Saisissez votre mot de passe administrateur.");
      setSensitiveModalOpen(true);
      return;
    }
    setSensitiveLoading(true);
    setSensitiveError(null);
    setSensitiveSurfaces(null);
    try {
      const stepUpRes = await fetch("/api/test-reports/sensitive-step-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportId, password: sensitivePassword }),
        cache: "no-store",
      });
      const stepUpData = await stepUpRes.json();
      if (!stepUpRes.ok || !stepUpData.stepUpToken) {
        throw new Error(stepUpData.error || "Échec de la réauthentification");
      }

      const detailsRes = await fetch(
        `/api/test-reports/sensitive-details?reportId=${encodeURIComponent(reportId)}&stepUpToken=${encodeURIComponent(stepUpData.stepUpToken)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const detailsData = await detailsRes.json();
      if (!detailsRes.ok) {
        throw new Error(detailsData.error || "Accès refusé");
      }
      setSensitiveSurfaces(detailsData.surfaces ?? []);
      setSensitivePassword("");
    } catch (error: unknown) {
      setSensitiveError(
        error instanceof Error ? error.message : "Erreur accès sensible",
      );
    } finally {
      setSensitiveLoading(false);
      setSensitiveModalOpen(true);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      // ✅ NOUVEAU: Utiliser l'API unifiée qui scanne tous les types de rapports
      const response = await fetch("/api/test-reports/all", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReports(data.reports || []);
          // ✅ Stocker les catégories pour le filtre
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        } else {
          console.error("Erreur API chargement rapports:", data.error);
          setReports([]);
        }
      } else {
        console.error("Erreur HTTP chargement rapports:", response.status);
        setReports([]);
      }
    } catch (error) {
      console.error("Erreur chargement rapports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReportContent = async (reportId: string) => {
    try {
      setLoadingReport(true);
      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      // Utiliser l'ID du rapport directement
      const response = await fetch(
        `/api/test-reports/view?id=${encodeURIComponent(reportId)}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportContent(data.content);
          setSelectedReport(reportId);
        } else {
          console.error("Erreur API affichage rapport:", data.error);
          alert(`Erreur: ${data.error}`);
        }
      } else if (response.status === 404) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Fichier non trouvé" }));
        console.error("Rapport non trouvé:", reportId, errorData.error);
        setReportContent(null);
        setSelectedReport(null);
        alert(
          `Rapport introuvable. Le fichier a peut-être été supprimé ou déplacé.\n\nID : ${reportId}\n\nRafraîchissez la liste pour ne voir que les rapports disponibles.`,
        );
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        console.error("Erreur chargement rapport:", errorData.error);
        alert(`Erreur: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Erreur chargement contenu rapport:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "partial":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  /** Statut effectif pour couleur (success | failed | partial), déduit si unknown */
  const getEffectiveStatus = (report: {
    status?: string;
    failed?: number;
    passed?: number;
  }) => {
    const s = report.status;
    if (s === "success" || s === "failed" || s === "partial") return s;
    const failed = report.failed ?? 0;
    const passed = report.passed ?? 0;
    if (failed > 0) return "failed";
    if (passed > 0) return "success";
    return "partial";
  };
  /** Libellé affiché pour le statut (éviter "unknown") */
  const getStatusLabel = (report: {
    status?: string;
    failed?: number;
    passed?: number;
  }) => {
    const s = getEffectiveStatus(report);
    if (s === "success") return "SUCCÈS";
    if (s === "failed") return "ÉCHEC";
    return "PARTIEL";
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) {
      return;
    }

    try {
      setDeleting(reportId);
      const response = await fetch(
        `/api/test-reports/delete?id=${encodeURIComponent(reportId)}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (data.success) {
        // Recharger la liste
        await loadReports();
        // Si le rapport supprimé était sélectionné, le désélectionner
        if (selectedReport === reportId) {
          setSelectedReport(null);
          setReportContent(null);
        }
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur suppression rapport:", error);
      alert("Erreur lors de la suppression du rapport");
    } finally {
      setDeleting(null);
    }
  };

  const runCompare = async () => {
    if (selectedForCompare.length < 2) {
      alert(
        "Sélectionnez au moins 2 rapports de la même catégorie pour comparer.",
      );
      return;
    }
    setLoadingCompare(true);
    setCompareResult(null);
    try {
      const res = await fetch(
        `/api/test-reports/compare?ids=${selectedForCompare.join(",")}`,
      );
      const data = await res.json();
      if (data.success) {
        setCompareResult(data);
      } else {
        setCompareResult({
          success: false,
          error: data.error || "Erreur comparaison",
        });
      }
    } catch (e: any) {
      setCompareResult({ success: false, error: e.message || "Erreur réseau" });
    } finally {
      setLoadingCompare(false);
    }
  };

  const toggleCompareSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const report = reports.find((r) => r.id === id);
    if (!report) return;
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Au plus 2 rapports, et même catégorie
      if (prev.length >= 2) return prev;
      const firstId = prev[0];
      const firstReport = reports.find((r) => r.id === firstId);
      const firstCat = firstReport?.category || "";
      const thisCat = report.category || "";
      if (firstCat && thisCat && firstCat !== thisCat) {
        alert(
          `Sélectionnez uniquement des rapports de la même catégorie. « ${firstCat} » ≠ « ${thisCat} ».`,
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  const deleteAllReports = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer TOUS les rapports ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    try {
      setDeleting("all");
      const response = await fetch("/api/test-reports/delete?all=true", {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.deleted} rapport(s) supprimé(s)`);
        await loadReports();
        setSelectedReport(null);
        setReportContent(null);
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur suppression rapports:", error);
      alert("Erreur lors de la suppression des rapports");
    } finally {
      setDeleting(null);
    }
  };

  // Filtrer et trier les rapports
  const reportSearchSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        reports.flatMap((report) => [
          report.name,
          report.id,
          report.category,
          report.date,
        ]),
        80,
      ),
    [reports],
  );

  const reportFilterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (applied.query.trim()) {
      badges.push({
        key: "query",
        label: `Recherche : ${applied.query.trim()}`,
      });
    }
    if (applied.category) {
      badges.push({
        key: "category",
        label: `Catégorie : ${applied.category}`,
      });
    }
    if (applied.status) {
      const label =
        TEST_REPORT_STATUS_OPTIONS.find((o) => o.value === applied.status)
          ?.label || applied.status;
      badges.push({ key: "status", label: `Statut : ${label}` });
    }
    const sortLabel =
      TEST_REPORT_SORT_OPTIONS.find((o) => o.value === applied.sortBy)?.label ||
      applied.sortBy;
    badges.push({ key: "sort", label: `Tri : ${sortLabel}` });
    return badges;
  }, [applied]);

  const filteredReports = reports
    .filter((report) => {
      if (applied.query.trim()) {
        const query = applied.query.trim().toLowerCase();
        const matchesSearch =
          report.date.toLowerCase().includes(query) ||
          report.time.toLowerCase().includes(query) ||
          report.id.toLowerCase().includes(query) ||
          (report.name && report.name.toLowerCase().includes(query)) ||
          (report.category && report.category.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (applied.status) {
        if (getEffectiveStatus(report) !== applied.status) return false;
      }

      if (applied.category) {
        if (report.category !== applied.category) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (applied.sortBy) {
        case "date": {
          const da =
            new Date(`${a.date}T${a.time || "00:00:00"}`).getTime() || 0;
          const db =
            new Date(`${b.date}T${b.time || "00:00:00"}`).getTime() || 0;
          return db - da;
        }
        case "tests":
          return (b.totalTests || 0) - (a.totalTests || 0);
        case "passed":
          return (b.passed || 0) - (a.passed || 0);
        case "failed":
          return (b.failed || 0) - (a.failed || 0);
        default:
          return 0;
      }
    });

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Chargement des rapports...
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              Vous devez être connecté pour accéder aux rapports de tests.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                📊 Rapports de Tests
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Consultez tous les rapports HTML générés par les tests (hub ou
                ligne de commande). Les rapports <strong>Suite CLI</strong>{" "}
                proviennent de{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  make test-all
                </code>{" "}
                ou{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  run-all-tests-with-reports.sh
                </code>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setCompareMode((m) => !m);
                  setCompareResult(null);
                  setSelectedForCompare([]);
                }}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${compareMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
              >
                <GitCompare className="w-4 h-4" />
                <span className="sm:inline">
                  {compareMode
                    ? "Annuler comparaison"
                    : "Comparer des rapports"}
                </span>
              </button>
              <button
                onClick={loadReports}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="sm:inline">Actualiser</span>
              </button>
              {reports.length > 0 && (
                <button
                  onClick={deleteAllReports}
                  disabled={deleting === "all"}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sm:inline">
                    {deleting === "all" ? "Suppression..." : "Tout supprimer"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          {reports.length > 0 && (
            <FilterBar
              hasDraftChanges={hasDraftChanges}
              onApply={() => apply()}
              onReset={() => reset(DEFAULT_TEST_REPORT_FILTERS)}
              badges={reportFilterBadges}
            >
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FacetAutocompleteField
                  label="Recherche"
                  value={draft.query}
                  onChange={(value) => updateDraft("query", value)}
                  suggestions={reportSearchSuggestions}
                  placeholder="Nom, date, id…"
                />
                <FilterSelectField
                  label="Catégorie"
                  value={draft.category}
                  onChange={(value) => updateDraft("category", value)}
                  options={categories.map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                />
                <FilterSelectField
                  label="Statut"
                  value={draft.status}
                  onChange={(value) => updateDraft("status", value)}
                  options={[...TEST_REPORT_STATUS_OPTIONS]}
                />
                <FilterSelectField
                  label="Tri"
                  value={draft.sortBy}
                  onChange={(value) =>
                    updateDraft("sortBy", value as TestReportSortBy)
                  }
                  options={[...TEST_REPORT_SORT_OPTIONS]}
                  allowEmpty={false}
                  placeholder="Tri"
                />
              </div>
            </FilterBar>
          )}
        </div>

        {compareResult && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comparaison de rapports
              </h2>
              <button
                onClick={() => setCompareResult(null)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {!compareResult.success && (
                <p className="text-red-600 dark:text-red-400">
                  {compareResult.error}
                </p>
              )}
              {compareResult.success && compareResult.reports && (
                <>
                  {isSecurityCompare(compareResult) &&
                    compareResult.comparison?.securitySummary && (
                      <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
                              Comparaison sécurité CVE
                            </h3>
                            <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                              {
                                compareResult.comparison.securitySummary
                                  .rowsCompared
                              }{" "}
                              surfaces comparées,{" "}
                              {
                                compareResult.comparison.securitySummary
                                  .totalCritical
                              }{" "}
                              critical et{" "}
                              {
                                compareResult.comparison.securitySummary
                                  .totalHigh
                              }{" "}
                              high au total.
                            </p>
                          </div>
                          <div className="rounded-md bg-white/70 dark:bg-gray-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-200">
                            Données sensibles : notes brutes et payloads non
                            affichés ici.
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-red-700 dark:text-red-300">
                          {
                            compareResult.comparison.securitySummary
                              .sensitiveDataPolicy
                          }{" "}
                          Les totaux élevés viennent souvent des scans
                          Docker/images et dépendances npm — prioriser les
                          lignes avec critical/high et statut ≠ skipped. «
                          Absent » = surface scannée dans un seul rapport.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSensitiveError(null);
                              setSensitiveSurfaces(null);
                              setSensitiveModalOpen(true);
                            }}
                            className="rounded-md bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-900"
                          >
                            Voir détails sensibles (réauth)
                          </button>
                        </div>
                      </div>
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {compareResult.reports.map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          {r.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {formatReportDateLocal(
                            r.date,
                            r.time,
                            r.generatedAtISO,
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-sm">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {r.summary.total}
                            </span>
                            <br />
                            <span className="text-gray-500">Total</span>
                          </div>
                          <div>
                            <span className="font-semibold text-green-600">
                              {r.summary.passed}
                            </span>
                            <br />
                            <span className="text-gray-500">Réussis</span>
                          </div>
                          <div>
                            <span className="font-semibold text-red-600">
                              {r.summary.failed}
                            </span>
                            <br />
                            <span className="text-gray-500">Échoués</span>
                          </div>
                          <div>
                            <span className="font-semibold text-yellow-600">
                              {r.summary.skipped}
                            </span>
                            <br />
                            <span className="text-gray-500">Ignorés</span>
                          </div>
                        </div>
                        {r.category === "Sécurité" && (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                            <div
                              className={`rounded border px-2 py-2 ${securitySeverityClass("critical")}`}
                            >
                              <div className="font-bold text-sm">
                                {r.summary.critical ?? 0}
                              </div>
                              <div>Critical</div>
                            </div>
                            <div
                              className={`rounded border px-2 py-2 ${securitySeverityClass("high")}`}
                            >
                              <div className="font-bold text-sm">
                                {r.summary.high ?? 0}
                              </div>
                              <div>High</div>
                            </div>
                            <div
                              className={`rounded border px-2 py-2 ${securitySeverityClass("medium")}`}
                            >
                              <div className="font-bold text-sm">
                                {r.summary.medium ?? 0}
                              </div>
                              <div>Medium</div>
                            </div>
                            <div
                              className={`rounded border px-2 py-2 ${securitySeverityClass("low")}`}
                            >
                              <div className="font-bold text-sm">
                                {r.summary.low ?? 0}
                              </div>
                              <div>Low</div>
                            </div>
                            <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-gray-700 dark:text-gray-200">
                              <div className="font-bold text-sm">
                                {r.summary.info ?? 0}
                              </div>
                              <div>Info</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {isSecurityCompare(compareResult) &&
                    compareResult.comparison?.byTest &&
                    compareResult.comparison.byTest.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                          Surfaces sécurité comparées
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          Chaque ligne affiche uniquement la surface, le type de
                          scan, le statut et les compteurs de sévérité par
                          rapport. Les notes/payloads nécessitent le bouton «
                          détails sensibles » avec réauthentification.
                        </p>
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                          <label className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-300">
                              Type
                            </span>
                            <select
                              value={securityKindFilter}
                              onChange={(e) =>
                                setSecurityKindFilter(e.target.value)
                              }
                              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                            >
                              <option value="all">Tous</option>
                              <option value="docker">Docker</option>
                              <option value="node">Node/npm</option>
                              <option value="rust">Rust</option>
                              <option value="flutter">Flutter</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={securityOnlyExploitable}
                              onChange={(e) =>
                                setSecurityOnlyExploitable(e.target.checked)
                              }
                            />
                            Critical/high uniquement
                          </label>
                          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={securityHideAbsent}
                              onChange={(e) =>
                                setSecurityHideAbsent(e.target.checked)
                              }
                            />
                            Masquer absents partout
                          </label>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">
                                  Surface
                                </th>
                                {compareResult.reports.map((r) => (
                                  <th
                                    key={r.id}
                                    className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[220px]"
                                  >
                                    {formatReportDateLocal(
                                      r.date,
                                      r.time,
                                      r.generatedAtISO,
                                    )}
                                  </th>
                                ))}
                                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                                  Écart
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {compareResult.comparison.byTest.map(
                                (row, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-gray-100 dark:border-gray-700"
                                  >
                                    <td className="py-3 px-3 align-top">
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {row.testName}
                                      </div>
                                    </td>
                                    {compareResult.reports!.map((r) => {
                                      const cell =
                                        row.details?.[r.id]?.security;
                                      if (!cell) {
                                        return (
                                          <td
                                            key={r.id}
                                            className="py-3 px-3 align-top text-gray-400"
                                          >
                                            Absent (non scanné)
                                          </td>
                                        );
                                      }
                                      return (
                                        <td
                                          key={r.id}
                                          className="py-3 px-3 align-top"
                                        >
                                          <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span
                                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                cell.status === "skipped" ||
                                                cell.status === "skip"
                                                  ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                  : hasSecurityFindings(cell)
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                              }`}
                                            >
                                              {cell.status === "skipped" ||
                                              cell.status === "skip"
                                                ? "Ignoré"
                                                : hasSecurityFindings(cell)
                                                  ? "À traiter"
                                                  : "OK"}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              {cell.kind} ·{" "}
                                              {securityStatusLabel(cell.status)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-5">
                                            <span
                                              className={`rounded border px-2 py-1 ${securitySeverityClass("critical")}`}
                                            >
                                              C {cell.critical}
                                            </span>
                                            <span
                                              className={`rounded border px-2 py-1 ${securitySeverityClass("high")}`}
                                            >
                                              H {cell.high}
                                            </span>
                                            <span
                                              className={`rounded border px-2 py-1 ${securitySeverityClass("medium")}`}
                                            >
                                              M {cell.medium}
                                            </span>
                                            <span
                                              className={`rounded border px-2 py-1 ${securitySeverityClass("low")}`}
                                            >
                                              L {cell.low}
                                            </span>
                                            <span className="rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-gray-600 dark:text-gray-300">
                                              I {cell.info}
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                    <td className="py-3 px-3 align-top text-gray-600 dark:text-gray-400">
                                      {row.diff ?? "Même statut"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  {compareResult.comparison?.byTest &&
                    compareResult.comparison.byTest.length > 0 &&
                    !isSecurityCompare(compareResult) &&
                    (() => {
                      const reportIds = compareResult.reports!.map((r) => r.id);
                      const differencesOnly = getDifferencesOnly(
                        compareResult.comparison.byTest,
                        reportIds,
                      );
                      return (
                        <>
                          {differencesOnly.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                🔍 Tests qui diffèrent ({differencesOnly.length}
                                )
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                Ces tests n'ont pas le même résultat entre les
                                deux rapports (régression ou amélioration).
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/20">
                                      <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">
                                        Test
                                      </th>
                                      {compareResult.reports!.map((r) => (
                                        <th
                                          key={r.id}
                                          className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300"
                                        >
                                          {formatReportDateLocal(
                                            r.date,
                                            r.time,
                                            r.generatedAtISO,
                                          )}
                                        </th>
                                      ))}
                                      <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                                        Écart
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {differencesOnly.map((row, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b border-amber-100 dark:border-amber-800/50"
                                      >
                                        <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">
                                          {row.testName}
                                        </td>
                                        {compareResult.reports!.map((r) => (
                                          <td key={r.id} className="py-2 px-3">
                                            {row.results[r.id] === "pass" && (
                                              <span className="text-green-600 font-medium">
                                                ✓ Réussi
                                              </span>
                                            )}
                                            {row.results[r.id] === "fail" && (
                                              <span className="text-red-600 font-medium">
                                                ✗ Échoué
                                              </span>
                                            )}
                                            {row.results[r.id] === "skip" && (
                                              <span className="text-gray-400">
                                                —
                                              </span>
                                            )}
                                          </td>
                                        ))}
                                        <td className="py-2 px-3 text-amber-700 dark:text-amber-300">
                                          {row.diff ??
                                            "Régression ou amélioration"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                            Tous les tests
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">
                                    Test
                                  </th>
                                  {compareResult.reports.map((r) => (
                                    <th
                                      key={r.id}
                                      className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300"
                                    >
                                      {formatReportDateLocal(
                                        r.date,
                                        r.time,
                                        r.generatedAtISO,
                                      )}
                                    </th>
                                  ))}
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                                    Résumé
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {compareResult.comparison.byTest.map(
                                  (row, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b border-gray-100 dark:border-gray-700"
                                    >
                                      <td className="py-2 px-3 text-gray-900 dark:text-white">
                                        {row.testName}
                                      </td>
                                      {compareResult.reports!.map((r) => (
                                        <td key={r.id} className="py-2 px-3">
                                          {row.results[r.id] === "pass" && (
                                            <span className="text-green-600 font-medium">
                                              ✓ Réussi
                                            </span>
                                          )}
                                          {row.results[r.id] === "fail" && (
                                            <span className="text-red-600 font-medium">
                                              ✗ Échoué
                                            </span>
                                          )}
                                          {row.results[r.id] === "skip" && (
                                            <span className="text-gray-400">
                                              —
                                            </span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                        {row.diff ?? "—"}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  {compareResult.comparison?.byTest &&
                    compareResult.comparison.byTest.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Aucun détail comparable disponible pour ces rapports.
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun rapport disponible
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucun rapport de test n'a été généré pour le moment.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Exécutez{" "}
              <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                make test-all
              </code>{" "}
              pour générer des rapports.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
              Accès :{" "}
              <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                http://localhost:5003/b4ck0ff1ce/test-reports
              </code>
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-3 sm:gap-4 lg:gap-6 transition-all ${isFullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 lg:h-[calc(100vh-18rem)] lg:min-h-[34rem]"}`}
          >
            {/* Liste des rapports */}
            {!isFullscreen && (
              <div className="min-h-0 space-y-4 flex flex-col rounded-lg border border-gray-200 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Rapports Disponibles ({filteredReports.length} /{" "}
                    {reports.length})
                  </h2>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    Volume affiché :{" "}
                    {formatReportSize(
                      filteredReports.reduce(
                        (total, report) => total + (report.size ?? 0),
                        0,
                      ),
                    )}
                  </span>
                  {compareMode && selectedForCompare.length >= 2 && (
                    <button
                      onClick={runCompare}
                      disabled={loadingCompare}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                    >
                      <GitCompare className="w-4 h-4" />
                      {loadingCompare
                        ? "Chargement..."
                        : `Comparer ${selectedForCompare.length} rapports`}
                    </button>
                  )}
                </div>
                {compareMode && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    Cliquez sur <strong>« Sélectionner pour comparer »</strong>{" "}
                    sur un rapport, puis sur un second rapport de la{" "}
                    <strong>même catégorie</strong>. Ensuite cliquez sur le
                    bouton <strong>« Comparer 2 rapports »</strong>.
                  </p>
                )}

                <div className="min-h-[28rem] flex-1 space-y-3 overflow-y-auto pr-1 lg:min-h-0">
                  {filteredReports.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Aucun rapport ne correspond aux critères de recherche
                      </p>
                    </div>
                  ) : (
                    filteredReports.map((report) => {
                      const selectedForCompareCount = selectedForCompare.length;
                      const firstSelectedId = selectedForCompareCount
                        ? selectedForCompare[0]
                        : null;
                      const firstReport = firstSelectedId
                        ? reports.find((r) => r.id === firstSelectedId)
                        : null;
                      const firstCategory = firstReport?.category || "";
                      const reportCategory = report.category || "";
                      const canSelectForCompare =
                        compareMode &&
                        (selectedForCompareCount === 0 ||
                          (selectedForCompareCount === 1 &&
                            firstCategory &&
                            reportCategory === firstCategory) ||
                          selectedForCompare.includes(report.id));
                      const isSelectedForCompare = selectedForCompare.includes(
                        report.id,
                      );
                      return (
                        <div
                          key={report.id}
                          className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-3 sm:p-4 transition-all hover:shadow-lg ${
                            compareMode
                              ? isSelectedForCompare
                                ? "border-indigo-500 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-800"
                                : "border-gray-200 dark:border-gray-700"
                              : "cursor-pointer"
                          } ${!compareMode && selectedReport === report.id ? "border-blue-500 shadow-md" : ""}`}
                          onClick={() =>
                            !compareMode && loadReportContent(report.id)
                          }
                        >
                          {compareMode && (
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={(e) =>
                                  toggleCompareSelection(e, report.id)
                                }
                                disabled={
                                  !canSelectForCompare && !isSelectedForCompare
                                }
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  isSelectedForCompare
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : canSelectForCompare
                                      ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelectedForCompare ? "bg-indigo-600 border-indigo-600" : "border-gray-400"}`}
                                >
                                  {isSelectedForCompare && (
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  )}
                                </span>
                                {isSelectedForCompare
                                  ? "Sélectionné pour comparaison"
                                  : canSelectForCompare
                                    ? "Sélectionner pour comparer"
                                    : "Même catégorie requise"}
                              </button>
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {getStatusIcon(getEffectiveStatus(report))}
                              <div className="flex-1 min-w-0">
                                {report.category && (
                                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-1">
                                    {report.category}
                                  </span>
                                )}
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {report.name ||
                                    `Rapport du ${formatReportDateLocal(report.date, report.time, report.generatedAtISO)}`}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p
                                    className="text-sm text-gray-500 dark:text-gray-400"
                                    title={`UTC: ${report.date} ${report.time}`}
                                  >
                                    {formatReportDateLocal(
                                      report.date,
                                      report.time,
                                      report.generatedAtISO,
                                    )}
                                  </p>
                                  {report.category && (
                                    <>
                                      <span className="text-gray-300 dark:text-gray-600">
                                        •
                                      </span>
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                        {report.category}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-gray-300 dark:text-gray-600">
                                    •
                                  </span>
                                  <span
                                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded"
                                    title={
                                      report.size
                                        ? `${report.size.toLocaleString("fr-FR")} octets`
                                        : "Taille non disponible"
                                    }
                                  >
                                    {formatReportSize(report.size)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {(report.status ||
                              report.failed !== undefined ||
                              report.passed !== undefined) && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(getEffectiveStatus(report))}`}
                              >
                                {getStatusLabel(report)}
                              </span>
                            )}
                          </div>

                          {/* ✅ Toujours afficher les statistiques si disponibles */}
                          {(report.totalTests !== undefined &&
                            report.totalTests > 0) ||
                          (report.passed !== undefined && report.passed > 0) ||
                          (report.failed !== undefined && report.failed > 0) ? (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {report.totalTests || 0}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Total
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-green-600 dark:text-green-400">
                                    {report.passed || 0}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Réussis
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-red-600 dark:text-red-400">
                                    {report.failed || 0}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Échoués
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                                    {report.skipped || 0}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Ignorés
                                  </div>
                                </div>
                              </div>
                              {/* Détail sécurité (CRITIQUES, HAUTES, etc.) pour les rapports Tests Sécurité */}
                              {(report.category === "Tests Sécurité" ||
                                report.category === "Sécurité") &&
                                (report.summary as any)?.summary?.security &&
                                (() => {
                                  const sec = (report.summary as any).summary
                                    .security as {
                                    critical?: number;
                                    high?: number;
                                    medium?: number;
                                    low?: number;
                                    secure?: number;
                                  };
                                  return (
                                    <div className="grid grid-cols-2 xs:grid-cols-5 gap-1.5 text-xs pt-1 border-t border-gray-200 dark:border-gray-600">
                                      <div className="text-center">
                                        <span className="font-medium text-red-700 dark:text-red-400">
                                          🚨 {sec.critical ?? 0}
                                        </span>
                                        <br />
                                        <span className="text-gray-500">
                                          Critiques
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="font-medium text-orange-600 dark:text-orange-400">
                                          🔴 {sec.high ?? 0}
                                        </span>
                                        <br />
                                        <span className="text-gray-500">
                                          Hautes
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                          🟡 {sec.medium ?? 0}
                                        </span>
                                        <br />
                                        <span className="text-gray-500">
                                          Moyennes
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                          🟢 {sec.low ?? 0}
                                        </span>
                                        <br />
                                        <span className="text-gray-500">
                                          Basses
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                          ✅ {sec.secure ?? 0}
                                        </span>
                                        <br />
                                        <span className="text-gray-500">
                                          Sécurisées
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                            </div>
                          ) : report.type === "performance-backend" ||
                            report.type === "performance-frontend" ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              📊 Rapport de performance - Consultez le rapport
                              pour les détails
                            </div>
                          ) : report.type === "security" ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              Rapport sécurité - Consultez ou téléchargez le
                              résumé pour le tri P0.
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadReportContent(report.id);
                              }}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 sm:flex-initial min-w-[80px] justify-center"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">Voir</span>
                            </button>
                            <a
                              href={`/api/test-reports/download?id=${encodeURIComponent(report.id)}`}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex-1 sm:flex-initial min-w-[80px] justify-center"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">
                                Télécharger
                              </span>
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteReport(report.id);
                              }}
                              disabled={deleting === report.id}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial min-w-[80px] justify-center"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">
                                {deleting === report.id ? "..." : "Supprimer"}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Aperçu du rapport sélectionné */}
            <div className="min-h-0 flex flex-col">
              {loadingReport ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Chargement du rapport...
                  </p>
                </div>
              ) : selectedReport && reportContent ? (
                <div
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${isFullscreen ? "fixed inset-2 sm:inset-4 z-50" : "min-h-0 flex flex-1 flex-col"}`}
                >
                  <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {isFullscreen
                          ? `REPORT-${selectedReport}`
                          : "Aperçu du Rapport"}
                      </h2>
                      <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {(() => {
                          const r = reports.find(
                            (x) => x.id === selectedReport,
                          );
                          return r
                            ? formatReportDateLocal(
                                r.date,
                                r.time,
                                r.generatedAtISO,
                              )
                            : "";
                        })()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      {isFullscreen ? (
                        <>
                          <button
                            onClick={() => setIsFullscreen(false)}
                            className="flex items-center gap-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-md"
                            title="Réduire le rapport (ou appuyez sur Escape)"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Réduire</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReport(null);
                              setReportContent(null);
                              setIsFullscreen(false);
                            }}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            title="Fermer l'aperçu"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Fermer</span>
                          </button>
                          <button
                            onClick={() => setIsFullscreen(true)}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            title="Afficher en plein écran"
                          >
                            <span className="hidden xs:inline">
                              Plein écran
                            </span>
                            <span className="xs:hidden">⛶</span>
                          </button>
                        </>
                      )}
                      <a
                        href={`/api/test-reports/download?id=${encodeURIComponent(selectedReport)}`}
                        download
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Télécharger</span>
                      </a>
                      {(() => {
                        const r = reports.find((x) => x.id === selectedReport);
                        const isE2eOrPlaywright =
                          r &&
                          (r.type === "e2e" ||
                            r.category?.includes("Playwright") ||
                            r.category?.includes("Backoffice"));
                        if (!isE2eOrPlaywright) return null;
                        return (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/test-reports/view?id=${encodeURIComponent(selectedReport!)}&playwright=1`,
                                );
                                const data = await res.json();
                                if (data.success && data.content) {
                                  setReportContent(data.content);
                                } else {
                                  alert(
                                    data.error ||
                                      "Rapport Playwright non disponible pour ce run.",
                                  );
                                }
                              } catch (e) {
                                alert("Erreur chargement rapport Playwright.");
                              }
                            }}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700"
                            title="Afficher le rapport Playwright détaillé (captures d&#39;écran)"
                          >
                            <Image className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">
                              Captures Playwright
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  <div
                    className={`min-h-0 p-2 sm:p-4 ${isFullscreen ? "h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)]" : "flex-1 overflow-hidden"}`}
                  >
                    <ReportIframe
                      content={reportContent}
                      isFullscreen={isFullscreen}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Sélectionnez un rapport pour l'afficher
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {sensitiveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-red-300 bg-white p-5 shadow-xl dark:border-red-800 dark:bg-gray-900"
            role="dialog"
            aria-labelledby="sensitive-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="sensitive-modal-title"
                  className="text-lg font-semibold text-red-900 dark:text-red-100"
                >
                  Détails sensibles — réauthentification requise
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Jeton court, usage unique, pas de cache. Audit journalisé.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSensitiveModalOpen(false);
                  setSensitivePassword("");
                  setSensitiveError(null);
                }}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!sensitiveSurfaces && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mot de passe administrateur
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={sensitivePassword}
                    onChange={(e) => setSensitivePassword(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  />
                </label>
                {sensitiveError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {sensitiveError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={sensitiveLoading}
                  onClick={openSensitiveDetails}
                  className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {sensitiveLoading ? "Vérification…" : "Confirmer et afficher"}
                </button>
              </div>
            )}

            {sensitiveSurfaces && (
              <div className="space-y-4">
                {sensitiveSurfaces.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aucun détail sensible trouvé dans ce rapport.
                  </p>
                ) : (
                  sensitiveSurfaces
                    .filter((s) => s.notes || s.findings.length > 0)
                    .slice(0, 50)
                    .map((surface) => (
                      <div
                        key={`${surface.kind}-${surface.surface}`}
                        className="rounded border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {surface.kind} — {surface.surface}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {surface.status} · C{surface.counts.critical} H
                          {surface.counts.high}
                        </div>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                          {surface.notes || surface.findings.join("\n")}
                        </pre>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

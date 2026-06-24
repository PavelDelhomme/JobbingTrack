"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { EmailBackofficePageShell } from "../emails/EmailBackofficeSubNav";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/Pagination";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import {
  EMAIL_STATUS_FILTER_OPTIONS,
  EMAIL_TYPE_FILTER_OPTIONS,
  EMAIL_CHANNEL_FILTER_OPTIONS,
} from "@/lib/filters/emailMonitorOptions";
import type { FilterBadge } from "@/lib/filters/types";
import { formatLocalDateTime } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { EmailHtmlPreview } from "@/components/emails/EmailHtmlPreview";
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
  Trash2,
  Eye,
  Download,
} from "lucide-react";

type EmailLog = {
  id: string;
  userId?: string;
  to: string;
  from: string;
  subject: string;
  type:
    | "WELCOME"
    | "VERIFICATION"
    | "RESET_PASSWORD"
    | "CONFIRMATION"
    | "NOTIFICATION"
    | "TEST";
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "BOUNCED";
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  emailContent?: string;
  metadata?: any;
  trackingId?: string;
  openCount?: number;
  clickCount?: number;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

type EmailFilters = {
  status: string;
  type: string;
  channel: string;
  query: string;
};

function buildInitialEmailFilters(searchParams: URLSearchParams): EmailFilters {
  const type = searchParams.get("type");
  const channel = searchParams.get("channel");
  const validChannels = new Set([
    "crash_report",
    "email_agent_daily_digest",
    "email_agent_weekly_digest",
  ]);
  return {
    status: "",
    type: type === "NOTIFICATION" ? "NOTIFICATION" : "",
    channel: channel && validChannels.has(channel) ? channel : "",
    query: "",
  };
}

export default function EmailMonitorPage() {
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () => buildInitialEmailFilters(searchParams),
    [searchParams],
  );
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<EmailFilters>(initialFilters);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadEmailsRef = useRef<(silent?: boolean) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const API_URL = FRONTEND_URLS.api;
  const POLL_INTERVAL_MS = 10000; // Suivi quasi temps réel sans marteler l'API en onglet ouvert.

  const querySuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        emails.flatMap((email) => [email.to, email.from, email.subject]),
        60,
      ),
    [emails],
  );

  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (applied.status) {
      const label =
        EMAIL_STATUS_FILTER_OPTIONS.find((o) => o.value === applied.status)
          ?.label || applied.status;
      badges.push({ key: "status", label: `Statut : ${label}` });
    }
    if (applied.type) {
      const label =
        EMAIL_TYPE_FILTER_OPTIONS.find((o) => o.value === applied.type)
          ?.label || applied.type;
      badges.push({ key: "type", label: `Type : ${label}` });
    }
    if (applied.channel) {
      const label =
        EMAIL_CHANNEL_FILTER_OPTIONS.find((o) => o.value === applied.channel)
          ?.label || applied.channel;
      badges.push({ key: "channel", label: `Canal : ${label}` });
    }
    if (applied.query.trim()) {
      badges.push({
        key: "query",
        label: `Recherche : ${applied.query.trim()}`,
      });
    }
    return badges;
  }, [applied]);

  const loadEmails = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setLoadError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoadError("Connectez-vous pour voir les logs d'emails.");
          setEmails([]);
          if (!silent) setIsLoading(false);
          return;
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (applied.status) {
          params.append("status", applied.status);
        }
        if (applied.type) {
          params.append("type", applied.type);
        }
        if (applied.channel) {
          params.append("channel", applied.channel);
        }
        if (applied.query.trim()) {
          params.append("q", applied.query.trim());
        }

        const response = await fetch(
          `${API_URL}/api/v1/emails/logs?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status === 401) {
          setLoadError("Session expirée ou non autorisée. Reconnectez-vous.");
          setEmails([]);
          if (!silent) setIsLoading(false);
          return;
        }

        if (!response.ok) {
          setLoadError(
            `API ${response.status}: ${response.statusText}. Vérifiez que la gateway (${API_URL}) et auth-service sont démarrés.`,
          );
          setEmails([]);
          if (!silent) setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success) {
          setEmails(data.data || []);
          setTotal(data.pagination?.total || 0);
          setLastRefreshAt(new Date());
        } else {
          setLoadError(data.error || "Erreur chargement");
          setEmails([]);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setLoadError(`Impossible de joindre l'API (${API_URL}). ${msg}`);
        setEmails([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [API_URL, applied.query, applied.status, applied.type, applied.channel, limit, page],
  );

  loadEmailsRef.current = loadEmails;

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  // Rafraîchir dès que l'onglet redevient visible (pour voir les mails envoyés pendant qu'on était ailleurs)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadEmailsRef.current(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Polling temps réel tant que la page est visible
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadEmailsRef.current(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleApplyFilters = () => {
    setPage(1);
    apply();
  };

  const handleResetFilters = () => {
    setPage(1);
    reset(initialFilters);
  };

  const refreshEmails = () => {
    void loadEmails();
  };

  const clearLogs = async () => {
    if (
      confirm(
        "Voulez-vous effacer tous les logs d'emails ? Cette action est irréversible.",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/v1/emails/logs`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          setEmails([]);
          void loadEmails();
        } else {
          alert("Erreur lors de la suppression des logs");
        }
      } catch (error) {
        console.error("Erreur suppression logs:", error);
        alert("Erreur lors de la suppression des logs");
      }
    }
  };

  const deleteFailedEmails = async () => {
    if (
      confirm(
        "Voulez-vous supprimer tous les emails échoués ? Cette action est irréversible.",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/v1/emails/logs/failed`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          loadEmails(); // Recharger pour mettre à jour
          alert("Emails échoués supprimés avec succès");
        } else {
          alert("Erreur lors de la suppression des emails échoués");
        }
      } catch (error) {
        console.error("Erreur suppression emails échoués:", error);
        alert("Erreur lors de la suppression des emails échoués");
      }
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(emails, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-logs-${Date.now()}.json`;
    a.click();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "WELCOME":
        return "👋";
      case "VERIFICATION":
        return "✅";
      case "RESET_PASSWORD":
        return "🔐";
      case "CONFIRMATION":
        return "✔️";
      case "NOTIFICATION":
        return "🔔";
      case "TEST":
        return "🧪";
      default:
        return "📧";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "WELCOME":
        return "Bienvenue";
      case "VERIFICATION":
        return "Vérification";
      case "RESET_PASSWORD":
        return "Reset Password";
      case "CONFIRMATION":
        return "Confirmation";
      case "NOTIFICATION":
        return "Notification";
      case "TEST":
        return "Test";
      default:
        return "Autre";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "En attente";
      case "SENT":
        return "Envoyé";
      case "DELIVERED":
        return "Livré";
      case "READ":
        return "Lu";
      case "FAILED":
        return "Échoué";
      case "BOUNCED":
        return "Rejeté";
      default:
        return status;
    }
  };

  const stats = {
    total: total || emails.length,
    sent: emails.filter((e) => e.status === "SENT").length,
    delivered: emails.filter((e) => e.status === "DELIVERED").length,
    read: emails.filter((e) => e.status === "READ" || e.openedAt).length,
    failed: emails.filter((e) => e.status === "FAILED").length,
    pending: emails.filter((e) => e.status === "PENDING").length,
    bounced: emails.filter((e) => e.status === "BOUNCED").length,
  };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <EmailBackofficePageShell
      title={
        <span className="flex min-w-0 items-center gap-2">
          <Mail className="h-7 w-7 flex-shrink-0 sm:h-8 sm:w-8" />
          Email Monitor
        </span>
      }
      description={
        <>
          Suivez les emails envoyés par JobbingTrack : statut, destinataire,
          date et contenu. Filtrez <strong>Crash / retour mobile</strong> pour
          les rapports bug et crash. Utilisez <strong>Notification</strong> pour
          les alertes sécurité.
        </>
      }
      actions={
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-row xl:flex-wrap xl:items-center xl:justify-end">
          {lastRefreshAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400 sm:whitespace-nowrap">
              Dernière MAJ : {lastRefreshAt.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer sm:whitespace-nowrap">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Temps réel (toutes les 3 s)
          </label>
          {autoRefresh && lastRefreshAt && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                aria-hidden
              />
              Live
            </span>
          )}
          <Button
            onClick={refreshEmails}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
          <Button
            onClick={exportLogs}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button
            onClick={deleteFailedEmails}
            variant="outline"
            className="w-full text-orange-600 sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer Échoués
          </Button>
          <Button
            onClick={clearLogs}
            variant="outline"
            className="w-full text-red-600 sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Effacer Tout
          </Button>
        </div>
      }
    >
      {/* Statistiques */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Envoyés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.sent}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.failed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        hasDraftChanges={hasDraftChanges}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        badges={filterBadges}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FacetAutocompleteField
            label="Recherche"
            value={draft.query}
            onChange={(value) => updateDraft("query", value)}
            suggestions={querySuggestions}
            placeholder="Destinataire, expéditeur ou sujet…"
          />
          <FilterSelectField
            label="Statut"
            value={draft.status}
            onChange={(value) => updateDraft("status", value)}
            options={[...EMAIL_STATUS_FILTER_OPTIONS]}
          />
          <FilterSelectField
            label="Type d'email"
            value={draft.type}
            onChange={(value) => updateDraft("type", value)}
            options={[...EMAIL_TYPE_FILTER_OPTIONS]}
          />
          <FilterSelectField
            label="Canal"
            value={draft.channel}
            onChange={(value) => updateDraft("channel", value)}
            options={[...EMAIL_CHANNEL_FILTER_OPTIONS]}
          />
        </div>
      </FilterBar>

      {/* Liste des Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-words">
              Emails Envoyés ({emails.length} / {total})
            </span>
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="h-16 w-16 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Chargement des emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Aucun email trouvé</p>
                {loadError ? (
                  <p className="text-sm mt-2 text-amber-600 dark:text-amber-400">
                    {loadError}
                  </p>
                ) : (
                  <>
                    <p className="text-sm mt-2">
                      Les emails envoyés (inscription, vérification, reset
                      password, notifications sécurité) apparaîtront ici.
                    </p>
                    <p className="text-xs mt-2 text-gray-400">
                      Après un parcours « Inscription + vérif. email » réussi,
                      l’email de vérification doit être loggé. Vérifiez que
                      auth-service tourne et que la table EmailLog existe
                      (Prisma).
                    </p>
                  </>
                )}
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  className="min-w-0 rounded-lg border-2 border-gray-200 bg-white p-3 transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 sm:p-4"
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    {/* Icône Statut */}
                    <div
                      className={`
                        flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12
                        ${email.status === "SENT" ? "bg-green-100 dark:bg-green-900/30" : ""}
                        ${email.status === "DELIVERED" ? "bg-blue-100 dark:bg-blue-900/30" : ""}
                        ${email.status === "READ" ? "bg-purple-100 dark:bg-purple-900/30" : ""}
                        ${email.status === "FAILED" ? "bg-red-100 dark:bg-red-900/30" : ""}
                        ${email.status === "PENDING" ? "bg-orange-100 dark:bg-orange-900/30" : ""}
                        ${email.status === "BOUNCED" ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}
                      `}
                    >
                      {email.status === "SENT" && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                      {email.status === "DELIVERED" && (
                        <CheckCircle className="h-6 w-6 text-blue-500" />
                      )}
                      {email.status === "READ" && (
                        <Eye className="h-6 w-6 text-purple-500" />
                      )}
                      {email.status === "FAILED" && (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      {email.status === "PENDING" && (
                        <Clock className="h-6 w-6 text-orange-500" />
                      )}
                      {email.status === "BOUNCED" && (
                        <XCircle className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-2xl flex-shrink-0">
                          {getTypeIcon(email.type)}
                        </span>
                        <h3 className="min-w-0 flex-[1_1_100%] break-words font-semibold text-gray-900 dark:text-gray-100 sm:flex-1">
                          {email.subject}
                        </h3>
                        <Badge
                          variant={
                            email.status === "SENT"
                              ? "default"
                              : email.status === "DELIVERED"
                                ? "default"
                                : email.status === "READ"
                                  ? "default"
                                  : email.status === "FAILED"
                                    ? "destructive"
                                    : email.status === "BOUNCED"
                                      ? "destructive"
                                      : "secondary"
                          }
                        >
                          {getStatusLabel(email.status)}
                        </Badge>
                        <Badge variant="outline">
                          {getTypeLabel(email.type)}
                        </Badge>
                        {email.metadata?.kind === "email_agent_daily_digest" && (
                          <Badge variant="secondary">Digest agent (jour)</Badge>
                        )}
                        {email.metadata?.kind === "email_agent_weekly_digest" && (
                          <Badge variant="secondary">Digest agent (semaine)</Badge>
                        )}
                        {email.metadata?.accountEmail && email.metadata.accountEmail !== email.to && (
                          <Badge variant="outline" title="Compte utilisateur lié">
                            Compte : {String(email.metadata.accountEmail)}
                          </Badge>
                        )}
                        {email.metadata?.channel === "crash_report" && (
                          <Badge variant="destructive">
                            {email.metadata?.feedback === true
                              ? "Retour mobile"
                              : "Crash report"}
                          </Badge>
                        )}
                        {email.metadata?.mirror?.sent === true && (
                          <Badge variant="secondary">Miroir SMTP OK</Badge>
                        )}
                        {email.metadata?.mirror?.sent === false && (
                          <Badge variant="destructive">Miroir SMTP KO</Badge>
                        )}
                        {email.metadata?.mirror?.queued === true && (
                          <Badge variant="secondary">Miroir SMTP…</Badge>
                        )}
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-400 lg:grid-cols-2">
                        <div className="flex min-w-0 items-start gap-1">
                          <User className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span className="min-w-0 break-all">
                            À : {email.to}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-start gap-1">
                          <Send className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span className="min-w-0 break-all">
                            De : {email.from}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-start gap-1">
                          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          {email.sentAt ? (
                            <span className="min-w-0 break-words">
                              {email.status === "FAILED"
                                ? "Tentative"
                                : "Envoyé"}{" "}
                              : {formatLocalDateTime(email.sentAt)}
                            </span>
                          ) : email.createdAt ? (
                            <span className="min-w-0 break-words text-gray-500 dark:text-gray-400">
                              Créé : {formatLocalDateTime(email.createdAt)}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              En attente...
                            </span>
                          )}
                        </div>
                        {email.status === "FAILED" && (
                          <div className="flex min-w-0 items-start gap-1 text-red-600 dark:text-red-400 sm:col-span-2">
                            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">
                              Échec SMTP : {email.error || "Erreur inconnue"}
                              {email.metadata?.mirror?.error
                                ? ` · miroir : ${email.metadata.mirror.error}`
                                : ""}
                            </span>
                          </div>
                        )}
                        {email.openedAt && (
                          <div className="flex min-w-0 items-start gap-1 text-purple-600 dark:text-purple-400">
                            <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">
                              Ouvert : {formatLocalDateTime(email.openedAt)} (
                              {email.openCount || 0}x)
                            </span>
                          </div>
                        )}
                        {email.clickedAt && (
                          <div className="flex min-w-0 items-start gap-1 text-blue-600 dark:text-blue-400">
                            <Send className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">
                              Cliqué : {formatLocalDateTime(email.clickedAt)} (
                              {email.clickCount || 0}x)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Erreur détaillée (liste) */}
                      {email.error && email.status === "FAILED" && (
                        <div className="mt-2 break-words rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                          {email.error}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEmail(email)}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir le contenu
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination
            className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700"
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={limit}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onNext={() =>
              setPage((current) => Math.min(current + 1, totalPages))
            }
            onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
            canGoNext={page < totalPages}
            canGoPrevious={page > 1}
          />
        </CardContent>
      </Card>

      {/* Modal Visualisation Email */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-4xl min-w-0 overflow-auto rounded-lg bg-white dark:bg-gray-800">
            <div className="min-w-0 p-4 sm:p-6">
              <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                    {selectedEmail.subject}
                  </h2>
                  <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                    De : {selectedEmail.from} → À : {selectedEmail.to}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmail(null)}
                >
                  Fermer
                </Button>
              </div>

              {selectedEmail.metadata?.mirror && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Miroir SMTP réel
                  </p>
                  <div className="mt-2 space-y-1 break-all text-gray-600 dark:text-gray-400">
                    <p>
                      Statut :{" "}
                      {selectedEmail.metadata.mirror.sent === true
                        ? "envoyé"
                        : selectedEmail.metadata.mirror.sent === false
                          ? "échec"
                          : selectedEmail.metadata.mirror.queued
                            ? "en file"
                            : "inconnu"}
                    </p>
                    {selectedEmail.metadata.mirror.messageId && (
                      <p>
                        Message ID : {selectedEmail.metadata.mirror.messageId}
                      </p>
                    )}
                    {selectedEmail.metadata.mirror.from && (
                      <p>From miroir : {selectedEmail.metadata.mirror.from}</p>
                    )}
                    {selectedEmail.metadata.mirror.replyTo && (
                      <p>Reply-To : {selectedEmail.metadata.mirror.replyTo}</p>
                    )}
                    {selectedEmail.metadata.mirror.error && (
                      <p className="text-red-600 dark:text-red-400">
                        Erreur : {selectedEmail.metadata.mirror.error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-4">
                {selectedEmail.emailContent ? (
                  <EmailHtmlPreview
                    html={selectedEmail.emailContent}
                    title={selectedEmail.subject}
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Contenu non disponible
                  </p>
                )}
                {selectedEmail.status === "FAILED" && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                    <p className="font-medium">Raison d&apos;échec</p>
                    <p className="mt-1 break-words">
                      {selectedEmail.error || "Erreur SMTP non renseignée"}
                    </p>
                    {selectedEmail.metadata?.mirror?.error && (
                      <p className="mt-2 break-words">
                        Miroir SMTP : {selectedEmail.metadata.mirror.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </EmailBackofficePageShell>
  );
}

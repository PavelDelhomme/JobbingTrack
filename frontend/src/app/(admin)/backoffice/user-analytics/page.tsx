"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import AdminLayout from "@/components/features/AdminLayout";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  BarChart3,
  MousePointer,
  AlertTriangle,
  Zap,
  Users,
  Activity,
  Smartphone,
} from "lucide-react";
import axios from "axios";
import { Pagination } from "@/components/ui/Pagination";
import { AnalyticsRecordDetailDialog } from "@/components/analytics/AnalyticsRecordDetailDialog";
import { OverviewPreview } from "@/components/analytics/OverviewPreview";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import {
  classifyEventSource,
  eventSourceLabel,
  filterEventsBySource,
  uniqueEventTypes,
  type EventSourceFilter,
} from "@/lib/analytics/eventSource";
import { formatAnalyticsPageLabel } from "@/lib/analytics/pageLabels";
import {
  analyticsUserSuggestions,
  formatAnalyticsUserLabel,
  type AnalyticsUserListItem,
} from "@/lib/analytics/userPicker";
import { fetchAnalyticsUsers } from "@/lib/analytics/fetchAnalyticsUsers";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

function formatDeviceIdLabel(deviceId?: string | null): string {
  if (!deviceId?.trim()) return "ID —";
  const id = deviceId.trim();
  if (id.length <= 13) return `ID ${id}`;
  return `ID ${id.slice(0, 8)}…`;
}

interface UserStats {
  totalSessions: number;
  activeSessions: number;
  activeSessionsList?: ActiveSession[];
  totalEvents: number;
  totalErrors: number;
  eventsByType: Array<{ type: string; count: number }>;
  errorsByType: Array<{ type: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
}

interface ActiveSession {
  sessionId: string;
  platform: string;
  deviceId?: string | null;
  deviceModel?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  browserName?: string | null;
  startTime: string;
  pageViews: number;
  actions: number;
  errors: number;
}

interface UserListItem extends AnalyticsUserListItem {}

interface UserEvent {
  id: string;
  eventType: string;
  eventName: string;
  category: string;
  page: string;
  platform?: string | null;
  deviceId?: string | null;
  timestamp: string;
  properties: any;
}

interface UserError {
  id: string;
  errorType: string;
  errorName: string;
  errorMessage: string;
  severity: string;
  page: string;
  platform?: string | null;
  deviceId?: string | null;
  appVersion?: string | null;
  timestamp: string;
  resolved: boolean;
}

interface DeviceInfo {
  id: string;
  deviceId: string;
  platform: string;
  deviceModel?: string;
  appVersion?: string;
  osName?: string;
  osVersion?: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
}

interface VersionsData {
  devices: DeviceInfo[];
  versionsByPlatform: Record<
    string,
    Array<{ appVersion: string; count: number }>
  >;
  performances: Array<{
    id?: string;
    metricType?: string;
    metricName?: string;
    value?: number;
    duration?: number;
    memoryUsage?: number;
    networkLatency?: number;
    page?: string;
    platform?: string;
    deviceId?: string;
    timestamp: string;
  }>;
}

export default function UserAnalyticsPage() {
  const { user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [errors, setErrors] = useState<UserError[]>([]);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [userPickerQuery, setUserPickerQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersOffset, setUsersOffset] = useState(0);
  const usersPageSize = 50;
  const debouncedUserSearch = useDebouncedValue(userPickerQuery, 300);
  const skipUserSearchRef = useRef(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "errors" | "performance" | "mobile"
  >("overview");
  const [versionsData, setVersionsData] = useState<VersionsData | null>(null);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
  const [eventSourceFilter, setEventSourceFilter] =
    useState<EventSourceFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const filteredEvents = useMemo(
    () => filterEventsBySource(events, eventSourceFilter, eventTypeFilter),
    [events, eventSourceFilter, eventTypeFilter],
  );
  const eventTypeOptions = useMemo(() => uniqueEventTypes(events), [events]);

  const eventsPagination = useClientPagination(filteredEvents, 15);
  const errorsPagination = useClientPagination(errors, 15);
  const perfList = versionsData?.performances ?? [];
  const perfPagination = useClientPagination(perfList, 15);

  const rangeQuery = useMemo(() => {
    if (rangeMode === "custom") {
      const s = new Date(`${customStart}T00:00:00.000Z`).toISOString();
      const e = new Date(`${customEnd}T23:59:59.999Z`).toISOString();
      return `startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
    }
    return `days=${selectedDays}`;
  }, [rangeMode, customStart, customEnd, selectedDays]);

  const rangeDescription = useMemo(() => {
    if (rangeMode === "custom") {
      return `Plage calendaire : ${customStart} → ${customEnd} (bornes UTC).`;
    }
    const labels: Record<number, string> = {
      1: "Dernière journée glissante (paramètre days=1)",
      7: "7 derniers jours",
      30: "30 derniers jours",
      90: "90 derniers jours",
    };
    return labels[selectedDays] || `Derniers ${selectedDays} jours`;
  }, [rangeMode, customStart, customEnd, selectedDays]);

  const analyticsUserId = targetUserId || user?.id || null;

  const selectedUserLabel = useMemo(() => {
    if (!analyticsUserId) return "—";
    const fromList = usersList.find((u) => u.id === analyticsUserId);
    if (fromList) {
      const name = [fromList.firstName, fromList.lastName].filter(Boolean).join(" ");
      return name || fromList.email;
    }
    if (user?.id === analyticsUserId) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.email;
    }
    return analyticsUserId;
  }, [analyticsUserId, usersList, user]);

  useEffect(() => {
    if (!user) return;
    const fromUrl = searchParams.get("userId");
    const id = fromUrl || user.id;
    setTargetUserId(id);
    skipUserSearchRef.current = true;
    if (fromUrl && fromUrl !== user.id) {
      const token = localStorage.getItem("token");
      if (token) {
        axios
          .get(`${FRONTEND_URLS.api}/api/v1/auth/users/${fromUrl}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const raw = res.data?.user ?? res.data?.data ?? res.data;
            if (raw?.id) {
              setUserPickerQuery(
                formatAnalyticsUserLabel({
                  id: raw.id,
                  email: raw.email,
                  firstName: raw.firstName ?? "",
                  lastName: raw.lastName ?? "",
                  role: raw.role ?? "USER",
                }),
              );
            }
          })
          .catch(() => setUserPickerQuery(fromUrl));
      }
    } else {
      setUserPickerQuery(
        formatAnalyticsUserLabel({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }),
      );
    }
  }, [user, searchParams]);

  const loadUsersPage = useCallback(
    async (search: string, offset: number, append: boolean) => {
      if (!isAdmin) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      setUsersLoading(true);
      try {
        const result = await fetchAnalyticsUsers({
          token,
          search,
          limit: usersPageSize,
          offset,
        });
        setUsersTotal(result.total);
        setUsersOffset(offset + result.users.length);
        setUsersList((prev) =>
          append ? [...prev, ...result.users] : result.users,
        );
      } catch {
        if (!append) setUsersList([]);
        setUsersTotal(0);
      } finally {
        setUsersLoading(false);
      }
    },
    [isAdmin, usersPageSize],
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (skipUserSearchRef.current) {
      skipUserSearchRef.current = false;
      return;
    }
    void loadUsersPage(debouncedUserSearch, 0, false);
  }, [isAdmin, debouncedUserSearch, loadUsersPage]);

  const resolveUserLabel = useCallback(
    (userId: string) => {
      const fromList = usersList.find((u) => u.id === userId);
      if (fromList) return formatAnalyticsUserLabel(fromList);
      if (user?.id === userId) {
        return formatAnalyticsUserLabel({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      }
      return userId;
    },
    [usersList, user],
  );

  const userSuggestions = useMemo(
    () => analyticsUserSuggestions(usersList),
    [usersList],
  );

  const hasMoreUsers = usersList.length < usersTotal;

  const handleTargetUserChange = (nextUserId: string) => {
    setTargetUserId(nextUserId);
    const params = new URLSearchParams(searchParams.toString());
    if (nextUserId) params.set("userId", nextUserId);
    else params.delete("userId");
    router.replace(`/backoffice/user-analytics?${params.toString()}`);
  };

  const loadData = useCallback(async () => {
    if (!user || !analyticsUserId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const apiUrl = FRONTEND_URLS.api;
      const q = rangeQuery;
      const userQ = `userId=${encodeURIComponent(analyticsUserId)}`;
      // Promise.allSettled pour ne pas faire échouer tout le chargement si une requête est bloquée (ex. uBlock sur /analytics/events)
      const results = await Promise.allSettled([
        axios.get(`${apiUrl}/api/v1/analytics/stats/${analyticsUserId}?${q}`, {
          headers,
        }),
        axios.get(`${apiUrl}/api/v1/analytics/events?limit=100&${userQ}&${q}`, {
          headers,
        }),
        axios.get(`${apiUrl}/api/v1/analytics/errors?limit=100&${userQ}&${q}`, {
          headers,
        }),
        axios
          .get(`${apiUrl}/api/v1/analytics/stats/${analyticsUserId}/versions?${q}`, {
            headers,
          })
          .catch(() => ({ data: { success: false } })),
      ]);

      const [statsRes, eventsRes, errorsRes, versionsRes] = results.map((r) =>
        r.status === "fulfilled" ? r.value : null,
      );

      if (statsRes?.data?.success) {
        setStats(statsRes.data.data);
      }
      if (eventsRes?.data?.success) {
        setEvents(eventsRes.data.data || []);
        setEventsLoadError(null);
      } else if (results[1]?.status === "rejected") {
        setEvents([]);
        setEventsLoadError(
          "Événements non disponibles (requête bloquée par une extension ou erreur réseau). Désactivez les bloqueurs de publicité sur ce site si besoin.",
        );
      } else {
        setEventsLoadError(null);
      }
      if (errorsRes?.data?.success) {
        setErrors(errorsRes.data.data || []);
      }
      if (versionsRes?.data?.success && versionsRes.data?.data) {
        setVersionsData(versionsRes.data.data);
      } else {
        setVersionsData(null);
      }
      setLastRefreshAt(new Date());
    } catch (error) {
      console.error("[ANALYTICS] Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }, [user, analyticsUserId, rangeQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!analyticsUserId) return;
    const timer = setInterval(() => {
      void loadData();
    }, 30000);
    return () => clearInterval(timer);
  }, [analyticsUserId, loadData]);

  useEffect(() => {
    eventsPagination.resetPage();
  }, [eventSourceFilter, eventTypeFilter]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📊 Analytics Utilisateur
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analyse des actions et comportements —{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {selectedUserLabel}
              </span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {rangeDescription}
              {lastRefreshAt
                ? ` · MAJ ${lastRefreshAt.toLocaleTimeString("fr-FR")} (auto 30 s)`
                : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {isAdmin && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[16rem] max-w-md flex-1">
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Utilisateur (recherche serveur — nom, email, rôle)
                  </label>
                  <AutocompleteInput
                    value={userPickerQuery}
                    onChange={setUserPickerQuery}
                    onSelect={(userId) => {
                      skipUserSearchRef.current = true;
                      handleTargetUserChange(userId);
                      setUserPickerQuery(resolveUserLabel(userId));
                    }}
                    placeholder="Rechercher un utilisateur…"
                    suggestions={userSuggestions}
                    loading={usersLoading}
                    maxSuggestions={20}
                    className="w-full"
                  />
                  {hasMoreUsers && !usersLoading && (
                    <button
                      type="button"
                      onClick={() =>
                        void loadUsersPage(debouncedUserSearch, usersOffset, true)
                      }
                      className="mt-1 text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
                    >
                      Charger plus ({usersList.length}/{usersTotal})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  Rafraîchir
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Mode
              </label>
              <select
                value={rangeMode}
                onChange={(e) =>
                  setRangeMode(e.target.value as "preset" | "custom")
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="preset">Périodes rapides</option>
                <option value="custom">Plage personnalisée</option>
              </select>
              {rangeMode === "preset" ? (
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value={1}>1 jour (glissant)</option>
                  <option value={7}>7 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={90}>90 jours</option>
                </select>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    Du
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    au
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          <nav className="flex min-w-max space-x-6 sm:space-x-8">
            {[
              { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
              { id: "events", label: "Événements", icon: MousePointer },
              { id: "errors", label: "Erreurs", icon: AlertTriangle },
              { id: "performance", label: "Performance", icon: Zap },
              {
                id: "mobile",
                label: "Versions & App mobile",
                icon: Smartphone,
              },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex shrink-0 items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Chargement des données...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && stats && (
              <div className="space-y-6">
                {/* Cartes de synthèse */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Users}
                    title="Sessions"
                    value={stats.totalSessions}
                    subtitle={`${stats.activeSessions} actives`}
                    color="blue"
                  />
                  <StatCard
                    icon={MousePointer}
                    title="Événements"
                    value={stats.totalEvents}
                    subtitle="Actions utilisateur"
                    color="green"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    title="Erreurs"
                    value={stats.totalErrors}
                    subtitle="Problèmes détectés"
                    color="red"
                  />
                  <StatCard
                    icon={Activity}
                    title="Taux d'erreur"
                    value={
                      stats.totalEvents > 0
                        ? (
                            (stats.totalErrors / stats.totalEvents) *
                            100
                          ).toFixed(2) + "%"
                        : "0%"
                    }
                    subtitle="Erreurs / Événements"
                    color="yellow"
                  />
                </div>

                {/* Sessions actives (temps réel — refresh 30 s) */}
                {(stats.activeSessionsList?.length ?? 0) > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-500" />
                      Sessions actives ({stats.activeSessions})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="pb-2 pr-4">Plateforme</th>
                            <th className="pb-2 pr-4">Appareil / OS</th>
                            <th className="pb-2 pr-4">Démarrée</th>
                            <th className="pb-2 pr-4">Pages</th>
                            <th className="pb-2 pr-4">Actions</th>
                            <th className="pb-2">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {stats.activeSessionsList!.map((s) => (
                            <tr key={s.sessionId}>
                              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                                {s.platform}
                              </td>
                              <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                                {s.deviceModel ||
                                  (s.deviceId
                                    ? formatDeviceIdLabel(s.deviceId)
                                    : "—")}
                                {s.osName ? (
                                  <span className="block text-xs text-gray-400">
                                    {s.osName} {s.osVersion ?? ""}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                                {new Date(s.startTime).toLocaleString("fr-FR")}
                              </td>
                              <td className="py-2 pr-4">{s.pageViews}</td>
                              <td className="py-2 pr-4">{s.actions}</td>
                              <td className="py-2">{s.errors}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Événements par type */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Événements par type
                    </h3>
                    <div className="space-y-3">
                      {stats.eventsByType.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.type}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${stats.totalEvents > 0 ? (item.count / stats.totalEvents) * 100 : 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium w-12 text-right">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pages les plus visitées */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Pages les plus visitées
                    </h3>
                    <div className="space-y-3">
                      {(stats.topPages ?? []).slice(0, 10).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-600 dark:text-gray-400 truncate flex-1" title={item.page || ""}>
                            {formatAnalyticsPageLabel(item.page)}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium ml-4">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions les plus fréquentes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Actions les plus fréquentes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(stats.topActions ?? []).slice(0, 10).map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.action}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.count} fois
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aperçus onglets détaillés */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <OverviewPreview
                    title="Derniers événements"
                    empty="Aucun événement — vérifiez la télémétrie mobile (connecté + consentement)."
                    onViewAll={() => setActiveTab("events")}
                    rows={events.slice(0, 5).map((e) => ({
                      id: e.id,
                      primary: `${e.eventType} · ${e.eventName}`,
                      secondary: e.page || "—",
                      meta: new Date(e.timestamp).toLocaleString("fr-FR"),
                    }))}
                  />
                  <OverviewPreview
                    title="Dernières erreurs"
                    empty="Aucune erreur enregistrée sur la période."
                    onViewAll={() => setActiveTab("errors")}
                    rows={errors.slice(0, 5).map((e) => ({
                      id: e.id,
                      primary: e.errorType,
                      secondary: e.errorMessage,
                      meta: e.severity,
                    }))}
                  />
                  <OverviewPreview
                    title="Échantillons performance"
                    empty="Aucune métrique — l'app mobile envoie des snapshots toutes les 5 min si consentement actif."
                    onViewAll={() => setActiveTab("performance")}
                    rows={(versionsData?.performances ?? []).slice(0, 5).map((p, i) => ({
                      id: String(i),
                      primary: `${p.metricType ?? "—"} · ${p.metricName ?? "—"}`,
                      secondary: p.value != null ? String(p.value) : "—",
                      meta: new Date(p.timestamp).toLocaleString("fr-FR"),
                    }))}
                  />
                  <OverviewPreview
                    title="Appareils enregistrés"
                    empty="Aucun appareil — enregistrement au login mobile avec télémétrie active."
                    onViewAll={() => setActiveTab("mobile")}
                    rows={(versionsData?.devices ?? []).slice(0, 5).map((d) => ({
                      id: d.id,
                      primary: `${d.platform} · ${d.osVersion ?? d.osName ?? "?"}`,
                      secondary: `${d.deviceModel ?? "—"} · ${formatDeviceIdLabel(d.deviceId)}`,
                      meta: new Date(d.lastSeen).toLocaleString("fr-FR"),
                    }))}
                  />
                </div>
              </div>
            )}

            {activeTab === "events" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Événements
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Filtrez par source (backoffice, app mobile, appels API) et par type.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={eventSourceFilter}
                      onChange={(e) =>
                        setEventSourceFilter(e.target.value as EventSourceFilter)
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="all">Toutes sources</option>
                      <option value="mobile">App mobile</option>
                      <option value="backoffice">Backoffice / web</option>
                      <option value="api">API / réseau</option>
                    </select>
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="all">Tous types</option>
                      {eventTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {eventsLoadError && (
                  <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
                    {eventsLoadError}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Page / plateforme
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {eventsPagination.slice.map((event) => (
                        <tr
                          key={event.id}
                          className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                          onClick={() => {
                            setDetailTitle(`Événement · ${event.eventName}`);
                            setDetailRecord(event as unknown as Record<string, unknown>);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {eventSourceLabel(classifyEventSource(event))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {event.eventType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {event.eventName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            <span>{event.page || "—"}</span>
                            {event.platform ? (
                              <span className="ml-1 text-xs text-gray-400">
                                ({event.platform})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={eventsPagination.page}
                  totalPages={eventsPagination.totalPages}
                  totalItems={eventsPagination.totalItems}
                  itemsPerPage={eventsPagination.pageSize}
                  startIndex={eventsPagination.startIndex}
                  endIndex={eventsPagination.endIndex}
                  onPageChange={eventsPagination.goToPage}
                  onNext={eventsPagination.goNext}
                  onPrevious={eventsPagination.goPrevious}
                  canGoNext={eventsPagination.canGoNext}
                  canGoPrevious={eventsPagination.canGoPrevious}
                />
              </div>
            )}

            {activeTab === "errors" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Erreurs récentes
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Sévérité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Appareil
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {errorsPagination.slice.map((error) => (
                        <tr
                          key={error.id}
                          className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                          onClick={() => {
                            setDetailTitle(`Erreur · ${error.errorType}`);
                            setDetailRecord(error as unknown as Record<string, unknown>);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {error.errorType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate">
                            {error.errorMessage}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                error.severity === "critical"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : error.severity === "warning"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {error.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            <span>{error.platform || "—"}</span>
                            {error.deviceId ? (
                              <span
                                className="block text-xs text-gray-400 truncate max-w-[140px]"
                                title={error.deviceId}
                              >
                                {formatDeviceIdLabel(error.deviceId)}
                              </span>
                            ) : null}
                            {error.appVersion ? (
                              <span className="block text-xs text-gray-400">
                                v{error.appVersion}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {error.page || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(error.timestamp).toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={errorsPagination.page}
                  totalPages={errorsPagination.totalPages}
                  totalItems={errorsPagination.totalItems}
                  itemsPerPage={errorsPagination.pageSize}
                  startIndex={errorsPagination.startIndex}
                  endIndex={errorsPagination.endIndex}
                  onPageChange={errorsPagination.goToPage}
                  onNext={errorsPagination.goNext}
                  onPrevious={errorsPagination.goPrevious}
                  canGoNext={errorsPagination.canGoNext}
                  canGoPrevious={errorsPagination.canGoPrevious}
                />
              </div>
            )}

            {activeTab === "performance" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Métriques de performance (période sélectionnée)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Données issues de{" "}
                    <code className="text-xs">/analytics/stats/…/versions</code>{" "}
                    (même fenêtre que l’onglet Versions). Les détails par
                    appareil restent dans l’onglet « Versions & App mobile ».
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Cliquez sur une ligne pour le détail (mémoire, durée, session, appareil…).
                  </p>
                  {versionsData?.performances?.length ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Métrique
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Valeur
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {perfPagination.slice.map((p, i) => (
                              <tr
                                key={`${p.timestamp}-${i}`}
                                className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                                onClick={() => {
                                  setDetailTitle(
                                    `Performance · ${p.metricName ?? p.metricType ?? "échantillon"}`,
                                  );
                                  setDetailRecord(p as unknown as Record<string, unknown>);
                                }}
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {p.metricType || "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {p.metricName || "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {p.value != null ? p.value : "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(p.timestamp).toLocaleString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Pagination
                        className="mt-4"
                        currentPage={perfPagination.page}
                        totalPages={perfPagination.totalPages}
                        totalItems={perfPagination.totalItems}
                        itemsPerPage={perfPagination.pageSize}
                        startIndex={perfPagination.startIndex}
                        endIndex={perfPagination.endIndex}
                        onPageChange={perfPagination.goToPage}
                        onNext={perfPagination.goNext}
                        onPrevious={perfPagination.goPrevious}
                        canGoNext={perfPagination.canGoNext}
                        canGoPrevious={perfPagination.canGoPrevious}
                      />
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune métrique sur cette période. Connectez-vous sur l&apos;app
                      mobile avec télémétrie active — snapshots envoyés toutes les 5 min.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "mobile" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Appareils enregistrés
                  </h3>
                  {versionsData?.devices?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              ID appareil
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Plateforme
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Modèle
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Version OS
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Version app
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Sessions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Dernière activité
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {versionsData.devices.map((d) => (
                            <tr key={d.id}>
                              <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                                <span title={d.deviceId}>
                                  {formatDeviceIdLabel(d.deviceId)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {d.platform}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {d.deviceModel || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {d.osVersion || d.osName || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {d.appVersion || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {d.totalSessions}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {new Date(d.lastSeen).toLocaleString("fr-FR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucun appareil enregistré. Les appareils sont enregistrés
                      lorsque vous utilisez l’app mobile (ou le web avec envoi
                      de device).
                    </p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Versions utilisées par plateforme
                  </h3>
                  {versionsData?.versionsByPlatform &&
                  Object.keys(versionsData.versionsByPlatform).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(versionsData.versionsByPlatform).map(
                        ([platform, versions]) => (
                          <div key={platform}>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {platform}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {versions.map((v, i) => (
                                <li
                                  key={i}
                                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                                >
                                  {v.appVersion}{" "}
                                  <span className="text-gray-500 dark:text-gray-400">
                                    ({v.count} événements)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune version enregistrée. La version est envoyée avec
                      les événements (app mobile ou web).
                    </p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Métriques performance (app / web)
                  </h3>
                  {versionsData?.performances?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Métrique
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Valeur
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {versionsData.performances.map(
                            (p: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {p.metricType || "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {p.metricName || "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {p.value != null ? p.value : "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(p.timestamp).toLocaleString(
                                    "fr-FR",
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune métrique de performance enregistrée.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnalyticsRecordDetailDialog
        open={detailRecord != null}
        title={detailTitle}
        record={detailRecord}
        onClose={() => {
          setDetailRecord(null);
          setDetailTitle("");
        }}
      />
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, color }: any) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
    yellow:
      "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {subtitle}
          </p>
        </div>
        <div
          className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

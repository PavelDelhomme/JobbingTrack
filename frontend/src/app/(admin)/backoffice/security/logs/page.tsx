"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AdminLayout } from "@/components/features";
import { Pagination } from "@/components/ui/Pagination";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { formatLocalDateTime } from "@/lib/utils/date";
import axios from "axios";

interface SecurityLog {
  id: string;
  level: "info" | "warning" | "error" | "critical";
  category: string;
  message: string;
  sourceIP?: string;
  userAgent?: string;
  endpoint?: string;
  timestamp: string;
  riskScore?: number;
}

const API_URL = FRONTEND_URLS.api;
const LOGS_PAGE_SIZE = 25;
const DEFAULT_LOG_WINDOW_DAYS = 30;

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { page, setPage } = useUrlPagination("page", 1);

  const defaultStartIso = useMemo(
    () =>
      new Date(
        Date.now() - DEFAULT_LOG_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    [],
  );

  const fetchLogs = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const silent = options.silent === true;
      try {
        if (!silent) setLoading(true);
        setServiceError(null);
        const token = localStorage.getItem("token");

        const response = await axios.get(`${API_URL}/api/v1/security/logs`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: LOGS_PAGE_SIZE,
            offset: (page - 1) * LOGS_PAGE_SIZE,
            level: filterLevel !== "all" ? filterLevel : undefined,
            category: filterCategory !== "all" ? filterCategory : undefined,
            startDate: dateFrom || defaultStartIso,
            endDate: dateTo || undefined,
          },
          timeout: 8000,
        });

        if (response.data.success) {
          const logsData = response.data.data || response.data.logs || [];
          const logsArray = Array.isArray(logsData) ? logsData : [];
          const normalizedLogs = logsArray.map((log: any) => ({
            ...log,
            level: String(log.level || "info").toLowerCase(),
            category: String(log.category || "unknown").toLowerCase(),
          }));
          setLogs(normalizedLogs);
          setTotalLogs(
            typeof response.data.pagination?.total === "number"
              ? response.data.pagination.total
              : normalizedLogs.length,
          );
        } else {
          setLogs([]);
          setTotalLogs(0);
          setServiceError(
            `Le service logs sécurité a répondu avec un statut inattendu (HTTP ${response.status}).`,
          );
        }
      } catch (error: any) {
        console.error("Error loading security logs:", error);
        setLogs([]);
        setTotalLogs(0);
        setServiceError(
          error?.response?.data?.error ||
            error?.message ||
            "Service logs sécurité indisponible",
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, filterLevel, filterCategory, dateFrom, dateTo, defaultStartIso],
  );

  const createTestLog = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/v1/security/logs`,
        {
          level: "warning",
          category: "security",
          eventType: "manual_test_event",
          message: "Log de sécurité de test généré depuis le backoffice",
          sourceIP: "127.0.0.1",
          endpoint: "/b4ck0ff1ce/security/logs",
          method: "POST",
          riskScore: 35,
          metadata: { manual: true },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchLogs();
    } catch (e) {
      console.error("Erreur création log test:", e);
    }
  }, [fetchLogs]);

  const toggleContinuousGeneration = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (isGenerating) {
        await axios.delete(`${API_URL}/api/v1/security/generate-continuous`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(
          `${API_URL}/api/v1/security/generate-continuous`,
          { intervalMinutes: 5 },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
      const statusRes = await axios.get(
        `${API_URL}/api/v1/security/generate-continuous/status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setIsGenerating(!!statusRes.data?.data?.isGenerating);
      fetchLogs();
    } catch (e) {
      console.error("Erreur toggle génération continue:", e);
    }
  }, [isGenerating, fetchLogs]);

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(() => fetchLogs({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [filterLevel, filterCategory, dateFrom, dateTo, searchQuery, setPage])

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API_URL}/api/v1/security/generate-continuous/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setIsGenerating(!!res.data?.data?.isGenerating))
      .catch(() => setIsGenerating(false));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterLevel !== "all" && log.level !== filterLevel) return false;
      if (filterCategory !== "all" && log.category !== filterCategory)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack =
          `${log.message} ${log.sourceIP || ""} ${log.endpoint || ""} ${log.userAgent || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterLevel, filterCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PAGE_SIZE));
  const paginatedLogs = filteredLogs;

  const levelColors = {
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    warning:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    error:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              📋 Security Logs
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Monitor security events in real time (auto-refresh every 15
              seconds)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createTestLog}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer log test
            </button>
            <button
              onClick={toggleContinuousGeneration}
              className={`px-3 py-2 text-white rounded-lg ${isGenerating ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {isGenerating
                ? "Arrêter génération continue"
                : "Démarrer génération continue"}
            </button>
          </div>
        </div>

        {serviceError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {serviceError}
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters:
            </span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="all">All levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher: message, IP, endpoint, user-agent..."
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 min-w-80"
            />
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            />
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => {
                setFilterLevel("all");
                setFilterCategory("all");
                setDateFrom("");
                setDateTo("");
                setSearchQuery("");
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-200 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100"
            >
              Reset
            </button>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="all">All categories</option>
              <option value="intrusion">Intrusion</option>
              <option value="injection">Injection</option>
              <option value="ddos">DDoS</option>
              <option value="authentication">Authentication</option>
            </select>
          </div>
        </div>

        {/* Liste des logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Source IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${levelColors[log.level]}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {log.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.sourceIP || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatLocalDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalLogs > 0 && (
            <Pagination
              className="p-4 border-t border-gray-200 dark:border-gray-700"
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalLogs}
              itemsPerPage={LOGS_PAGE_SIZE}
              startIndex={(page - 1) * LOGS_PAGE_SIZE + 1}
              endIndex={Math.min(page * LOGS_PAGE_SIZE, totalLogs)}
              onPageChange={setPage}
              onNext={() => setPage(page + 1)}
              onPrevious={() => setPage(page - 1)}
              canGoNext={page < totalPages}
              canGoPrevious={page > 1}
            />
          )}

          {filteredLogs.length === 0 && !serviceError && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucun log de sécurité trouvé. Utilise "Créer log test" ou active
              la génération continue.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

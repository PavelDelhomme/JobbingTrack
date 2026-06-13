import axios, { isAxiosError } from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  buildMetricsAggregatorUrl,
  getMetricsAggregatorClientBase,
} from "@/lib/metrics/metricsAggregatorClient";
import { normalizeMetricTimestampToIso } from "@/lib/utils/date";

/** @deprecated Préférer buildMetricsAggregatorUrl — conservé pour tests existants. */
export function getMetricsV1Base(): string {
  return getMetricsAggregatorClientBase();
}

/** Historiques longs (ex. 30 j.) : évite les timeouts axios par défaut. */
const METRICS_HISTORY_AXIOS_TIMEOUT_MS = 120_000;

/** Reload React / navigation / Strict Mode : requêtes axios annulées — ne pas spammer la console. */
function isBenignAxiosInterrupt(error: unknown): boolean {
  if (error == null) return false;
  if (isAxiosError(error)) {
    if (error.code === "ERR_CANCELED" || error.code === "ECONNABORTED")
      return true;
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("aborted") || msg.includes("cancel")) return true;
  }
  if (typeof error !== "object") return false;
  const e = error as { code?: string; name?: string; message?: string };
  if (e.code === "ERR_CANCELED" || e.code === "ECONNABORTED") return true;
  if (e.name === "CanceledError" || e.name === "AbortError") return true;
  const m = String(e.message || "").toLowerCase();
  return m.includes("aborted") || m.includes("canceled");
}

function logAxiosError(context: string, error: unknown): void {
  if (isBenignAxiosInterrupt(error)) return;
  console.error(context, error);
}

function logOptionalMetricsWarning(context: string, error: unknown): void {
  if (isBenignAxiosInterrupt(error)) return;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "indisponible";
  console.warn(`${context} ${message}`);
}

/**
 * Aligne chaque ligne sur un instant unique : d’abord **timestamp** normalisé (ISO UTC),
 * puis **`timestampMs` = Date.parse(ts)`** quand c’est possible. Évite un décalage d’environ
 * **2 h** si l’API renvoyait un **`timestampMs`** incohérent avec la chaîne **`timestamp`**
 * (sérialisation JSON, anciennes versions agrégateur, ou doublon fuseau).
 */
export function normalizeMetricRows(
  rows: unknown[],
): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const raw = r.timestamp ?? r.createdAt;
    const ts = normalizeMetricTimestampToIso(raw);
    const out: Record<string, unknown> = { ...r, timestamp: ts || raw };
    if (ts && Number.isFinite(Date.parse(ts))) {
      out.timestampMs = Date.parse(ts);
    } else {
      const ms = r.timestampMs;
      if (typeof ms === "number" && Number.isFinite(ms)) {
        out.timestampMs = ms;
      } else if (typeof ms === "string" && /^\d{10,13}$/.test(ms.trim())) {
        const t = ms.trim();
        const n = Number(t);
        out.timestampMs = t.length <= 10 ? n * 1000 : n;
      }
    }
    return out;
  });
}
const API_GATEWAY_URL = FRONTEND_URLS.api;

function persistenceContainerSegment(containerName: string): string {
  return encodeURIComponent(
    String(containerName || "")
      .replace(/^\//, "")
      .trim(),
  );
}

export class AnalyticsService {
  /**
   * Récupérer les métriques système historiques
   */
  async getSystemMetricsHistory(
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      signal?: AbortSignal;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);

      const response = await axios.get(
        `${buildMetricsAggregatorUrl("persistence/system/metrics")}?${params.toString()}`,
        { timeout: METRICS_HISTORY_AXIOS_TIMEOUT_MS, signal: options.signal },
      );

      return normalizeMetricRows(response.data.data || []);
    } catch (error) {
      logAxiosError("Erreur récupération historique système:", error);
      return [];
    }
  }

  /**
   * Récupérer les métriques d'un conteneur spécifique
   */
  async getContainerMetricsHistory(
    containerName: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      signal?: AbortSignal;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);

      const response = await axios.get(
        `${buildMetricsAggregatorUrl(`persistence/containers/${persistenceContainerSegment(containerName)}/metrics`)}?${params.toString()}`,
        { timeout: METRICS_HISTORY_AXIOS_TIMEOUT_MS, signal: options.signal },
      );

      return normalizeMetricRows(response.data.data || []);
    } catch (error) {
      logOptionalMetricsWarning(
        `Historique conteneur ${containerName} indisponible:`,
        error,
      );
      return [];
    }
  }

  /**
   * Récupérer les logs d'un conteneur
   */
  async getContainerLogs(
    containerName: string,
    options: {
      limit?: number;
      offset?: number;
      stream?: "stdout" | "stderr";
      level?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.stream) params.append("stream", options.stream);
      if (options.level) params.append("level", options.level);
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
      if (options.search) params.append("search", options.search);

      const response = await axios.get(
        `${buildMetricsAggregatorUrl(`persistence/containers/${persistenceContainerSegment(containerName)}/logs`)}?${params.toString()}`,
      );

      return response.data.data || [];
    } catch (error) {
      logAxiosError(`Erreur récupération logs ${containerName}:`, error);
      return [];
    }
  }

  /**
   * Récupérer les logs en temps réel depuis Docker
   */
  async getContainerLogsLive(
    containerName: string,
    options: {
      tail?: number;
      since?: number | string;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      if (options.tail) params.append("tail", options.tail.toString());
      if (options.since) params.append("since", options.since.toString());

      const response = await axios.get(
        `${buildMetricsAggregatorUrl(`persistence/containers/${persistenceContainerSegment(containerName)}/logs/live`)}?${params.toString()}`,
      );

      return response.data.data || [];
    } catch (error) {
      logAxiosError(`Erreur récupération logs live ${containerName}:`, error);
      return [];
    }
  }

  /**
   * Récupérer les statistiques de disponibilité d'un service
   */
  async getServiceAvailabilityStats(
    serviceName: string,
    hours: number = 24,
    signal?: AbortSignal,
  ) {
    try {
      const response = await axios.get(
        `${buildMetricsAggregatorUrl(`persistence/services/${persistenceContainerSegment(serviceName)}/availability`)}?hours=${hours}`,
        { signal },
      );

      return response.data.data || null;
    } catch (error) {
      logOptionalMetricsWarning(
        `Disponibilité ${serviceName} indisponible:`,
        error,
      );
      return null;
    }
  }

  /**
   * Historique health / temps de réponse (ms) par service — `service_availability_history`.
   * Même clé que le conteneur (`jobbingtrack-…`) côté persistance agrégateur.
   */
  async getServiceAvailabilityHistory(
    serviceName: string,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      signal?: AbortSignal;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      params.append("history", "1");
      if (options.limit != null) params.append("limit", String(options.limit));
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
      const normalized = String(serviceName || "")
        .replace(/^\//, "")
        .trim();
      const aliases = Array.from(
        new Set(
          [
            normalized,
            normalized.replace(/^jobbingtrack-/, ""),
            normalized.startsWith("jobbingtrack-")
              ? null
              : `jobbingtrack-${normalized}`,
          ].filter((x): x is string => Boolean(x)),
        ),
      );

      for (const candidate of aliases) {
        const response = await axios.get(
          `${buildMetricsAggregatorUrl(`persistence/services/${persistenceContainerSegment(candidate)}/availability`)}?${params.toString()}`,
          {
            timeout: METRICS_HISTORY_AXIOS_TIMEOUT_MS,
            validateStatus: (s) => s < 500,
            signal: options.signal,
          },
        );
        if (response.status !== 200) {
          continue;
        }
        const raw = response.data?.data;
        if (!Array.isArray(raw)) {
          continue;
        }
        if (raw.length > 0) {
          return normalizeMetricRows(raw);
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Récupérer les métriques de sécurité
   */
  async getSecurityMetrics(hours: number = 24) {
    try {
      const response = await axios.get(
        `${buildMetricsAggregatorUrl("persistence/security/metrics")}?hours=${hours}`,
      );

      return response.data.data || [];
    } catch (error) {
      logAxiosError("Erreur récupération métriques sécurité:", error);
      return [];
    }
  }

  /**
   * Résumé agrégé des métriques de sécurité persistées (BDD agrégateur — pas la gateway).
   */
  async getSecurityPersistenceSummary(
    hours: number = 24,
    signal?: AbortSignal,
  ) {
    try {
      const response = await axios.get(
        `${buildMetricsAggregatorUrl("persistence/security/summary")}?hours=${hours}`,
        { signal },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      logAxiosError(
        "Erreur récupération résumé sécurité (persistance):",
        error,
      );
      return null;
    }
  }

  /**
   * Récupérer le résumé des métriques de sécurité
   */
  async getSecuritySummary(hours: number = 24) {
    try {
      const token =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("token")
          : null;
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/v1/security/stats?days=${Math.ceil(hours / 24)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      if (response.data.success) {
        return response.data.data || null;
      }
      return null;
    } catch (error) {
      logAxiosError("Erreur récupération résumé sécurité:", error);
      return null;
    }
  }

  /**
   * Inspecter un conteneur
   */
  async inspectContainer(containerName: string) {
    try {
      const response = await axios.get(
        buildMetricsAggregatorUrl(
          `persistence/containers/${persistenceContainerSegment(containerName)}/inspect`,
        ),
      );

      return response.data.data || null;
    } catch (error) {
      logAxiosError(`Erreur inspection ${containerName}:`, error);
      return null;
    }
  }

  /**
   * Récupérer les stats en temps réel d'un conteneur
   */
  async getContainerStats(
    containerName: string,
    signal?: AbortSignal,
    options?: { timeoutMs?: number },
  ) {
    try {
      const timeout = options?.timeoutMs ?? 12_000;
      const response = await axios.get(
        buildMetricsAggregatorUrl(
          `persistence/containers/${persistenceContainerSegment(containerName)}/stats`,
        ),
        { timeout, signal, validateStatus: (s) => s < 500 },
      );
      if (response.status !== 200) return null;

      return response.data.data || null;
    } catch (error) {
      logOptionalMetricsWarning(
        `Stats live conteneur ${containerName} indisponibles:`,
        error,
      );
      return null;
    }
  }

  /**
   * Récupérer la liste des conteneurs (depuis metrics-aggregator docker/services/all)
   */
  async getContainersList(options?: {
    timeoutMs?: number;
    signal?: AbortSignal;
  }): Promise<
    {
      name: string;
      service_type?: string;
      health_status?: string;
      [key: string]: unknown;
    }[]
  > {
    try {
      const timeout = options?.timeoutMs ?? 15000;
      const response = await axios.get(
        buildMetricsAggregatorUrl("docker/services/all"),
        { timeout, signal: options?.signal },
      );
      if (response.data?.services && Array.isArray(response.data.services)) {
        return response.data.services.map(
          (s: { name: string; health_status?: string; [key: string]: unknown }) => {
            const name = String(s.name || "")
              .replace(/^\//, "")
              .trim();
            const metrics =
              s.metrics && typeof s.metrics === "object"
                ? (s.metrics as Record<string, unknown>)
                : {};
            return {
              ...s,
              name,
              health_status: s.health_status,
              service_type: name.replace(/^jobbingtrack-/, ""),
              cpu_percent: s.cpu_percent ?? metrics.cpu_percent,
              memory_percent: s.memory_percent ?? metrics.memory_percent,
              memory_usage_mb: s.memory_usage_mb ?? metrics.memory_usage_mb,
              memory_limit_mb: s.memory_limit_mb ?? metrics.memory_limit_mb,
              pids: s.pids ?? metrics.pids,
            };
          },
        );
      }
      return [];
    } catch (error) {
      logOptionalMetricsWarning(
        "Liste conteneurs metrics indisponible:",
        error,
      );
      throw error;
    }
  }

  /**
   * Récupérer les statistiques globales sur les données persistées
   */
  async getPersistenceStats() {
    try {
      const response = await axios.get(
        buildMetricsAggregatorUrl("persistence/stats"),
      );

      return response.data.data || null;
    } catch (error) {
      logAxiosError("Erreur stats persistance:", error);
      return null;
    }
  }

  /**
   * Logs agrégés persistés (metrics-aggregator).
   */
  async getPersistenceLogs(
    options: {
      limit?: number;
      offset?: number;
      serviceName?: string;
      /** Plusieurs alias (ex. `jobbingtrack-foo-service` vs `foo-service` côté central logger). */
      serviceNames?: string[];
      level?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      signal?: AbortSignal;
    } = {},
  ) {
    try {
      const params = new URLSearchParams();
      if (options.limit != null) params.append("limit", String(options.limit));
      if (options.offset != null)
        params.append("offset", String(options.offset));
      if (options.serviceName)
        params.append("serviceName", options.serviceName);
      if (options.serviceNames != null && options.serviceNames.length > 0) {
        params.append(
          "serviceNames",
          options.serviceNames.filter(Boolean).join(","),
        );
      }
      if (options.level) params.append("level", options.level);
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
      if (options.search) params.append("search", options.search);

      const response = await axios.get(
        `${buildMetricsAggregatorUrl("persistence/logs")}?${params.toString()}`,
        { timeout: METRICS_HISTORY_AXIOS_TIMEOUT_MS, signal: options.signal },
      );
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      logAxiosError("Erreur récupération logs persistance:", error);
      return [];
    }
  }

  /**
   * Calculer le temps de réponse moyen depuis l'historique
   */
  async getAverageResponseTime(hours: number = 24) {
    try {
      // Récupérer l'historique système récent
      const startDate = new Date(
        Date.now() - hours * 60 * 60 * 1000,
      ).toISOString();
      const history = await this.getSystemMetricsHistory({
        startDate,
        limit: 1000,
      });

      if (history.length === 0) {
        return null;
      }

      // Persistance : voir `responseTimeAvg` / `avg_response_time_ms` sur **`getSystemMetricsHistory`** et
      // **`pickSystemResponseTimeAvgMsFromRow`** côté frontend. Ici : fallback CPU / mémoire uniquement.
      return {
        avgCpu:
          history.reduce((acc: number, h: any) => acc + h.cpuUsagePercent, 0) /
          history.length,
        avgMemory:
          history.reduce(
            (acc: number, h: any) => acc + h.memoryUsagePercent,
            0,
          ) / history.length,
        dataPoints: history.length,
      };
    } catch (error) {
      logAxiosError("Erreur calcul temps de réponse moyen:", error);
      return null;
    }
  }

  /**
   * Calculer le taux d'erreurs réseau
   */
  async getNetworkErrorRate(hours: number = 24) {
    try {
      // TODO: Implémenter avec les vraies données réseau
      // Pour le moment, retourner une estimation basée sur la disponibilité
      return {
        errorRate: 0,
        totalRequests: 0,
        failedRequests: 0,
      };
    } catch (error) {
      logAxiosError("Erreur calcul taux erreurs réseau:", error);
      return null;
    }
  }
}

export const analyticsService = new AnalyticsService();

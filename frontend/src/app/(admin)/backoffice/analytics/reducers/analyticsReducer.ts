import { metricTimestampToMs } from "@/lib/utils/date";

/**
 * Reducer pour consolider les états de la page Analytics
 * Réduit de 15 useState à un seul useReducer
 */

export interface AnalyticsState {
  metrics: any | null;
  loading: boolean;
  metricsHistory: any[];
  loadingHistory: boolean;
  refreshing: boolean;
  lastHistoryTimestamp: number | null;
  initialHistoryLoaded: boolean;
  activeTab:
    | "overview"
    | "system"
    | "performance"
    | "network"
    | "services"
    | "logs";
  selectedService: any | null;
  serviceLogs: Array<{ timestamp: string; level: string; message: string }>;
  loadingLogs: boolean;
  logsError: string | null;
  aggregatedLogs: any[];
  loadingAggregatedLogs: boolean;
  timeRange: "1h" | "6h" | "24h" | "7d" | "30d";
  initialLoadDone: boolean;
  analyticsRefreshInterval: number;
  metricsRefreshInterval: number;
}

export type AnalyticsAction =
  | { type: "SET_METRICS"; payload: any }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_METRICS_HISTORY"; payload: any[] }
  | { type: "APPEND_METRICS_HISTORY"; payload: any[] }
  | { type: "SET_LOADING_HISTORY"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_LAST_HISTORY_TIMESTAMP"; payload: number | null }
  | { type: "SET_INITIAL_HISTORY_LOADED"; payload: boolean }
  | { type: "SET_ACTIVE_TAB"; payload: AnalyticsState["activeTab"] }
  | { type: "SET_SELECTED_SERVICE"; payload: any | null }
  | {
      type: "SET_SERVICE_LOGS";
      payload: Array<{ timestamp: string; level: string; message: string }>;
    }
  | { type: "SET_LOADING_LOGS"; payload: boolean }
  | { type: "SET_LOGS_ERROR"; payload: string | null }
  | { type: "SET_AGGREGATED_LOGS"; payload: any[] }
  | { type: "SET_LOADING_AGGREGATED_LOGS"; payload: boolean }
  | { type: "SET_TIME_RANGE"; payload: AnalyticsState["timeRange"] }
  | { type: "SET_INITIAL_LOAD_DONE"; payload: boolean }
  | { type: "SET_ANALYTICS_REFRESH_INTERVAL"; payload: number }
  | { type: "SET_METRICS_REFRESH_INTERVAL"; payload: number };

const initialState: AnalyticsState = {
  metrics: null,
  loading: true,
  metricsHistory: [],
  loadingHistory: false,
  refreshing: false,
  lastHistoryTimestamp: null,
  initialHistoryLoaded: false,
  activeTab: "overview",
  selectedService: null,
  serviceLogs: [],
  loadingLogs: false,
  logsError: null,
  aggregatedLogs: [],
  loadingAggregatedLogs: false,
  timeRange: "24h",
  initialLoadDone: false,
  analyticsRefreshInterval: 10000,
  metricsRefreshInterval: 15000,
};

export function analyticsReducer(
  state: AnalyticsState,
  action: AnalyticsAction,
): AnalyticsState {
  switch (action.type) {
    case "SET_METRICS":
      return { ...state, metrics: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_METRICS_HISTORY":
      return { ...state, metricsHistory: action.payload };
    case "APPEND_METRICS_HISTORY":
      // ✅ OPTIMISATION : Limiter à 500 points lors de l'ajout
      const merged = [...state.metricsHistory, ...action.payload];
      const sorted = merged.sort(
        (a, b) =>
          (metricTimestampToMs(a.timestamp) ?? 0) -
          (metricTimestampToMs(b.timestamp) ?? 0),
      );
      const limited = sorted.slice(-500);
      return { ...state, metricsHistory: limited };
    case "SET_LOADING_HISTORY":
      return { ...state, loadingHistory: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_LAST_HISTORY_TIMESTAMP":
      return { ...state, lastHistoryTimestamp: action.payload };
    case "SET_INITIAL_HISTORY_LOADED":
      return { ...state, initialHistoryLoaded: action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_SELECTED_SERVICE":
      return { ...state, selectedService: action.payload };
    case "SET_SERVICE_LOGS":
      return { ...state, serviceLogs: action.payload };
    case "SET_LOADING_LOGS":
      return { ...state, loadingLogs: action.payload };
    case "SET_LOGS_ERROR":
      return { ...state, logsError: action.payload };
    case "SET_AGGREGATED_LOGS":
      return { ...state, aggregatedLogs: action.payload };
    case "SET_LOADING_AGGREGATED_LOGS":
      return { ...state, loadingAggregatedLogs: action.payload };
    case "SET_TIME_RANGE":
      return { ...state, timeRange: action.payload };
    case "SET_INITIAL_LOAD_DONE":
      return { ...state, initialLoadDone: action.payload };
    case "SET_ANALYTICS_REFRESH_INTERVAL":
      return { ...state, analyticsRefreshInterval: action.payload };
    case "SET_METRICS_REFRESH_INTERVAL":
      return { ...state, metricsRefreshInterval: action.payload };
    default:
      return state;
  }
}

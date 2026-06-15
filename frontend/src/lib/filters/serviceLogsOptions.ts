export const SERVICE_LOGS_SINCE_OPTIONS = [
  { value: "", label: "Sans borne temporelle (tail uniquement)" },
  { value: "15m", label: "Depuis 15 min" },
  { value: "1h", label: "Depuis 1 h" },
  { value: "6h", label: "Depuis 6 h" },
  { value: "24h", label: "Depuis 24 h" },
] as const;

export const SERVICE_LOGS_LINES_OPTIONS = [100, 200, 500, 1000, 2000] as const;

export const SERVICE_LOG_LEVEL_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "error", label: "Erreurs / exceptions" },
  { value: "warn", label: "Avertissements" },
  { value: "info", label: "Info (hors erreur / avertissement)" },
] as const;

export const SERVICE_LOG_KIND_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "http", label: "HTTP (méthodes / HTTP/)" },
  { value: "sql", label: "SQL / Prisma" },
] as const;

export type ServiceLogLevel =
  (typeof SERVICE_LOG_LEVEL_OPTIONS)[number]["value"];

export type ServiceLogKind = (typeof SERVICE_LOG_KIND_OPTIONS)[number]["value"];

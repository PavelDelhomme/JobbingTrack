import type { ServiceLogKind, ServiceLogLevel } from "./serviceLogsOptions";

export type ServiceLogsFilters = {
  service: string;
  lines: number;
  since: string;
  level: ServiceLogLevel;
  kind: ServiceLogKind;
  query: string;
};

export function lineMatchesLevel(
  line: string,
  level: ServiceLogLevel,
): boolean {
  if (level === "all") return true;
  const err =
    /\b(error|exception|fatal|crit(ical)?|econnrefused|unhandledrejection|errno)\b/i.test(
      line,
    );
  const warn = /\b(warn(ing)?)\b/i.test(line);
  if (level === "error") return err;
  if (level === "warn") return warn && !err;
  if (level === "info") return !err && !warn;
  return true;
}

export function lineMatchesKind(line: string, kind: ServiceLogKind): boolean {
  if (kind === "all") return true;
  if (kind === "http")
    return /\b(GET|POST|PUT|PATCH|DELETE|HTTP\/)\b/.test(line);
  if (kind === "sql")
    return /\b(prisma|SELECT\s|INSERT\s|UPDATE\s|DELETE\sFROM|query\s*failed)\b/i.test(
      line,
    );
  return true;
}

export function filterServiceLogLines(
  lines: string[],
  filters: Pick<ServiceLogsFilters, "level" | "kind" | "query">,
): string[] {
  const query = filters.query.trim().toLowerCase();
  return lines.filter((line) => {
    if (!lineMatchesLevel(line, filters.level)) return false;
    if (!lineMatchesKind(line, filters.kind)) return false;
    if (query && !line.toLowerCase().includes(query)) return false;
    return true;
  });
}

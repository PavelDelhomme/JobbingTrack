import type { CrashReportSummary } from "@/lib/services/applicationAnalyticsService";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export { PAGE_SIZE_OPTIONS };

export function crashMeta(crash: CrashReportSummary): Record<string, unknown> {
  return (crash.metadata ?? {}) as Record<string, unknown>;
}

export function crashNestedMeta(crash: CrashReportSummary): Record<string, unknown> {
  return (crashMeta(crash).metadata ?? {}) as Record<string, unknown>;
}

export function crashScreenLabel(crash: CrashReportSummary): string {
  const raw = crashMeta(crash);
  const nested = crashNestedMeta(crash);
  const v = raw.screenName ?? nested.screenName ?? nested.page;
  return v ? String(v) : "—";
}

export function crashUserLabel(crash: CrashReportSummary): string {
  const raw = crashMeta(crash);
  const nested = crashNestedMeta(crash);
  const userId = raw.userId ?? nested.userId;
  const email = nested.userEmail;
  if (email) return String(email);
  if (userId) return String(userId);
  return "—";
}

export function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

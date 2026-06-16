export type ServiceListFilterMetrics = {
  cpu_percent: number;
  memory_percent: number;
};

export type ServiceListFilterRow = {
  is_running: boolean;
  is_healthy: boolean;
  metrics: ServiceListFilterMetrics | null;
};

export type ServiceListFilters = {
  status: string;
  cpu: string;
  memory: string;
};

export const DEFAULT_SERVICE_LIST_FILTERS: ServiceListFilters = {
  status: "",
  cpu: "",
  memory: "",
};

export const SERVICE_STATUS_FILTER_OPTIONS = [
  { value: "running", label: "Actifs" },
  { value: "stopped", label: "Arrêtés" },
  { value: "unhealthy", label: "Non sains" },
] as const;

export const SERVICE_CPU_FILTER_OPTIONS = [
  { value: "high", label: "CPU élevé (> 80 %)" },
  { value: "medium", label: "CPU moyen (40–80 %)" },
  { value: "low", label: "CPU faible (< 40 %)" },
] as const;

export const SERVICE_MEMORY_FILTER_OPTIONS = [
  { value: "high", label: "Mémoire élevée (> 80 %)" },
  { value: "medium", label: "Mémoire moyenne (40–80 %)" },
  { value: "low", label: "Mémoire faible (< 40 %)" },
] as const;

export function buildServiceListFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ServiceListFilters {
  const read = (key: string) => searchParams.get(key)?.trim() || "";
  return {
    status: read("status"),
    cpu: read("cpu"),
    memory: read("memory"),
  };
}

export function serviceListFiltersToSearchParams(
  filters: ServiceListFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.cpu) params.set("cpu", filters.cpu);
  if (filters.memory) params.set("memory", filters.memory);
  return params;
}

export function matchesServiceListFilters(
  service: ServiceListFilterRow,
  filters: ServiceListFilters,
): boolean {
  if (filters.status === "running" && !service.is_running) return false;
  if (filters.status === "stopped" && service.is_running) return false;
  if (
    filters.status === "unhealthy" &&
    (service.is_healthy || !service.is_running)
  ) {
    return false;
  }

  if (filters.cpu && service.metrics) {
    const cpu = service.metrics.cpu_percent;
    if (filters.cpu === "high" && cpu <= 80) return false;
    if (filters.cpu === "medium" && (cpu < 40 || cpu > 80)) return false;
    if (filters.cpu === "low" && cpu >= 40) return false;
  }

  if (filters.memory && service.metrics) {
    const memory = service.metrics.memory_percent;
    if (filters.memory === "high" && memory <= 80) return false;
    if (filters.memory === "medium" && (memory < 40 || memory > 80))
      return false;
    if (filters.memory === "low" && memory >= 40) return false;
  }

  return true;
}

export function serviceListFilterBadges(filters: ServiceListFilters) {
  const badges: { key: string; label: string }[] = [];
  if (filters.status) {
    const label =
      SERVICE_STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status)
        ?.label || filters.status;
    badges.push({ key: "status", label: `État : ${label}` });
  }
  if (filters.cpu) {
    const label =
      SERVICE_CPU_FILTER_OPTIONS.find((o) => o.value === filters.cpu)?.label ||
      filters.cpu;
    badges.push({ key: "cpu", label: label });
  }
  if (filters.memory) {
    const label =
      SERVICE_MEMORY_FILTER_OPTIONS.find((o) => o.value === filters.memory)
        ?.label || filters.memory;
    badges.push({ key: "memory", label: label });
  }
  return badges;
}

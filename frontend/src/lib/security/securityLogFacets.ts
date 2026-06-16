import { FRONTEND_URLS } from "@/config/ports.config";
import type { FacetGroups } from "@/lib/filters/types";

export type SecurityLogFacets = FacetGroups & {
  sampleSize?: number;
  levels?: Array<{ value: string; count?: number }>;
  categories?: Array<{ value: string; count?: number }>;
  eventTypes?: Array<{ value: string; count?: number }>;
  sourceIPs?: Array<{ value: string; count?: number }>;
  endpoints?: Array<{ value: string; count?: number }>;
  methods?: Array<{ value: string; count?: number }>;
  requestIds?: Array<{ value: string; count?: number }>;
  messages?: Array<{ value: string; count?: number }>;
};

type FetchSecurityLogFacetsOptions = {
  days?: number;
  sampleLimit?: number;
  signal?: AbortSignal;
};

export async function fetchSecurityLogFacets(
  options: FetchSecurityLogFacetsOptions = {},
): Promise<SecurityLogFacets> {
  const days = options.days ?? 14;
  const sampleLimit = options.sampleLimit ?? 2000;
  const params = new URLSearchParams({
    sampleLimit: String(sampleLimit),
    startDate: new Date(Date.now() - days * 86400000).toISOString(),
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(
    `${FRONTEND_URLS.api}/api/v1/security/logs/facets?${params}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: options.signal,
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.error ||
        `Suggestions logs sécurité indisponibles (HTTP ${res.status})`,
    );
  }

  return json?.data || {};
}

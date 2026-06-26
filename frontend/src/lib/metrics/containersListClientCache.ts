/**
 * Cache client partagé pour GET docker/services/all (pages Performances backoffice).
 * Évite une rafale de requêtes cold (~2,5 s) à chaque changement d’onglet.
 */

export type ContainersListCacheEntry = {
  name: string;
  service_type?: string;
  health_status?: string;
  [key: string]: unknown;
};

const DEFAULT_TTL_MS = 60_000;

let cache: {
  key: string;
  expiresAt: number;
  data: ContainersListCacheEntry[];
} | null = null;

let inflight: Promise<ContainersListCacheEntry[]> | null = null;
let inflightKey: string | null = null;

export function clearContainersListClientCache(): void {
  cache = null;
  inflight = null;
  inflightKey = null;
}

/**
 * @param cacheKey — ex. `light=1` vs `light=0` (modes API distincts)
 * @param ttlMs — durée de validité côté navigateur
 */
export async function getContainersListCached(
  cacheKey: string,
  fetcher: () => Promise<ContainersListCacheEntry[]>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<ContainersListCacheEntry[]> {
  const now = Date.now();
  if (cache && cache.key === cacheKey && cache.expiresAt > now) {
    return cache.data;
  }
  if (inflight && inflightKey === cacheKey) {
    return inflight;
  }

  inflightKey = cacheKey;
  inflight = fetcher()
    .then((data) => {
      cache = { key: cacheKey, expiresAt: Date.now() + ttlMs, data };
      inflight = null;
      inflightKey = null;
      return data;
    })
    .catch((error) => {
      inflight = null;
      inflightKey = null;
      throw error;
    });

  return inflight;
}

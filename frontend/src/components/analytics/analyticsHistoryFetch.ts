/**
 * Helpers partagés pour les pages analytics/performances.
 * Au changement de période, on garde la série visible jusqu'à l'arrivée de la
 * nouvelle réponse pour éviter un flash "Chargement..." entre deux plages.
 */

export function isBenignFetchAbort(error: unknown): boolean {
  if (error == null) return false;
  if (error instanceof Error && error.name === "AbortError") return true;
  if (typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code);
    if (code === "ERR_CANCELED" || code === "ECONNABORTED") return true;
  }
  return false;
}

export function beginUserRangeFetch<T>(
  silent: boolean,
  _setData: (value: T[]) => void,
  setLoading: (value: boolean) => void,
): void {
  if (!silent) {
    setLoading(true);
  }
}

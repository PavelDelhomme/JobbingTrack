/**
 * Domaine d’axe X : cadre la fenêtre demandée sur les timestamps réellement présents,
 * avec un léger padding (évite une grande zone vide avant le premier point).
 */
export function chartXDomainFromDataRange(
  rangeStartMs: number,
  rangeEndMs: number,
  dataMs: Array<number | null | undefined>,
): [number, number] {
  const t = dataMs.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (t.length === 0) return [rangeStartMs, rangeEndMs];
  const dMin = Math.min(...t);
  const dMax = Math.max(...t);
  const inner = Math.max(dMax - dMin, 60_000);
  const pad = Math.min(inner * 0.04, 15 * 60_000);
  const x0 = Math.max(rangeStartMs, dMin - pad);
  const x1 = Math.min(rangeEndMs, dMax + pad);
  if (!(x1 > x0)) return [rangeStartMs, rangeEndMs];
  return [x0, x1];
}

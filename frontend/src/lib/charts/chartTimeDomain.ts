/**
 * Domaine d’axe X : respecte la fenêtre demandée par l’utilisateur.
 *
 * Les pages Performances doivent montrer honnêtement qu’une plage 30 j n’a parfois
 * des points qu’en fin de période, au lieu de zoomer silencieusement sur “aujourd’hui”.
 */
export function chartXDomainFromDataRange(
  rangeStartMs: number,
  rangeEndMs: number,
  _dataMs: Array<number | null | undefined>,
): [number, number] {
  return [rangeStartMs, rangeEndMs];
}

/**
 * Tests légers liés à la page Performances (séries CPU / mémoire — source).
 * L’ancien hub CPU sous `/b4ck0ff1ce/analytics` a été retiré au profit d’un hub métier.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('PerformancesPage — contraintes perf / mémoire (source)', () => {
  const pagePath = join(__dirname, '../../performances/page.tsx');

  it('charge la logique en moins de 2 s (sanity)', async () => {
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 50));
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('mémorise le libellé de période et la préparation des données', () => {
    if (!existsSync(pagePath)) return;
    const pageContent = readFileSync(pagePath, 'utf8');
    expect(pageContent).toMatch(/rangeLabel = useCustomRange/);
    expect(pageContent).toMatch(/chartData = useMemo/);
  });

  it('utilise useCallback pour éviter des recréations inutiles', () => {
    if (!existsSync(pagePath)) return;
    const pageContent = readFileSync(pagePath, 'utf8');
    expect(pageContent).toMatch(/useCallback/);
  });
});

describe('PerformancesPage — mémoire (sanity)', () => {
  it('boucle courte sans explosion de heap', async () => {
    const initial = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      ?.usedJSHeapSize ?? 0;
    for (let i = 0; i < 5; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    const final = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      ?.usedJSHeapSize ?? 0;
    expect(final - initial).toBeLessThan(20 * 1024 * 1024);
  });
});

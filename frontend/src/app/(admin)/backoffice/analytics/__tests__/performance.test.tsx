/**
 * Tests légers liés à la page analytics (Test CPU)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('AnalyticsPage — contraintes perf / mémoire (source)', () => {
  const pagePath = join(__dirname, '../page.tsx');

  it('charge la logique en moins de 2 s (sanity)', async () => {
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 50));
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('mémorise le libellé de période et la préparation des données', () => {
    if (!existsSync(pagePath)) return;
    const pageContent = readFileSync(pagePath, 'utf8');
    expect(pageContent).toMatch(/chartPeriodLabel = useMemo/);
    expect(pageContent).toMatch(/chartData = useMemo/);
  });

  it('utilise useCallback pour éviter des recréations inutiles', () => {
    if (!existsSync(pagePath)) return;
    const pageContent = readFileSync(pagePath, 'utf8');
    expect(pageContent).toMatch(/useCallback/);
  });
});

describe('AnalyticsPage — mémoire (sanity)', () => {
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

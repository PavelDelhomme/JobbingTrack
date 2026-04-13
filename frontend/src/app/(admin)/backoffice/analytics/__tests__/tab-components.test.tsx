/**
 * Vérifie que la page analytics actuelle (Test CPU) reste structurée correctement.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Analytics page.tsx — structure source', () => {
  const pagePath = join(__dirname, '../page.tsx');

  it('existe et exporte une page client', () => {
    expect(existsSync(pagePath)).toBe(true);
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/'use client'/);
    expect(src).toMatch(/export default function AnalyticsPage/);
  });

  it('utilise useMemo pour le libellé de période', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/chartPeriodLabel/);
    expect(src).toMatch(/useMemo\(/);
  });

  it('utilise useCallback pour les paramètres temporels et le fetch', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/getTimeRangeParams = useCallback/);
    expect(src).toMatch(/fetchCPUData = useCallback/);
  });

  it('affiche un sélecteur de période et Recharts', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/<select/);
    expect(src).toMatch(/LineChart/);
    expect(src).toMatch(/ChartPeriodCaption/);
  });
});

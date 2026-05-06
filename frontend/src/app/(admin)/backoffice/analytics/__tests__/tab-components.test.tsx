/**
 * Vérifie que la page Analytics (hub) expose bien les entrées attendues.
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

  it('présente le hub métier (application + utilisateurs)', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/Hub Analytics/);
    expect(src).toMatch(/title:\s*'Application'/);
    expect(src).toMatch(/title:\s*'Utilisateurs'/);
  });

  it('redirige les métriques infra vers Performances', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/title:\s*'Performances \(infra\)'/);
    expect(src).toMatch(/href:\s*'\/backoffice\/performances'/);
    expect(src).toMatch(/métriques machine/i);
  });

  it('propose un lien vers Statistiques', () => {
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toMatch(/\/backoffice\/statistics/);
    expect(src).toMatch(/Statistiques agrégées/);
  });
});

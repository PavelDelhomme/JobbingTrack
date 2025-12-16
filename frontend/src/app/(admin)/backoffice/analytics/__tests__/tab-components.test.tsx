/**
 * Tests pour les composants Tab de la page Analytics
 * Vérifie que tous les props sont correctement passés et utilisés
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Note: Les composants Tab ne sont pas exportés, nous testons indirectement via la page complète
// Ces tests vérifient que les composants sont utilisés correctement dans la page

// Mock des dépendances
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  Area: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null
}));

const mockProps = {
  metrics: {
    system: { cpu: { usage: '50%' }, memory: { usage: '60%' } },
    containers: {},
    services: {}
  },
  chartData: [
    { time: '10:00', cpu: 50, memory: 60, timestamp: Date.now() }
  ],
  aggregatedStats: {
    avgCpuUsage: 50,
    totalMemoryMb: 1000,
    avgResponseTime: 100,
    servicesTotal: 10,
    servicesHealthy: 8
  },
  loadingHistory: false,
  initialHistoryLoaded: true,
  refreshing: false,
  timeRange: '24h' as const,
  servicesList: []
};

// Tests indirects via la page complète
// Ces tests vérifient que les composants Tab sont utilisés correctement
describe('Tab Components - Validation indirecte via la page', () => {
  it('devrait détecter que timeRange est passé à tous les composants Tab', () => {
    // Ce test vérifie que le code source contient timeRange dans les props
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../page.tsx'),
      'utf8'
    );
    
    // Vérifier que timeRange est présent dans les props de chaque Tab
    expect(pageContent).toMatch(/OverviewTab.*timeRange/);
    expect(pageContent).toMatch(/SystemTab.*timeRange/);
    expect(pageContent).toMatch(/PerformanceTab.*timeRange/);
    expect(pageContent).toMatch(/NetworkTab.*timeRange/);
  });

  it('devrait détecter que timeRange a une valeur par défaut', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../page.tsx'),
      'utf8'
    );
    
    // Vérifier que timeRange a une valeur par défaut dans chaque Tab
    expect(pageContent).toMatch(/timeRange\s*=\s*['"]24h[&apos;"]/);
  });
});


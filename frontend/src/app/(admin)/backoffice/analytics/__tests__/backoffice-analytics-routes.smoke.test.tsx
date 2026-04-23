/**
 * Smoke : toutes les pages sous /backoffice/analytics* se montent sans composant undefined.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/features', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

jest.mock('@/lib/api/analytics.service', () => ({
  analyticsService: {
    getSystemMetricsHistory: jest.fn().mockResolvedValue([]),
    getContainersList: jest.fn().mockResolvedValue([]),
    getContainerMetricsHistory: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/services/centralMetricsService', () => ({
  centralMetricsService: {
    fetchMetrics: jest.fn().mockResolvedValue({
      performance: {},
      system: {},
      health: {},
    }),
  },
}));

jest.mock('@/lib/services/statisticsService', () => ({
  statisticsService: {
    getCurrentStatistics: jest.fn().mockResolvedValue({}),
  },
}));

import AnalyticsCpuPage from '../page';
import PerformancesPage from '../../performances/page';
import NetworkPage from '../network/page';
import ContainersPage from '../containers/page';
import ApplicationPage from '../application/page';

describe('Smoke routes /backoffice/analytics', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('monte /backoffice/analytics (métriques système)', async () => {
    await act(async () => {
      render(<AnalyticsCpuPage />);
    });
    expect(document.querySelector('[data-testid="admin-layout"]')).toBeTruthy();
  });

  it('monte /backoffice/performances (vue Performances)', async () => {
    await act(async () => {
      render(<PerformancesPage />);
    });
    expect(document.body.textContent).toMatch(/Performances|Chargement/);
  });

  it('monte /backoffice/analytics/network', async () => {
    await act(async () => {
      render(<NetworkPage />);
    });
    expect(document.body.textContent).toMatch(/Performances réseau|Chargement/);
  });

  it('monte /backoffice/analytics/containers', async () => {
    await act(async () => {
      render(<ContainersPage />);
    });
    expect(document.body.textContent).toMatch(/Analytics conteneurs|Chargement/);
  });

  it('monte /backoffice/analytics/application', async () => {
    await act(async () => {
      render(<ApplicationPage />);
    });
    expect(document.body.textContent).toMatch(/Performances applicatives|Chargement/);
  });
});

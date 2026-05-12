/**
 * Smoke : toutes les pages sous /b4ck0ff1ce/analytics* se montent sans composant undefined.
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
    getAggregatorMetrics: jest.fn().mockResolvedValue({
      servicesList: [],
      monitoringC: {},
    }),
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

import AnalyticsHubPage from '../page';
import PerformancesPage from '../../performances/page';
import NetworkPage from '../../performances/network/page';
import ContainersPage from '../../performances/containers/page';
import ApplicationPerformancePage from '../application/performance/page';
import ApplicationActivityPage from '../application/activity/page';
import ApplicationFeedbackPage from '../application/feedback/page';

describe('Smoke routes /b4ck0ff1ce/analytics', () => {
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

  it('monte /b4ck0ff1ce/analytics (hub appli & utilisateurs)', async () => {
    await act(async () => {
      render(<AnalyticsHubPage />);
    });
    expect(document.querySelector('[data-testid="admin-layout"]')).toBeTruthy();
  });

  it('monte /b4ck0ff1ce/performances (vue Performances)', async () => {
    await act(async () => {
      render(<PerformancesPage />);
    });
    expect(document.body.textContent).toMatch(/Performances|Chargement/);
  });

  it('monte /b4ck0ff1ce/performances/network', async () => {
    await act(async () => {
      render(<NetworkPage />);
    });
    expect(document.body.textContent).toMatch(/Performances réseau|Chargement/);
  });

  it('monte /b4ck0ff1ce/performances/containers', async () => {
    await act(async () => {
      render(<ContainersPage />);
    });
    expect(document.body.textContent).toMatch(/Performances — conteneurs|Chargement/);
  });

  it('monte /b4ck0ff1ce/analytics/application/performance', async () => {
    await act(async () => {
      render(<ApplicationPerformancePage />);
    });
    expect(document.body.textContent).toMatch(/Application — performances|Chargement/);
  });

  it('monte /b4ck0ff1ce/analytics/application/activity', async () => {
    await act(async () => {
      render(<ApplicationActivityPage />);
    });
    expect(document.body.textContent).toMatch(/activité|traces/);
  });

  it('monte /b4ck0ff1ce/analytics/application/feedback', async () => {
    await act(async () => {
      render(<ApplicationFeedbackPage />);
    });
    expect(document.body.textContent).toMatch(/Retours|signalements/);
  });
});

/**
 * Smoke : toutes les pages sous /backoffice/analytics* se montent sans composant undefined.
 */

import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/features", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

jest.mock("@/lib/api/analytics.service", () => ({
  analyticsService: {
    getSystemMetricsHistory: jest.fn().mockResolvedValue([]),
    getContainersList: jest.fn().mockResolvedValue([]),
    getContainerMetricsHistory: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@/lib/services/centralMetricsService", () => ({
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

jest.mock("@/lib/services/statisticsService", () => ({
  statisticsService: {
    getCurrentStatistics: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/lib/services/applicationAnalyticsService", () => ({
  fetchApplicationEvents: jest.fn().mockResolvedValue([]),
  fetchApplicationPerformance: jest.fn().mockResolvedValue([]),
  fetchCrashReports: jest.fn().mockResolvedValue([]),
}));

const mockConsumeSilentFetch = jest.fn(() => false);
const mockRangeStart = new Date("2026-06-16T00:00:00.000Z");
const mockRangeEnd = new Date("2026-06-17T23:59:59.999Z");
const mockRangeQuery = `startDate=${encodeURIComponent(mockRangeStart.toISOString())}&endDate=${encodeURIComponent(mockRangeEnd.toISOString())}`;
jest.mock("../application/useApplicationTimeRange", () => ({
  useApplicationTimeRange: () => ({
    timeRange: "24h",
    setTimeRange: jest.fn(),
    useCustomRange: false,
    setUseCustomRange: jest.fn(),
    customStart: "2026-06-01",
    setCustomStart: jest.fn(),
    customEnd: "2026-06-17",
    setCustomEnd: jest.fn(),
    rangeLabel: "24 h",
    rangeQuery: mockRangeQuery,
    rangeStart: mockRangeStart,
    rangeEnd: mockRangeEnd,
    goPrev: jest.fn(),
    goNext: jest.fn(),
    canGoNext: false,
    handlePeriodNow: jest.fn(),
    softTick: 0,
    consumeSilentFetch: mockConsumeSilentFetch,
    bumpSoftRefresh: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/backoffice/analytics/application/activity",
}));

import AnalyticsHubPage from "../page";
import PerformancesPage from "../../performances/page";
import NetworkPage from "../../performances/network/page";
import ContainersPage from "../../performances/containers/page";
import ApplicationPerformancePage from "../application/performance/page";
import ApplicationActivityPage from "../application/activity/page";
import ApplicationFeedbackPage from "../application/feedback/page";

describe("Smoke routes /backoffice/analytics", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => "test-token"),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("monte /backoffice/analytics (hub appli & utilisateurs)", async () => {
    await act(async () => {
      render(<AnalyticsHubPage />);
    });
    expect(document.querySelector('[data-testid="admin-layout"]')).toBeTruthy();
  });

  it("monte /backoffice/performances (vue Performances)", async () => {
    await act(async () => {
      render(<PerformancesPage />);
    });
    expect(document.body.textContent).toMatch(/Performances|Chargement/);
  });

  it("monte /backoffice/performances/network", async () => {
    await act(async () => {
      render(<NetworkPage />);
    });
    expect(document.body.textContent).toMatch(/Performances réseau|Chargement/);
  });

  it("monte /backoffice/performances/containers", async () => {
    await act(async () => {
      render(<ContainersPage />);
    });
    expect(document.body.textContent).toMatch(
      /Performances — conteneurs|Chargement/,
    );
  });

  it("monte /backoffice/analytics/application/performance", async () => {
    await act(async () => {
      render(<ApplicationPerformancePage />);
    });
    expect(document.body.textContent).toMatch(
      /Application — performances|Chargement/,
    );
  });

  it("monte /backoffice/analytics/application/activity", async () => {
    await act(async () => {
      render(<ApplicationActivityPage />);
    });
    expect(document.body.textContent).toMatch(/activité|traces/);
  });

  it("monte /backoffice/analytics/application/feedback", async () => {
    await act(async () => {
      render(<ApplicationFeedbackPage />);
    });
    expect(document.body.textContent).toMatch(/Retours|signalements/);
  });
});

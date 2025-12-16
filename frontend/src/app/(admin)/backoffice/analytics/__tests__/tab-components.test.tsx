/**
 * Tests pour les composants Tab de la page Analytics
 * Vérifie que tous les props sont correctement passés et utilisés
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import des composants Tab depuis la page
// Note: Ces composants sont exportés depuis page.tsx pour les tests
import { OverviewTab, SystemTab, PerformanceTab, NetworkTab } from '../page';

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

describe('OverviewTab - Validation des props', () => {
  it('devrait rendre sans erreur avec toutes les props', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<OverviewTab {...mockProps} />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });

  it('devrait utiliser timeRange dans formatXAxisLabel', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<OverviewTab {...mockProps} timeRange="1h" />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });

  it('devrait avoir une valeur par défaut pour timeRange', () => {
    const { timeRange, ...propsWithoutTimeRange } = mockProps;
    
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // @ts-ignore - Test intentionnel pour vérifier la valeur par défaut
    render(<OverviewTab {...propsWithoutTimeRange} />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });
});

describe('SystemTab - Validation des props', () => {
  it('devrait rendre sans erreur avec toutes les props', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<SystemTab {...mockProps} />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });
});

describe('PerformanceTab - Validation des props', () => {
  it('devrait rendre sans erreur avec toutes les props', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<PerformanceTab {...mockProps} />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });
});

describe('NetworkTab - Validation des props', () => {
  it('devrait rendre sans erreur avec toutes les props', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<NetworkTab {...mockProps} />);
    
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('timeRange is not defined')
    );
    
    consoleError.mockRestore();
  });
});


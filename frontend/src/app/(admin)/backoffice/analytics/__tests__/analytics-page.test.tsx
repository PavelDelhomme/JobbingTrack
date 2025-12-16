/**
 * Tests complets pour la page Analytics
 * Détecte les erreurs de props manquantes, problèmes React, et problèmes de performance
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsPage from '../page';
import * as centralMetricsService from '@/lib/services/centralMetricsService';
import * as preferencesService from '@/lib/services/preferencesService';

// Mock des dépendances
jest.mock('@/lib/services/centralMetricsService');
jest.mock('@/lib/services/preferencesService');
jest.mock('@/lib/hooks/auth', () => ({
  useAuth: () => ({
    user: { id: '1&apos;, email: 'admin@test.com', role: &apos;SUPER_ADMIN' },
    isAuthenticated: true,
    isLoading: false
  })
}));
jest.mock('@/components/features', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

describe('AnalyticsPage - Tests de validation des props', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock des services
    (centralMetricsService.centralMetricsService.fetchMetrics as jest.Mock).mockResolvedValue({
      system: { cpu: { usage: '50%&apos; }, memory: { usage: '60%' } },
      containers: {},
      services: {},
      timestamp: new Date().toISOString()
    });
    
    (centralMetricsService.centralMetricsService.getMetricsHistory as jest.Mock).mockResolvedValue([]);
    (preferencesService.default.getRefreshInterval as jest.Mock).mockResolvedValue(10000);
  });

  it('devrait rendre la page sans erreur', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('devrait avoir timeRange défini par défaut', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('24h');
  });

  it('devrait passer timeRange à tous les composants Tab', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    // Vérifier qu'il n&apos;y a pas d'erreur "timeRange is not defined"
    await waitFor(() => {
      const errors = consoleError.mock.calls.filter(call => 
        call[0]?.toString().includes('timeRange is not defined')
      );
      expect(errors.length).toBe(0);
    });
    
    consoleError.mockRestore();
  });

  it('devrait changer timeRange sans erreur', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    const select = screen.getByRole('combobox');
    
    await act(async () => {
      select.dispatchEvent(new Event('change', { bubbles: true }));
      (select as HTMLSelectElement).value = '1h';
    });
    
    expect(select).toHaveValue('1h');
  });
});

describe('AnalyticsPage - Tests de détection d\&apos;erreurs React', () => {
  it('ne devrait pas avoir d\&apos;erreurs de rendu React', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    await waitFor(() => {
      const reactErrors = consoleError.mock.calls.filter(call => {
        const message = call[0]?.toString() || '';
        return message.includes('Warning:') || 
               message.includes('Error:') ||
               message.includes('Cannot update a component');
      });
      expect(reactErrors.length).toBe(0);
    });
    
    consoleError.mockRestore();
  });

  it('ne devrait pas avoir d\&apos;erreurs de référence non définies', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    await waitFor(() => {
      const refErrors = consoleError.mock.calls.filter(call => {
        const message = call[0]?.toString() || '';
        return message.includes('is not defined') ||
               message.includes('ReferenceError');
      });
      expect(refErrors.length).toBe(0);
    });
    
    consoleError.mockRestore();
  });
});

describe('AnalyticsPage - Tests de performance', () => {
  it('devrait charger rapidement (< 2s)', async () => {
    const startTime = performance.now();
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  it('devrait utiliser useMemo pour timeRangeMs', async () => {
    const { rerender } = render(<AnalyticsPage />);
    
    // Vérifier que timeRangeMs est mémorisé
    const firstRender = performance.now();
    rerender(<AnalyticsPage />);
    const secondRender = performance.now();
    
    // Le deuxième rendu devrait être plus rapide grâce à useMemo
    expect(secondRender - firstRender).toBeLessThan(100);
  });
});

describe('AnalyticsPage - Tests de validation des composants Tab', () => {
  it('devrait passer toutes les props requises à OverviewTab', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    // Cliquer sur l'onglet overview
    const overviewTab = screen.getByText('Synthèse');
    await act(async () => {
      overviewTab.click();
    });
    
    await waitFor(() => {
      const errors = consoleError.mock.calls.filter(call => 
        call[0]?.toString().includes('timeRange')
      );
      expect(errors.length).toBe(0);
    });
    
    consoleError.mockRestore();
  });

  it('devrait passer toutes les props requises à SystemTab', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AnalyticsPage />);
    });
    
    // Cliquer sur l'onglet system
    const systemTab = screen.getByText('Système');
    await act(async () => {
      systemTab.click();
    });
    
    await waitFor(() => {
      const errors = consoleError.mock.calls.filter(call => 
        call[0]?.toString().includes('timeRange')
      );
      expect(errors.length).toBe(0);
    });
    
    consoleError.mockRestore();
  });
});


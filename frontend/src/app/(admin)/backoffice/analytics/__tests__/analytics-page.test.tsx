/**
 * Tests page /backoffice/analytics (Test CPU système)
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsPage from '../page';

jest.mock('@/components/features', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('AnalyticsPage (/backoffice/analytics)', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rend la page sans erreur React', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Métriques système \(monitoring\)/i })).toBeInTheDocument();
  });

  it('a le préréglage « Aujourd’hui » par défaut', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('today');
  });

  it('change la période sans erreur', async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '24h' } });
    expect(select).toHaveValue('24h');
  });

  it('n’émet pas d’erreurs React critiques au rendu', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<AnalyticsPage />);
    });

    await waitFor(() => {
      const bad = consoleError.mock.calls.filter((call) => {
        const message = String(call[0] ?? '');
        return (
          message.includes('Warning:') ||
          message.includes('Element type is invalid') ||
          message.includes('Cannot update a component')
        );
      });
      expect(bad.length).toBe(0);
    });

    consoleError.mockRestore();
  });
});

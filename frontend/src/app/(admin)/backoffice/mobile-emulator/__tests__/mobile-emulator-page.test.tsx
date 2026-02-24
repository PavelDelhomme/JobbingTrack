/**
 * Tests de la page Émulateur mobile (backoffice).
 * Vérifie le rendu et le comportement avec le contrôleur mocké.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileEmulatorPage from '../page';

jest.mock('@/components/features', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('MobileEmulatorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, version: 2 }) });
      }
      if (url.includes('/avds')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, avds: [] }) });
      }
      if (url.includes('/devices')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, devices: [] }) });
      }
      if (url.includes('/flutter-devices')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, devices: [] }) });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
  });

  it('affiche le layout admin et le titre ou section Émulateur', async () => {
    render(<MobileEmulatorPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Logs/i)).toBeInTheDocument();
    });
  });

  it('affiche les boutons Build APK et Copier / Effacer pour les logs', async () => {
    render(<MobileEmulatorPage />);
    await waitFor(() => {
      expect(screen.getByText(/Build APK|Build apk/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Copier/i)).toBeInTheDocument();
    expect(screen.getByText(/Effacer/i)).toBeInTheDocument();
  });

  it('appelle /health au montage', async () => {
    render(<MobileEmulatorPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      );
    });
  });
});

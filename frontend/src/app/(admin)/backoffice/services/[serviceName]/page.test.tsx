/**
 * Tests pour la page de détail d'un service
 * Vérifie que tous les éléments nécessaires sont affichés correctement
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import ServiceDetailPage from './page'

// Mock des modules Next.js
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Mock du service centralMetricsService
jest.mock('@/lib/services/centralMetricsService', () => ({
  centralMetricsService: {
    getServiceMetrics: jest.fn(),
    getServiceLogs: jest.fn(),
    getServiceHistory: jest.fn(),
    // Rejeter pour exécuter le fallback fetch(.../history) comme en prod quand l’agrégateur ne répond pas.
    getAggregatorMetrics: jest.fn().mockRejectedValue(new Error('aggregator unavailable in test')),
  },
}))

// Mock des composants
jest.mock('@/components/features', () => ({
  AdminLayout: ({ children }: any) => <div data-testid="admin-layout">{children}</div>,
}))

// Données de test
const mockServiceMetrics = {
  name: 'jobbingtrack-auth-service',
  cpu_percent: 42.3,
  memory_percent: 68.5,
  memory_usage_mb: 180.5,
  memory_limit_mb: 512,
  network_rx_mb: 12.3,
  network_tx_mb: 13.1,
  block_read_mb: 2.5,
  block_write_mb: 1.1,
  pids: 15,
  health: 'healthy',
  health_status_docker: 'healthy',
  health_status_http: 'healthy',
  response_time_ms: 9,
  errors: {
    count_last_5m: 2,
    rate_per_min: 0.4
  }
}

const mockServiceLogs = {
  success: true,
  service: 'jobbingtrack-auth-service',
  total: 50,
  errors: 3,
  warnings: 5,
  lines: [
    '[INFO] Server started on port 8001',
    '[WARN] High memory usage detected',
    '[ERROR] Failed to connect to database',
    '[DEBUG] Processing request for /health',
    '[INFO] Request completed in 12ms',
  ],
  errorLines: [
    '[ERROR] Failed to connect to database',
  ]
}

const mockServiceHistory = [
  {
    timestamp: '2025-11-04T00:00:00.000Z',
    cpu_percent: 40.5,
    memory_usage_mb: 175.2,
    network_rx_mb: 10.5,
    network_tx_mb: 11.2,
    block_read_mb: 1.0,
    block_write_mb: 0.4,
    response_time_ms: 8,
    error_count_5m: 1,
  },
  {
    timestamp: '2025-11-04T00:05:00.000Z',
    cpu_percent: 42.3,
    memory_usage_mb: 180.5,
    network_rx_mb: 12.3,
    network_tx_mb: 13.1,
    block_read_mb: 1.2,
    block_write_mb: 0.55,
    response_time_ms: 9,
    error_count_5m: 2,
  },
]

describe('ServiceDetailPage', () => {
  let mockRouter: any
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeAll(() => {
    const origErr = console.error.bind(console)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      const msg = String(args[0] ?? '')
      if (msg.includes('not wrapped in act')) return
      origErr(...args)
    })
    const origWarn = console.warn.bind(console)
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
      const msg = String(args[0] ?? '')
      if (msg.includes('[SERVICE DETAIL]')) return
      origWarn(...args)
    })
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks()
    
    // Configuration des mocks
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
    }
    
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useParams as jest.Mock).mockReturnValue({ serviceName: 'auth-service' })

    // Mock global fetch
    global.fetch = jest.fn((url) => {
      const u = String(url)
      if (u.includes('/logs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockServiceLogs),
        } as Response)
      }
      if (u.includes('/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockServiceHistory }),
        } as Response)
      }
      if (u.includes('/api/v1/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              system: {
                disk: [{ mount: '/', usage_percent: 44, used: 80, total: 200, usage: 44 }],
              },
            }),
        } as Response)
      }
      // Métriques par défaut
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ service: mockServiceMetrics }),
      } as Response)
    }) as jest.Mock
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Chargement de la page', () => {
    it('devrait afficher un loader pendant le chargement initial', () => {
      render(<ServiceDetailPage />)
      
      expect(screen.getByTestId('admin-layout')).toBeInTheDocument()
      // Le loader est un spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('devrait charger et afficher les données du service', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/auth-service/i)).toBeInTheDocument()
      })
    })
  })

  describe('En-tête et navigation', () => {
    it('devrait afficher le nom du service dans le titre', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/auth-service/i)).toBeInTheDocument()
      })
    })

    it('devrait avoir un bouton retour fonctionnel', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        const backButton = screen.getByTitle(/Retour à la liste des services/i)
        expect(backButton).toBeInTheDocument()
      })

      const backButton = screen.getByTitle(/Retour à la liste des services/i)
      expect(backButton).toHaveAttribute('href', '/backoffice/services')
      // Pas de click : jsdom déclencherait une navigation non implémentée sur <a href>.
    })

    it('devrait avoir un bouton actualiser', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Actualiser/i)).toBeInTheDocument()
      })
    })
  })

  describe('Monitoring détail (A1 — disque hôte, Block I/O, réutilisation API)', () => {
    it('affiche Block I/O conteneur, disque hôte et encart réutilisation', async () => {
      render(<ServiceDetailPage />)
      await waitFor(() => {
        expect(screen.getByText(/Block I\/O conteneur/i)).toBeInTheDocument()
        expect(screen.getByText(/Disque hôte \(contexte\)/i)).toBeInTheDocument()
        expect(screen.getByText(/Réutilisation monitoring/i)).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText(/point de montage \//i)).toBeInTheDocument()
        expect(screen.getByText(/80 Go \/ 200 Go/i)).toBeInTheDocument()
      })
    })
  })

  describe('Bannière de statut', () => {
    it('devrait afficher le statut "Service opérationnel" quand healthy', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Service opérationnel/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le statut Docker', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Docker: healthy/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le statut HTTP', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/HTTP: healthy/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le temps de réponse', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/9 ms/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cartes de métriques', () => {
    it('devrait afficher la métrique CPU', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getAllByText(/Utilisation CPU/i).length).toBeGreaterThanOrEqual(1)
        // formatCpuPercent + locale fr-FR
        expect(screen.getByText(/42,3\s*%/)).toBeInTheDocument()
      })
    })

    it('devrait afficher la métrique Mémoire', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Mémoire ·/i)).toBeInTheDocument()
        expect(screen.getByText(/180,50\s*MB/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le nombre de processus actifs', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Processus \/ tâches \(PIDs\)/i)).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
      })
    })

    it('devrait afficher le trafic réseau avec RX et TX', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Trafic cumulé interface/i)).toBeInTheDocument()
        expect(screen.getByText(/25,40\s*MB/i)).toBeInTheDocument()
        expect(screen.getByText(/↓ RX/i)).toBeInTheDocument()
        expect(screen.getByText(/12,30\s*MB/i)).toBeInTheDocument()
        expect(screen.getByText(/↑ TX/i)).toBeInTheDocument()
        expect(screen.getByText(/13,10\s*MB/i)).toBeInTheDocument()
      })
    })
  })

  describe('Historique des performances', () => {
    it('devrait afficher la section historique', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Historique des Performances/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le nombre de points de données', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(
          screen.getByText(/\d+ points \(fichiers agrégateur \+ session courante\)/i)
        ).toBeInTheDocument()
      })
    })

    it('devrait afficher les graphiques de performance', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /Utilisation CPU/ })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 3, name: /Utilisation Mémoire/ })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 3, name: /Traffic Réseau/ })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 3, name: /Block I\/O \(cumul\)/ })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 3, name: /Block I\/O — débit estimé/ })).toBeInTheDocument()
      })
    })

    it('devrait afficher un message quand pas d\'historique', async () => {
      // Sans métrique service : pas de points « session » — historique vide côté UI
      global.fetch = jest.fn((url) => {
        const u = String(url)
        if (u.includes('/docker/service')) {
          return Promise.resolve({ ok: false, status: 404 } as Response)
        }
        if (u.includes('/logs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ lines: [] }),
          } as Response)
        }
        if (u.includes('/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response)
        }
        if (u.includes('/api/v1/metrics')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ system: { disk: [] } }),
          } as Response)
        }
        return Promise.resolve({ ok: false, status: 500 } as Response)
      }) as jest.Mock

      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Aucun historique de performance disponible pour ce service/i)).toBeInTheDocument()
      })
    })
  })

  describe('Logs en temps réel', () => {
    it('devrait afficher la section logs', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Logs du Service \(Temps Réel\)/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le nombre total de lignes', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/50 lignes/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le nombre d\'erreurs', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/3 erreurs/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le nombre de warnings', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/5 warnings/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher le bouton auto-scroll', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Auto-Scroll Actif/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher les lignes de logs', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Server started on port 8001/i)).toBeInTheDocument()
        expect(screen.getByText(/High memory usage detected/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher un résumé des erreurs récentes', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Erreurs Récentes/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher un message quand pas de logs', async () => {
      // Mock sans logs
      global.fetch = jest.fn((url) => {
        const u = String(url)
        if (u.includes('/logs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ lines: [] }),
          } as Response)
        }
        if (u.includes('/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response)
        }
        if (u.includes('/api/v1/metrics')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ system: { disk: [{ mount: '/', usage_percent: 10, used: 1, total: 100 }] } }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ service: mockServiceMetrics }),
        } as Response)
      }) as jest.Mock

      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Aucun log disponible pour ce service/i)).toBeInTheDocument()
      })
    })
  })

  describe('Rafraîchissement automatique', () => {
    it('devrait indiquer la cadence d’auto-rafraîchissement (défaut 15 s)', async () => {
      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/aligné sur la cadence ci-dessus \(15 s\)/i)).toBeInTheDocument()
      })
    })

    it('programme le rafraîchissement automatique selon l’intervalle sélectionné (15 s par défaut)', () => {
      const spy = jest.spyOn(global, 'setInterval')
      render(<ServiceDetailPage />)
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 15000)
      spy.mockRestore()
    })
  })

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de chargement des métriques', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      ) as jest.Mock

      render(<ServiceDetailPage />)
      
      // La page devrait toujours s'afficher avec des valeurs par défaut
      await waitFor(() => {
        expect(screen.getByText(/auth-service/i)).toBeInTheDocument()
      })
    })

    it('devrait gérer les timeout réseau', async () => {
      global.fetch = jest.fn(() => 
        Promise.reject(new Error('Network timeout'))
      ) as jest.Mock

      render(<ServiceDetailPage />)
      
      // La page devrait quand même s'afficher
      await waitFor(() => {
        expect(screen.getByText(/auth-service/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cas spéciaux', () => {
    it('devrait gérer un service avec le préfixe jobbingtrack-', async () => {
      ;(useParams as jest.Mock).mockReturnValue({ 
        serviceName: 'jobbingtrack-auth-service' 
      })

      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/jobbingtrack-auth-service/i)).toBeInTheDocument()
      })
    })

    it('devrait gérer un service unhealthy', async () => {
      const unhealthyMetrics = {
        ...mockServiceMetrics,
        health: 'unhealthy',
        health_status_docker: 'unhealthy',
        health_status_http: 'degraded',
      }

      global.fetch = jest.fn((url) => {
        if (url.includes('/logs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockServiceLogs),
          } as Response)
        }
        if (url.includes('/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockServiceHistory }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ service: unhealthyMetrics }),
        } as Response)
      }) as jest.Mock

      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Service non disponible/i)).toBeInTheDocument()
        expect(screen.getByText(/Docker: unhealthy/i)).toBeInTheDocument()
      })
    })

    it('devrait gérer un service sans endpoint HTTP', async () => {
      const dbMetrics = {
        ...mockServiceMetrics,
        name: 'jobbingtrack-postgres',
        health_status_docker: 'healthy',
        health_status_http: 'healthy',
        response_time_ms: null,
      }

      ;(useParams as jest.Mock).mockReturnValue({ serviceName: 'postgres' })

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ service: dbMetrics }),
        } as Response)
      ) as jest.Mock

      render(<ServiceDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/postgres/i)).toBeInTheDocument()
        // Le temps de réponse ne devrait pas être affiché pour les DB
      })
    })
  })
})


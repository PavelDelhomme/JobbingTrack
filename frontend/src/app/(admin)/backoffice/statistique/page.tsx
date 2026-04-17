'use client'

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { AdminLayout } from '@/components/features'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { statisticsService, type ApplicationStatistics } from '@/lib/services/statisticsService'
import { cacheManager } from '@/lib/cache/cacheManager'
import { formatLocalChartAxisTick, metricTimestampToMs } from '@/lib/utils/date'
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { 
  Settings, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Building2, 
  FileText, 
  Activity, 
  Eye, 
  EyeOff,
  Cpu,
  MemoryStick,
  Network,
  Clock,
  AlertTriangle,
  Server,
  Database,
  Shield,
  Zap,
  FileBarChart
} from '@/lib/icons'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts'

// Types
interface MetricsHistory {
  timestamp: string
  cpu_percent: number
  memory_percent: number
  memory_usage_mb: number
  network_rx_mb: number
  network_tx_mb: number
  response_time_avg: number
  error_count: number
  error_rate: number
  availability_percent: number
  load_score: number
  containers_count: number
  services_healthy: number
  services_degraded: number
  services_offline: number
}

interface ServiceMetricsHistory {
  service: string
  timestamp: string
  cpu_percent: number
  memory_usage_mb: number
  network_rx_mb: number
  network_tx_mb: number
  response_time_ms: number
  error_count_5m: number
  error_rate_per_min: number
  status: string
}

interface Statistics {
  applications: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    thisMonth: number
    thisWeek: number
  }
  users: {
    total: number
    byRole: Record<string, number>
    activeUsers: number
    newThisMonth: number
  }
  companies: {
    total: number
    byIndustry: Record<string, number>
    bySize: Record<string, number>
  }
  performance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
  }
  system: {
    cpu: {
      current: number
      average: number
      max: number
      min: number
    }
    memory: {
      current: number
      average: number
      max: number
      min: number
    }
    network: {
      totalRx: number
      totalTx: number
      avgRx: number
      avgTx: number
    }
    availability: number
    totalRequests: number
    totalErrors: number
  }
  services: Array<{
    name: string
    displayName: string
    status: string
    cpu: number
    memory: number
    responseTime: number
    errorRate: number
    requests: number
    availability: number
  }>
}

interface CustomizationSettings {
  showApplications: boolean
  showUsers: boolean
  showCompanies: boolean
  showPerformance: boolean
  showSystem: boolean
  showServices: boolean
  showNetwork: boolean
  showSecurity: boolean
  showTimeline: boolean
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d'
  viewType: 'cards' | 'charts' | 'table'
  chartType: 'line' | 'bar' | 'area'
}

const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  showApplications: true,
  showUsers: true,
  showCompanies: true,
  showPerformance: true,
  showSystem: true,
  showServices: true,
  showNetwork: true,
  showSecurity: true,
  showTimeline: true,
  timeRange: '24h',
  viewType: 'charts',
  chartType: 'line'
}

// Couleurs pour les graphiques
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  success: '#22C55E',
  purple: '#A855F7',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#6366F1'
}

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.cyan,
  COLORS.pink,
  COLORS.indigo
]

export default function StatisticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [previousStats, setPreviousStats] = useState<Statistics | null>(null) // Pour calculer les tendances
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistory[]>([])
  const [serviceHistory, setServiceHistory] = useState<ServiceMetricsHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false) // Nouveau state pour le rafraîchissement
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  // ✅ SUPPRESSION : Onglet services retiré car déjà présent dans /backoffice/analytics
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'logs'>('overview')

  // États pour la personnalisation
  const [showCustomization, setShowCustomization] = useState(false)
  const [customization, setCustomization] = useState<CustomizationSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('statistics-customization')
      return saved ? { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(saved) } : DEFAULT_CUSTOMIZATION
    }
    return DEFAULT_CUSTOMIZATION
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // ✅ OPTIMISATION : Charger l'historique UNIQUEMENT pour les onglets qui en ont besoin
  // Les onglets qui nécessitent l'historique : overview, security
  const needsHistory = ['overview', 'security'].includes(activeTab);
  const needsServiceHistory = activeTab === 'logs';
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics()
      // ✅ OPTIMISATION : Charger l'historique UNIQUEMENT si nécessaire
      if (needsHistory) {
        fetchMetricsHistory()
      }
      // Actualiser toutes les 30 secondes (sans recharger l'historique)
      const interval = setInterval(() => {
        fetchStatistics(true) // skipHistorical = true lors des actualisations
        // ✅ OPTIMISATION : Charger l'historique UNIQUEMENT si nécessaire
        if (needsHistory) {
          fetchMetricsHistory()
        }
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, customization.timeRange, needsHistory]) // ✅ Ajouter needsHistory comme dépendance

  // Sauvegarder les paramètres de personnalisation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('statistics-customization', JSON.stringify(customization))
    }
  }, [customization])

  // Fonctions de personnalisation
  const updateCustomization = (updates: Partial<CustomizationSettings>) => {
    setCustomization(prev => ({ ...prev, ...updates }))
  }

  const resetCustomization = () => {
    setCustomization(DEFAULT_CUSTOMIZATION)
  }

  // Conversion du time range en millisecondes
  const getTimeRangeMs = () => {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    return ranges[customization.timeRange]
  }

  const fetchMetricsHistory = async () => {
    try {
      const timeRangeMs = getTimeRangeMs()
      const endTime = Date.now()
      const startTime = endTime - timeRangeMs

      // Récupérer l'historique des métriques (limité à 500 pour performance)
      const history = await centralMetricsService.getMetricsHistory({
        limit: 500,
        startTime,
        endTime
      })

      if (history && Array.isArray(history)) {
        // Formater les données pour les graphiques
        const formattedHistory: MetricsHistory[] = history.map((item: any) => ({
          timestamp: item.timestamp,
          cpu_percent: parseFloat(item.cpu_percent) || 0,
          memory_percent: parseFloat(item.memory_percent) || 0,
          memory_usage_mb: parseFloat(item.memory_usage_mb) || 0,
          network_rx_mb: parseFloat(item.network_rx_mb) || 0,
          network_tx_mb: parseFloat(item.network_tx_mb) || 0,
          response_time_avg: parseFloat(item.response_time_avg) || 0,
          error_count: parseInt(item.error_count) || 0,
          error_rate: parseFloat(item.error_rate) || 0,
          availability_percent: parseFloat(item.availability_percent) || 100,
          load_score: parseFloat(item.load_score) || 0,
          containers_count: parseInt(item.containers_count) || 0,
          services_healthy: parseInt(item.services_healthy) || 0,
          services_degraded: parseInt(item.services_degraded) || 0,
          services_offline: parseInt(item.services_offline) || 0
        }))

        setMetricsHistory(formattedHistory)

        // Récupérer aussi l'historique par service si disponible
        const serviceHistoryData: ServiceMetricsHistory[] = []
        history.forEach((historyItem: any) => {
          if (historyItem.services && Array.isArray(historyItem.services)) {
            historyItem.services.forEach((service: any) => {
              serviceHistoryData.push({
                service: service.name,
                timestamp: historyItem.timestamp,
                cpu_percent: parseFloat(service.cpu_percent) || 0,
                memory_usage_mb: parseFloat(service.memory_usage_mb) || 0,
                network_rx_mb: parseFloat(service.network_rx_mb) || 0,
                network_tx_mb: parseFloat(service.network_tx_mb) || 0,
                response_time_ms: parseFloat(service.response_time_ms) || 0,
                error_count_5m: parseInt(service.error_count_5m) || 0,
                error_rate_per_min: parseFloat(service.error_rate_per_min) || 0,
                status: service.status || 'unknown'
              })
            })
          }
        })
        
        if (serviceHistoryData.length > 0) {
          setServiceHistory(serviceHistoryData)
        }
      }
    } catch (error) {
      console.error('Erreur chargement historique métriques:', error)
    }
  }

  // Charger les dernières données depuis l'historique pour affichage immédiat
  const loadLastKnownStats = async () => {
    try {
      const history = await centralMetricsService.getMetricsHistory({ limit: 1 })
      if (history && history.length > 0) {
        const lastMetric = history[0]
        
        // Utiliser les dernières données disponibles
        const historicalStats: Statistics = {
          system: {
            cpu: {
              current: parseFloat(String(lastMetric.cpu_percent || 0)),
              average: parseFloat(String(lastMetric.cpu_percent || 0)),
              max: parseFloat(String(lastMetric.cpu_percent || 0)),
              min: parseFloat(String(lastMetric.cpu_percent || 0))
            },
            memory: {
              current: parseFloat(String(lastMetric.memory_percent || 0)),
              average: parseFloat(String(lastMetric.memory_percent || 0)),
              max: parseFloat(String(lastMetric.memory_percent || 0)),
              min: parseFloat(String(lastMetric.memory_percent || 0))
            },
            network: {
              totalRx: parseFloat(String(lastMetric.network_rx_mb || 0)),
              totalTx: parseFloat(String(lastMetric.network_tx_mb || 0)),
              avgRx: parseFloat(String(lastMetric.network_rx_mb || 0)),
              avgTx: parseFloat(String(lastMetric.network_tx_mb || 0))
            },
            availability: parseFloat(String(lastMetric.availability_percent || 100)),
            totalRequests: 0,
            totalErrors: parseInt(String(lastMetric.error_count || 0))
          },
          performance: {
            averageResponseTime: parseFloat(String(lastMetric.response_time_avg || 0)),
            successRate: 100 - parseFloat(String(lastMetric.error_rate || 0)),
            errorRate: parseFloat(String(lastMetric.error_rate || 0))
          },
          applications: {
            total: 0,
            byStatus: {},
            byType: {},
            thisMonth: 0,
            thisWeek: 0
          },
          users: {
            total: 0,
            byRole: {},
            activeUsers: 0,
            newThisMonth: 0
          },
          companies: {
            total: 0,
            byIndustry: {},
            bySize: {}
          },
          services: []
        }
        
        setStats(historicalStats)
        console.log('[STATISTICS] ✅ Dernières données connues chargées depuis l\'historique')
      }
    } catch (error) {
      console.error('[STATISTICS] ⚠️ Erreur chargement dernières données:', error)
    }
  }

  const fetchStatistics = async (skipHistorical = false) => {
    try {
      // Utiliser loading seulement au premier chargement, sinon refreshing
      if (initialLoadDone) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // 1. Charger d'abord les dernières données disponibles (seulement au premier chargement)
      if (!skipHistorical && !initialLoadDone) {
        await loadLastKnownStats()
        setInitialLoadDone(true)
      }

      // 2. Récupérer les métriques en temps réel avec cache
      const cacheKey = `statistics_metrics_${customization.timeRange}`
      let metrics = await cacheManager.get(cacheKey, { ttl: 10000 }) // Cache 10 secondes
      
      if (!metrics) {
        metrics = await centralMetricsService.fetchMetrics()
        if (metrics) {
          await cacheManager.set(cacheKey, metrics, { ttl: 10000 })
        }
      }
      
      // Récupérer les stats sur une période
      const timeRangeMs = getTimeRangeMs()
      const endTime = Date.now()
      const startTime = endTime - timeRangeMs

      const metricsStats = await centralMetricsService.getMetricsStats({
        startTime,
        endTime
      })

      // Calculer les statistiques système avec les nouvelles données
      const systemStats = {
        cpu: {
          current: parseFloat(metrics?.system?.cpu?.usage || '0'),
          average: parseFloat(metricsStats?.cpu?.avg || '0'),
          max: parseFloat(metricsStats?.cpu?.max || '0'),
          min: parseFloat(metricsStats?.cpu?.min || '0')
        },
        memory: {
          current: parseFloat(metrics?.system?.memory?.usage || '0'),
          average: parseFloat(metricsStats?.memory?.avg || '0'),
          max: parseFloat(metricsStats?.memory?.max || '0'),
          min: parseFloat(metricsStats?.memory?.min || '0')
        },
        network: {
          totalRx: parseFloat(metrics?.system?.network?.total_rx_mb || '0'),
          totalTx: parseFloat(metrics?.system?.network?.total_tx_mb || '0'),
          avgRx: parseFloat(metricsStats?.network?.rx_mb_avg || '0'),
          avgTx: parseFloat(metricsStats?.network?.tx_mb_avg || '0')
        },
        availability: parseFloat(metrics?.health?.availability_percent || '100'),
        totalRequests: parseInt(metricsStats?.requests?.total || '0'),
        totalErrors: parseInt(metricsStats?.errors?.total || '0')
      }

      // Formater les services
      const servicesArray: Statistics['services'] = []
      if (metrics?.servicesList && Array.isArray(metrics.servicesList)) {
        metrics.servicesList.forEach((service: any) => {
          servicesArray.push({
            name: service.rawName || service.name,
            displayName: service.displayName || service.name,
            status: service.status || 'unknown',
            cpu: parseFloat(service.metrics?.cpu?.percentage || '0'),
            memory: parseFloat(service.metrics?.memory?.percentage || '0'),
            responseTime: typeof service.responseTimeMs === 'number' ? service.responseTimeMs : 0,
            errorRate: parseFloat(service.errorRatePerMin || '0'),
            requests: 0, // TODO: ajouter si disponible
            availability: service.status === 'healthy' ? 100 : service.status === 'degraded' ? 50 : 0
          })
        })
      }

      // ✅ Récupérer les vraies statistiques applicatives avec cache
      let appStats: ApplicationStatistics | null = null
      try {
        const appStatsCacheKey = 'statistics_app_stats'
        appStats = await cacheManager.get<ApplicationStatistics>(appStatsCacheKey, { ttl: 30000 }) // Cache 30 secondes
        
        if (!appStats) {
          appStats = await statisticsService.getCurrentStatistics()
          if (appStats) {
            await cacheManager.set(appStatsCacheKey, appStats, { ttl: 30000 })
            console.log('[STATISTICS] ✅ Statistiques applicatives récupérées:', appStats)
          }
        }
      } catch (error) {
        // Gérer silencieusement et utiliser le cache si disponible
        const appStatsCacheKey = 'statistics_app_stats'
        appStats = await cacheManager.get<ApplicationStatistics>(appStatsCacheKey) || null
      }

      // Calculer le temps de réponse moyen depuis les services
      const servicesWithResponseTime = servicesArray.filter(s => s.responseTime > 0)
      const averageResponseTime = servicesWithResponseTime.length > 0
        ? servicesWithResponseTime.reduce((sum, s) => sum + s.responseTime, 0) / servicesWithResponseTime.length
        : parseFloat(metricsStats?.response_time?.avg || '0')

      // Formater les données récupérées ou utiliser des valeurs par défaut
      const mockAppStats = {
        applications: {
          total: appStats?.applications?.total || 0,
          byStatus: appStats?.applications?.by_status || {},
          byType: appStats?.applications?.by_type || {},
          thisMonth: appStats?.applications?.this_month || 0,
          thisWeek: appStats?.applications?.this_week || 0
        },
        users: {
          total: appStats?.users?.total || 0,
          byRole: appStats?.users?.by_role || {},
          activeUsers: appStats?.users?.active || 0,
          newThisMonth: appStats?.users?.new_this_month || 0
        },
        companies: {
          total: appStats?.companies?.total || 0,
          byIndustry: appStats?.companies?.by_industry || {},
          bySize: appStats?.companies?.by_size || {}
        },
        performance: {
          averageResponseTime: averageResponseTime,
          successRate: 100 - parseFloat(metricsStats?.errors?.rate || '0.0'),
          errorRate: parseFloat(metricsStats?.errors?.rate || '0.0')
        }
      }

      const newStats = {
        ...mockAppStats,
        system: systemStats,
        performance: mockAppStats.performance, // Utiliser le temps de réponse calculé
        services: servicesArray
      }

      // Sauvegarder les stats actuelles comme stats précédentes avant de mettre à jour
      if (stats) {
        setPreviousStats(stats)
      }
      
      setStats(newStats)

    } catch (error) {
      console.error('Erreur chargement statistiques:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Formater le timestamp pour les graphiques (instant API → heure locale navigateur)
  const formatTimestamp = (timestamp: string) => {
    const ms = metricTimestampToMs(timestamp)
    if (ms == null) return '—'
    const timeRange = customization.timeRange
    const withDate = !(timeRange === '1h' || timeRange === '6h' || timeRange === '24h')
    return formatLocalChartAxisTick(ms, { withDate })
  }

  // Préparer les données pour les graphiques (memoizé pour performance)
  const chartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) return []
    
    // Trier par timestamp croissant (plus ancien à gauche, plus récent à droite)
    const sortedHistory = [...metricsHistory].sort(
      (a, b) =>
        (metricTimestampToMs(a.timestamp) ?? 0) - (metricTimestampToMs(b.timestamp) ?? 0)
    )
    
    // Sous-échantillonnage pour les grandes périodes (optimisation)
    const maxPoints = customization.timeRange === '30d' ? 500 : 
                      customization.timeRange === '7d' ? 300 : 
                      customization.timeRange === '24h' ? 200 : 100
    
    let dataToUse = sortedHistory
    if (sortedHistory.length > maxPoints) {
      const step = Math.ceil(sortedHistory.length / maxPoints)
      dataToUse = sortedHistory.filter((_, index) => index % step === 0)
    }
    
    return dataToUse.map(item => ({
      time: formatTimestamp(item.timestamp),
      cpu: item.cpu_percent,
      memory: item.memory_percent,
      networkRx: item.network_rx_mb,
      networkTx: item.network_tx_mb,
      responseTime: item.response_time_avg,
      errorRate: item.error_rate,
      availability: item.availability_percent,
      loadScore: item.load_score
    }))
  }, [metricsHistory, customization.timeRange])

  // Loader uniquement au tout premier chargement
  if (authLoading || (loading && !stats)) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Erreur de chargement des statistiques
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              📊 Statistiques & Monitoring Global
              {refreshing && (
                <span className="text-sm font-normal text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualisation...
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Analyse complète des performances, sécurité et monitoring en temps réel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={customization.timeRange}
              onChange={(e) => updateCustomization({ timeRange: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">Dernière heure</option>
              <option value="6h">6 heures</option>
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
            </select>
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panneau de personnalisation */}
        {showCustomization && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personnalisation</h3>
              <button
                onClick={resetCustomization}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.showApplications}
                  onChange={(e) => updateCustomization({ showApplications: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Applications</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.showSystem}
                  onChange={(e) => updateCustomization({ showSystem: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Système</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.showServices}
                  onChange={(e) => updateCustomization({ showServices: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Services</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.showNetwork}
                  onChange={(e) => updateCustomization({ showNetwork: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Réseau</span>
              </label>
            </div>
            <div className="mt-4 flex gap-4">
              <select
                value={customization.chartType}
                onChange={(e) => updateCustomization({ chartType: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm"
              >
                <option value="line">Ligne</option>
                <option value="area">Aire</option>
                <option value="bar">Barres</option>
              </select>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: '📊 Vue d\'ensemble', icon: BarChart3 },
              // ✅ SUPPRESSION : Onglet Services retiré car déjà présent dans /backoffice/analytics > Services & Logs
              { id: 'security', label: '🔒 Sécurité', icon: Shield },
              { id: 'logs', label: '📊 Statistiques Logs', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div>
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats}
              previousStats={previousStats}
              chartData={chartData} 
              customization={customization}
              router={router}
            />
          )}
          {/* ✅ SUPPRESSION : Onglet Services retiré - Disponible dans /backoffice/analytics > Services & Logs */}
          {activeTab === 'security' && (
            <SecurityTab 
              stats={stats}
              chartData={chartData}
            />
          )}
          {activeTab === 'logs' && (
            <LogsTab 
              serviceHistory={serviceHistory}
              formatTimestamp={formatTimestamp}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

// Composant Overview Tab (memoizé pour performance)
const OverviewTab = memo(function OverviewTab({ stats, previousStats, chartData, customization, router }: any) {
  // Calculer les tendances en comparant avec les stats précédentes
  const usersTrend = previousStats 
    ? stats.users.total - (previousStats.users?.total || 0)
    : 0
  const applicationsTrend = previousStats
    ? stats.applications.total - (previousStats.applications?.total || 0)
    : 0
  const companiesTrend = previousStats
    ? stats.companies.total - (previousStats.companies?.total || 0)
    : 0
  const contactsTrend = previousStats
    ? (stats.contacts?.total || 0) - (previousStats.contacts?.total || 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Cartes de résumé - Statistiques métier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Utilisateurs"
          value={stats.users.total.toLocaleString()}
          trend={usersTrend}
          color="blue"
          subtitle={`${stats.users.activeUsers || 0} actifs • ${stats.users.newThisMonth || 0} ce mois`}
          trendType="positive-is-good"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          title="Candidatures"
          value={stats.applications.total.toLocaleString()}
          trend={applicationsTrend}
          color="green"
          subtitle={`${stats.applications.thisWeek || 0} cette semaine • ${stats.applications.thisMonth || 0} ce mois`}
          trendType="positive-is-good"
        />
        <StatCard
          icon={<Building2 className="w-6 h-6" />}
          title="Entreprises"
          value={stats.companies.total.toLocaleString()}
          trend={companiesTrend}
          color="purple"
          subtitle={`${Object.keys(stats.companies.byIndustry || {}).length} secteurs`}
          trendType="positive-is-good"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Contacts"
          value={(stats.contacts?.total || 0).toLocaleString()}
          trend={contactsTrend}
          color="orange"
          subtitle={`${(stats.contacts?.thisWeek || 0)} cette semaine`}
          trendType="positive-is-good"
        />
      </div>

      {/* Graphiques de statistiques métier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des utilisateurs et candidatures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📈 Évolution des Données
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke={COLORS.primary} 
                fill={COLORS.primary}
                fillOpacity={0.3}
                name="Utilisateurs"
              />
              <Area 
                type="monotone" 
                dataKey="applications" 
                stroke={COLORS.secondary} 
                fill={COLORS.secondary}
                fillOpacity={0.3}
                name="Candidatures"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Les graphiques temporels seront disponibles une fois l'historique collecté
          </p>
        </div>

        {/* Répartition des candidatures par statut */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📊 Candidatures par Statut
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={Object.entries(stats.applications.byStatus || {}).map(([status, count]) => ({
                  name: status,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(stats.applications.byStatus || {}).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des utilisateurs par rôle */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            👥 Utilisateurs par Rôle
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={Object.entries(stats.users.byRole || {}).map(([role, count]) => ({
                  name: role,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(stats.users.byRole || {}).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des entreprises par secteur */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            🏢 Entreprises par Secteur
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={Object.entries(stats.companies.byIndustry || {}).map(([industry, count]) => ({
                name: industry.length > 15 ? industry.substring(0, 15) + '...' : industry,
                value: count
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#9CA3AF" 
                style={{ fontSize: '11px' }}
                width={120}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Bar dataKey="value" fill={COLORS.info} name="Nombre" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats applicatives */}
      {customization.showApplications && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📝 Candidatures
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.applications.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Ce mois</span>
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {stats.applications.thisMonth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cette semaine</span>
                <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {stats.applications.thisWeek}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ResponsiveContainer width="100%" height={150}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(stats.applications.byType).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    label
                  >
                    {Object.entries(stats.applications.byType).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              👥 Utilisateurs
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.users.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Actifs</span>
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {stats.users.activeUsers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nouveaux</span>
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {stats.users.newThisMonth}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ResponsiveContainer width="100%" height={150}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(stats.users.byRole).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    label
                  >
                    {Object.entries(stats.users.byRole).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🏢 Entreprises
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.companies.total}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Par secteur</h4>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={Object.entries(stats.companies.byIndustry).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    style={{ fontSize: '10px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// Composant System Tab
function SystemTab({ stats, chartData, customization }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques système détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Actuel</span>
            <Cpu className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.cpu.current.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Max: {stats.system.cpu.max.toFixed(1)}% | Min: {stats.system.cpu.min.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mémoire Actuelle</span>
            <MemoryStick className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.memory.current.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Max: {stats.system.memory.max.toFixed(1)}% | Min: {stats.system.memory.min.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Réseau RX</span>
            <Network className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.network.totalRx.toFixed(2)} MB
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Moy: {stats.system.network.avgRx.toFixed(2)} MB
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Réseau TX</span>
            <Network className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.network.totalTx.toFixed(2)} MB
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Moy: {stats.system.network.avgTx.toFixed(2)} MB
          </div>
        </div>
      </div>

      {/* Graphiques système */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU détaillé */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 Utilisation CPU Détaillée
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCpu)"
                  name="CPU (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mémoire détaillée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Utilisation Mémoire Détaillée
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMemory)"
                  name="Mémoire (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Charge système combinée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Charge Système Globale
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
                <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (%)" />
                <Line 
                  type="monotone" 
                  dataKey="loadScore" 
                  stroke={COLORS.warning}
                  strokeWidth={3}
                  name="Score de charge"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant Services Tab
function ServicesTab({ stats, serviceHistory, customization, formatTimestamp }: any) {
  const [selectedService, setSelectedService] = useState<string | null>(null)

  // Préparer les données pour le service sélectionné
  const serviceChartData = selectedService 
    ? serviceHistory
        .filter((item: any) => item.service === selectedService)
        .map((item: any) => ({
          time: formatTimestamp(item.timestamp),
          cpu: item.cpu_percent,
          memory: item.memory_usage_mb,
          responseTime: item.response_time_ms,
          errorRate: item.error_rate_per_min,
          networkRx: item.network_rx_mb,
          networkTx: item.network_tx_mb
        }))
    : []

  return (
    <div className="space-y-6">
      {/* Liste des services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.services.map((service: any) => (
          <div
            key={service.name}
            onClick={() => setSelectedService(service.name)}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all ${
              selectedService === service.name
                ? 'ring-2 ring-blue-600 dark:ring-blue-400'
                : 'hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {service.displayName}
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                service.status === 'healthy' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : service.status === 'degraded'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {service.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">CPU</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {service.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, service.cpu)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Mémoire</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {service.memory.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, service.memory)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-600 dark:text-gray-400">Temps réponse</span>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {service.responseTime > 0 ? `${service.responseTime.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>

              {service.errorRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Taux d'erreur</span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {service.errorRate.toFixed(2)}/min
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques du service sélectionné */}
      {selectedService && serviceChartData.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📊 Détails: {stats.services.find((s: any) => s.name === selectedService)?.displayName}
              </h3>
              <button
                onClick={() => setSelectedService(null)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPU & Mémoire du service */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  CPU & Mémoire
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={serviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke={COLORS.primary} 
                      name="CPU (%)"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke={COLORS.secondary} 
                      name="Mémoire (MB)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Temps de réponse */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Temps de Réponse
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={serviceChartData}>
                    <defs>
                      <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke={COLORS.purple}
                      fillOpacity={1} 
                      fill="url(#colorResponseTime)"
                      name="Temps (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Réseau */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Trafic Réseau
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={serviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="networkRx" 
                      stackId="1"
                      stroke={COLORS.info} 
                      fill={COLORS.info}
                      fillOpacity={0.6}
                      name="RX (MB)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="networkTx" 
                      stackId="1"
                      stroke={COLORS.warning} 
                      fill={COLORS.warning}
                      fillOpacity={0.6}
                      name="TX (MB)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Taux d'erreur */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Taux d'Erreur
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={serviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Bar 
                      dataKey="errorRate" 
                      fill={COLORS.danger}
                      name="Erreurs/min"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CPU moyen par service */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📊 CPU Moyen par Service
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={stats.services.map((s: any) => ({ name: s.displayName, cpu: s.cpu }))}
            layout="horizontal"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="#9CA3AF"
              style={{ fontSize: '11px' }}
              width={150}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: 'none',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Composant Network Tab
function NetworkTab({ stats, chartData, customization }: any) {
  // Calculer les moyennes RX et TX depuis l'historique
  const avgRx = chartData.length > 0 
    ? chartData.reduce((sum: number, d: any) => sum + (d.networkRx || 0), 0) / chartData.length 
    : 0
  const avgTx = chartData.length > 0 
    ? chartData.reduce((sum: number, d: any) => sum + (d.networkTx || 0), 0) / chartData.length 
    : 0

  // Calculer les totaux cumulés
  const totalRx = chartData.length > 0 
    ? chartData.reduce((sum: number, d: any) => sum + (d.networkRx || 0), 0)
    : stats.system.network.totalRx
  const totalTx = chartData.length > 0 
    ? chartData.reduce((sum: number, d: any) => sum + (d.networkTx || 0), 0)
    : stats.system.network.totalTx

  return (
    <div className="space-y-6">
      {/* Métriques réseau globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RX</span>
            <Network className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalRx.toFixed(2)} MB
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sur la période
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total TX</span>
            <Network className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalTx.toFixed(2)} MB
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sur la période
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne RX</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgRx.toFixed(2)} MB
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Par snapshot
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne TX</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgTx.toFixed(2)} MB
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Par snapshot
          </div>
        </div>
      </div>

      {/* Graphiques réseau */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trafic réseau global */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🌐 Trafic Réseau Global
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stackId="1"
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.6}
                  name="Réception (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stackId="1"
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="Émission (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Évolution du trafic réseau */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📈 Évolution du Trafic
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.4}
                  name="Réception (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.4}
                  name="Émission (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Informations supplémentaires */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Network className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              À propos des métriques réseau
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Les données réseau sont collectées depuis les métriques Docker et représentent le trafic total des conteneurs.
              RX = Réception (Download), TX = Transmission (Upload).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant Security Tab
const SecurityTab = memo(function SecurityTab({ stats, chartData }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques de sécurité */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Disponibilité</span>
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.availability.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requêtes</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.totalRequests.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Erreurs</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.system.totalErrors.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux d'erreur</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.performance.errorRate.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Graphiques de sécurité */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disponibilité dans le temps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🛡️ Disponibilité dans le temps
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[90, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="availability" 
                  stroke={COLORS.success}
                  strokeWidth={3}
                  name="Disponibilité (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Taux d'erreur dans le temps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Taux d'Erreur dans le temps
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke={COLORS.danger}
                  fillOpacity={1} 
                  fill="url(#colorError)"
                  name="Taux d'erreur (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* État des services */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🔧 État des Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services Sains</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.services.filter((s: any) => s.status === 'healthy').length}
              </span>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services Dégradés</span>
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.services.filter((s: any) => s.status === 'degraded').length}
              </span>
            </div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services Hors ligne</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.services.filter((s: any) => s.status === 'offline' || s.status === 'unknown').length}
              </span>
            </div>
          </div>
        </div>

        {/* Diagramme circulaire */}
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={[
                  { name: 'Sains', value: stats.services.filter((s: any) => s.status === 'healthy').length },
                  { name: 'Dégradés', value: stats.services.filter((s: any) => s.status === 'degraded').length },
                  { name: 'Hors ligne', value: stats.services.filter((s: any) => s.status === 'offline' || s.status === 'unknown').length }
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                <Cell fill={COLORS.success} />
                <Cell fill={COLORS.warning} />
                <Cell fill={COLORS.danger} />
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
})

// Composant Logs Tab
const LogsTab = memo(function LogsTab({ serviceHistory, formatTimestamp }: any) {
  // Statistiques d'erreurs par service
  const errorStatsByService = serviceHistory.reduce((acc: any, item: any) => {
    if (!acc[item.service]) {
      acc[item.service] = { service: item.service, totalErrors: 0, avgErrorRate: 0, count: 0 }
    }
    acc[item.service].totalErrors += item.error_count_5m
    acc[item.service].avgErrorRate += item.error_rate_per_min
    acc[item.service].count += 1
    return acc
  }, {})

  const errorStatsArray = Object.values(errorStatsByService).map((stat: any) => ({
    service: stat.service,
    totalErrors: stat.totalErrors,
    avgErrorRate: (stat.avgErrorRate / stat.count).toFixed(2)
  }))

  return (
    <div className="space-y-6">
      {/* Statistiques d'erreurs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📋 Statistiques d'Erreurs par Service
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={errorStatsArray}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="service"
              stroke="#9CA3AF"
              style={{ fontSize: '10px' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: 'none',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Legend />
            <Bar dataKey="totalErrors" fill={COLORS.danger} name="Total Erreurs" />
            <Bar dataKey="avgErrorRate" fill={COLORS.warning} name="Taux Moyen (/min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Informations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Accès aux Logs Complets
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Pour consulter les logs détaillés de chaque service, rendez-vous dans la section 
              <strong> Performances & Analytics &gt; Services & Logs</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})

// Composant StatCard avec logique de tendance correcte
function StatCard({ icon, title, value, trend, color, subtitle, trendType = 'negative-is-bad' }: any) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  }

  // Déterminer la couleur de la tendance selon le type
  const getTrendColor = () => {
    if (trend === undefined || trend === null || trend === 0) return 'text-gray-500'
    
    if (trendType === 'positive-is-bad') {
      // Pour CPU, Mémoire, Temps de réponse : augmentation = mauvais (rouge), diminution = bon (vert)
      return trend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
    } else if (trendType === 'positive-is-good') {
      // Pour statistiques métier : augmentation = bon (vert), diminution = mauvais (rouge)
      return trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    } else {
      // Pour Disponibilité : augmentation = bon (vert), diminution = mauvais (rouge)
      return trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toLocaleString()}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  )
}

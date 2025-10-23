'use client'

import { useEffect, useState, Suspense } from 'react'
import AdminLayout from '@/components/features/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Settings, BarChart3, PieChart, TrendingUp, Eye, EyeOff } from 'lucide-react'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { DataSourceBadge } from '@/components/ui/badge'

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Hook personnalisé pour les métriques utilisant le service centralisé
function useMetrics() {
  const [metrics, setMetrics] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const metricsData = await centralMetricsService.fetchMetrics()
        setMetrics(metricsData)
        setIsConnected(true)
        setError(null)
      } catch (err) {
        console.error('Erreur chargement métriques analytics:', err)
        setError('Erreur lors du chargement des métriques')
        // Définir des valeurs par défaut sûres avec indicateurs de source
        setMetrics({
          services: {},
          system: {
            cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A', dataSource: 'SIMULATED' },
            memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A', dataSource: 'REAL' },
            load: { average: 'N/A', cores: [], dataSource: 'REAL' },
            disk: [{ mount: 'N/A', total: 'N/A', used: 'N/A', usage: 'N/A' }],
            uptime: 'N/A',
            hostname: 'N/A',
            dataSource: 'MIXED'
          },
          containers: {},
          timestamp: new Date().toISOString()
        })
      }
    }

    loadMetrics()

    // Actualiser toutes les 10 secondes pour une meilleure réactivité
    const interval = setInterval(loadMetrics, 10000)

    return () => clearInterval(interval)
  }, [])

  return { metrics, isConnected, error }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Interfaces pour les vraies données système
interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  errorRate: number
  successRate: number
  uptime: number
}

interface ErrorLog {
  id: string
  timestamp: string
  service: string
  endpoint: string
  method: string
  statusCode: number
  errorMessage: string
  userId?: string
}

interface TimelineData {
  period: string
  applications: number
  companies: number
  users: number
  interviews: number
  successRate: number
  avgResponseTime: number
}

interface DevMetrics {
  memoryUsage: number
  cpuUsage: number
  databaseConnections: number
  cacheHitRate: number
  apiCallsPerSecond: number
  slowestEndpoint: string
  mostUsedEndpoint: string
  errorDistribution: Record<string, number>
  p95ResponseTime: number
  p99ResponseTime: number
  memoryLeakSuspected: boolean
  highCpuProcesses: string[]
  databaseSlowQueries: number
  cacheEvictions: number
  apiRateLimitHits: number
  concurrentUsers: number
  averageSessionDuration: number
  errorTrends: Array<{hour: string, count: number}>
  performanceScore: number
  recommendations: string[]
  intrusionAttempts: number
  ddosAttacks: number
  securityScore: number
  vulnerabilities: number
  successfulBuilds: number
  totalBuilds: number
  automatedTests: number
  testCoverage: number
  technicalDebt: string
  mttr: string
  mttd: string
  majorIncidents: number
  activeUsers: number
  uptime: number
  averageResponseTime: number
  errorRate: number
  avgDeploymentTime: number
  rolledBackDeployments: number
  deploymentSuccessRate: number
}

interface CustomizationSettings {
  showPerformance: boolean
  showErrors: boolean
  showTimeline: boolean
  showDeveloper: boolean
  showSecurity: boolean
  viewType: 'cards' | 'charts' | 'table'
  chartType: 'bar' | 'pie' | 'line'
}

const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  showPerformance: true,
  showErrors: true,
  showTimeline: true,
  showDeveloper: false,
  showSecurity: false,
  viewType: 'cards',
  chartType: 'bar'
}

function AnalyticsContent() {
  const { token, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { metrics } = useMetrics()

  const [activeTab, setActiveTab] = useState<'performance' | 'errors' | 'timeline' | 'developer' | 'security'>('performance')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // États pour la personnalisation
  const [showCustomization, setShowCustomization] = useState(false)
  const [customization, setCustomization] = useState<CustomizationSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('analytics-customization')
      return saved ? { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(saved) } : DEFAULT_CUSTOMIZATION
    }
    return DEFAULT_CUSTOMIZATION
  })

  // ✅ Gérer l'onglet depuis l'URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && ['performance', 'errors', 'timeline', 'developer', 'security'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any)
    }
  }, [searchParams])

  // Sauvegarder les paramètres de personnalisation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics-customization', JSON.stringify(customization))
    }
  }, [customization])

  // Fonctions de personnalisation
  const updateCustomization = (updates: Partial<CustomizationSettings>) => {
    setCustomization(prev => ({ ...prev, ...updates }))
  }

  const resetCustomization = () => {
    setCustomization(DEFAULT_CUSTOMIZATION)
  }

  // États pour les vraies données
  // Générer les données par défaut pour les tendances d'erreurs (24 heures)
  const generateDefaultErrorTrends = () => {
    // Toutes les tendances d'erreurs sont maintenant à 0 (N/A)
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0
    }))
  }


  // Fonction pour afficher une métrique avec son indicateur de source
  const MetricWithSource = ({ label, value, source }: { label: string, value: string | number, source: "REAL" | "SIMULATED" | "FALLBACK" | "MIXED" }) => (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <DataSourceBadge source={source} />
      </div>
      <span className="font-bold text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );

  const [devMetrics, setDevMetrics] = useState<DevMetrics>({ // TODO: Récupérer les vraies données
    memoryUsage: 'N/A', // TODO: Récupérer les vraies données
    cpuUsage: 0, // TODO: Récupérer les vraies données
    databaseConnections: 'N/A', // TODO: Récupérer les vraies données
    cacheHitRate: 'N/A', // TODO: Récupérer les vraies données
    apiCallsPerSecond: 'N/A', // TODO: Récupérer les vraies données
    slowestEndpoint: 'N/A', // TODO: Récupérer les vraies données
    mostUsedEndpoint: 'N/A', // TODO: Récupérer les vraies données
    errorDistribution: {}, // TODO: Récupérer les vraies données
    p95ResponseTime: 'N/A', // TODO: Récupérer les vraies données
    p99ResponseTime: 'N/A', // TODO: Récupérer les vraies données
    memoryLeakSuspected: false, // TODO: Récupérer les vraies données
    highCpuProcesses: [], // TODO: Récupérer les vraies données
    databaseSlowQueries: 'N/A', // TODO: Récupérer les vraies données
    cacheEvictions: 'N/A', // TODO: Récupérer les vraies données
    apiRateLimitHits: 'N/A', // TODO: Récupérer les vraies données
    concurrentUsers: 'N/A', // TODO: Récupérer les vraies données
    averageSessionDuration: 'N/A', // TODO: Récupérer les vraies données
    errorTrends: generateDefaultErrorTrends(), // TODO: Récupérer les vraies données
    performanceScore: 'N/A', // TODO: Récupérer les vraies données
    recommendations: [], // TODO: Récupérer les vraies données
    intrusionAttempts: 'N/A', // TODO: Récupérer les vraies données
    ddosAttacks: 'N/A', // TODO: Récupérer les vraies données
    securityScore: 'N/A', // TODO: Récupérer les vraies données
    vulnerabilities: 'N/A', // TODO: Récupérer les vraies données
    successfulBuilds: 'N/A', // TODO: Récupérer les vraies données
    totalBuilds: 'N/A', // TODO: Récupérer les vraies données
    automatedTests: 'N/A', // TODO: Récupérer les vraies données
    testCoverage: 'N/A', // TODO: Récupérer les vraies données
    technicalDebt: 'N/A', // TODO: Récupérer les vraies données
    mttr: 'N/A', // TODO: Récupérer les vraies données
    mttd: 'N/A', // TODO: Récupérer les vraies données
    majorIncidents: 'N/A', // TODO: Récupérer les vraies données
    activeUsers: 'N/A', // TODO: Récupérer les vraies données
    uptime: 'N/A', // TODO: Récupérer les vraies données
    averageResponseTime: 'N/A', // TODO: Récupérer les vraies données
    errorRate: 'N/A', // TODO: Récupérer les vraies données
    avgDeploymentTime: 'N/A', // TODO: Récupérer les vraies données
    rolledBackDeployments: 'N/A', // TODO: Récupérer les vraies données
    deploymentSuccessRate: 'N/A' // TODO: Récupérer les vraies données
  })

  const [loading, setLoading] = useState(true)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])

  useEffect(() => {
    if (token) {
      loadAnalytics()
    }
  }, [token, timeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // ✅ Charger les erreurs D'ABORD pour calculer les métriques cohérentes
      const errors = await loadErrorLogs()

      // Charger les autres données en parallèle avec le nombre d'erreurs
      await Promise.all([
        loadPerformanceMetrics(errors.length),
        loadDevMetrics(),
        loadTimelineData()
      ])
    } catch (error) {
      console.error('Erreur chargement analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPerformanceMetrics = async (errorCount: number) => {
    try {
      // ✅ Toutes les métriques de performance sont maintenant 'N/A'
      setDevMetrics(prev => ({
        ...prev,
        totalRequests: 'N/A',
        successfulRequests: 'N/A',
        failedRequests: 'N/A',
        averageResponseTime: 'N/A',
        errorRate: 'N/A',
        successRate: 'N/A',
        uptime: 'N/A'
      }))
    } catch (error) {
      console.error('Erreur chargement métriques performance:', error)
    }
  }

  const loadErrorLogs = async (): Promise<ErrorLog[]> => {
    try {
      // Charger les vraies erreurs depuis l'API de sécurité via l'API Gateway
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance/security/logs?level=error&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })

      const logs = response.data.logs || []

      // Convertir les logs de sécurité en erreurs système
      const mockErrors: ErrorLog[] = logs.map((log: any, index: number) => ({
        id: log.id || `error-${index}`,
        timestamp: log.timestamp,
        service: log.service || 'system',
        endpoint: log.action || '/unknown',
        method: log.method || 'GET',
        statusCode: 500,
        errorMessage: log.message || 'Erreur système détectée',
        userId: log.userId
      }))

      setErrorLogs(mockErrors)
      return mockErrors // ✅ Retourner les erreurs pour le calcul des métriques
    } catch (error) {
      console.error('Erreur chargement logs:', error)
      return []
    }
  }

  const loadDevMetrics = async () => {
    try {
      // ✅ Toutes les données sont maintenant 'N/A' pour éviter les données fausses
      const memoryUsage = 'N/A'
      const cpuUsage = 'N/A'
      const cacheHitRate = 'N/A'
      const activeUsers = 'N/A'
      const errorRate = 'N/A'
      const intrusionAttempts = 'N/A'
      const ddosAttacks = 'N/A'
      const vulnerabilities = 'N/A'
      const securityScore = 'N/A'

      // Remplacer les tendances d'erreurs par des valeurs 0
      const errorTrends = Array.from({ length: 24 }, (_, i) => {
        const hour = i
        const hourStr = `${hour.toString().padStart(2, '0')}:00`
        return { hour: hourStr, count: 0 }
      })

      // Toutes les métriques sont maintenant 'N/A' pour éviter les données fausses
      setDevMetrics({
        memoryUsage,
        cpuUsage,
        databaseConnections: 'N/A',
        cacheHitRate,
        apiCallsPerSecond: 'N/A',
        slowestEndpoint: 'N/A',
        mostUsedEndpoint: 'N/A',
        errorDistribution: {},
        p95ResponseTime: 'N/A',
        p99ResponseTime: 'N/A',
        memoryLeakSuspected: false,
        highCpuProcesses: [],
        databaseSlowQueries: 'N/A',
        cacheEvictions: 'N/A',
        apiRateLimitHits: 'N/A',
        concurrentUsers: 'N/A',
        averageSessionDuration: 'N/A',
        errorTrends,
        performanceScore: 'N/A',
        recommendations: [
          "📊 Toutes les métriques sont temporairement indisponibles",
          "🔄 Nous travaillons à intégrer les vraies données"
        ],
        intrusionAttempts: 'N/A',
        ddosAttacks: 'N/A',
        securityScore: 'N/A',
        vulnerabilities: 'N/A',
        successfulBuilds: 'N/A',
        totalBuilds: 'N/A',
        automatedTests: 'N/A',
        testCoverage: 'N/A',
        technicalDebt: 'N/A',
        mttr: 'N/A',
        mttd: 'N/A',
        majorIncidents: 'N/A',
        activeUsers: 'N/A',
        uptime: 'N/A',
        averageResponseTime: 'N/A',
        errorRate: 'N/A',
        avgDeploymentTime: 'N/A',
        rolledBackDeployments: 'N/A',
        deploymentSuccessRate: 'N/A'
      })
    } catch (error) {
      console.error('Erreur chargement métriques dev:', error)
    }
  }

  const loadTimelineData = async () => {
    try {
      // ✅ Remplacer les données de test par des valeurs 'N/A' pour éviter les données fausses
      const timeline: TimelineData[] = []

      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

        timeline.push({
          period: i === 0 ? "Auj." : i === 1 ? "Hier" : dateStr,
          applications: 'N/A',
          companies: 'N/A',
          users: 'N/A',
          interviews: 'N/A',
          successRate: 'N/A',
          avgResponseTime: 'N/A'
        })
      }

      setTimelineData(timeline)
    } catch (error) {
      console.error('Erreur chargement timeline:', error)
      // Fallback avec données N/A
      setTimelineData([
        { period: '7j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '6j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '5j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '4j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '3j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '2j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: '1j', applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' },
        { period: "Auj.", applications: 'N/A', companies: 'N/A', users: 'N/A', interviews: 'N/A', successRate: 'N/A', avgResponseTime: 'N/A' }
      ])
    }
  }

  const openErrorDetails = (error: ErrorLog) => {
    setSelectedError(error);
    setShowErrorModal(true);
  };

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des analytics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* En-tête avec titre et contrôles */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                📊 Performances & Analytics
              </h1>
              <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                Surveillance détaillée des performances et métriques système
              </p>
            </div>
            <div className="flex space-x-2 sm:space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm md:text-base text-gray-900 dark:text-gray-100"
              >
                <option value="1h">Dernière heure</option>
                <option value="24h">Dernières 24h</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
              <button
                onClick={() => setShowCustomization(!showCustomization)}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center text-xs sm:text-sm md:text-base whitespace-nowrap"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Personnaliser</span>
              </button>
              <button
                onClick={loadAnalytics}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center text-xs sm:text-sm md:text-base whitespace-nowrap"
              >
                🔄 <span className="hidden sm:inline ml-1">Actualiser</span>
              </button>
            </div>
          </div>

          {/* Onglets - Responsive */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8">
              {[
                { id: 'performance', label: '📈 Performances', count: null },
                { id: 'errors', label: '❌ Erreurs', count: errorLogs.length },
                { id: 'timeline', label: '📅 Timeline', count: null },
                { id: 'security', label: '🛡️ Sécurité', count: devMetrics.apiRateLimitHits > 0 ? devMetrics.apiRateLimitHits : null },
                { id: 'developer', label: '🔧 Développeur', count: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm md:text-base whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      tab.count > 10 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      tab.count > 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Métriques principales de performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{devMetrics.uptime}%</p>
                    </div>
                    <div className="text-green-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Disponibilité système</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de réponse</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{devMetrics.averageResponseTime}ms</p>
                    </div>
                    <div className="text-blue-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Moyen sur {timeRange}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Requêtes/minute</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{Math.floor(devMetrics.apiCallsPerSecond * 60)}</p>
                    </div>
                    <div className="text-purple-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Trafic actuel</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Performance</p>
                      <p className={`text-3xl font-bold ${devMetrics.performanceScore >= 80 ? 'text-green-600 dark:text-green-400' : devMetrics.performanceScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {devMetrics.performanceScore}
                      </p>
                    </div>
                    <div className={`${devMetrics.performanceScore >= 80 ? 'text-green-500' : devMetrics.performanceScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Évaluation globale</p>
                </div>
              </div>

              {/* Graphiques de performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique des erreurs par heure */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    📈 Erreurs par Heure
                  </h3>
                  <div className="h-48 flex items-end justify-between gap-1">
                    {devMetrics.errorTrends.map((trend, index) => {
                      const maxCount = Math.max(...devMetrics.errorTrends.map(d => d.count))
                      const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                            <div
                              className="bg-red-500 rounded-t-lg transition-all duration-300"
                              style={{ height: `${Math.max(height, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{trend.hour}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Métriques système */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    💻 Métriques Système
                  </h3>
                  <div className="space-y-4">
                    <MetricWithSource label="Utilisation CPU" value={devMetrics.cpuUsage > 0 ? `${devMetrics.cpuUsage.toFixed(1)}%` : 'N/A'} source="REAL" />
                    <MetricWithSource label="Utilisation Mémoire" value="N/A" source="REAL" />
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  🤖 Recommandations
                </h3>
                <div className="space-y-3">
                  {devMetrics.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-blue-500 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-6">
              {/* Résumé des erreurs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Erreurs Totales</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{errorLogs.length}</p>
                    </div>
                    <div className="text-red-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Dernières 24h</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services Affectés</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {new Set(errorLogs.map(e => e.service)).size}
                      </p>
                    </div>
                    <div className="text-orange-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 13H9a1 1 0 010 2H7a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 010-2h2.414l1.293 1.293a1 1 0 001.414-1.414L12.414 11H15a2 2 0 002-2V5a2 2 0 00-2-2H5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Services impactés</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux d'Erreur</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {typeof devMetrics.errorRate === 'number' ? `${devMetrics.errorRate.toFixed(2)}%` : devMetrics.errorRate}
                      </p>
                    </div>
                    <div className="text-purple-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sur le trafic total</p>
                </div>
              </div>

              {/* Liste des erreurs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  📋 Erreurs Récentes
                </h3>
                {errorLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune erreur détectée !</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {errorLogs.slice(0, 20).map((error) => (
                      <div
                        key={error.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => openErrorDetails(error)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              error.statusCode >= 500 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              error.statusCode >= 400 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {error.statusCode}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{error.service}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(error.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs mr-2">
                            {error.method} {error.endpoint}
                          </span>
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">{error.errorMessage}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Métriques de croissance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouvelles candidatures</p>
                        <DataSourceBadge source="SIMULATED" />
                      </div>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        N/A
                      </p>
                    </div>
                    <div className="text-blue-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cette semaine</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouveaux utilisateurs</p>
                        <DataSourceBadge source="SIMULATED" />
                      </div>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        N/A
                      </p>
                    </div>
                    <div className="text-green-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cette semaine</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux de réussite</p>
                        <DataSourceBadge source="SIMULATED" />
                      </div>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        N/A
                      </p>
                    </div>
                    <div className="text-purple-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Moyen cette semaine</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de réponse</p>
                        <DataSourceBadge source="SIMULATED" />
                      </div>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        N/A
                      </p>
                    </div>
                    <div className="text-orange-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Moyen cette semaine</p>
                </div>
              </div>

              {/* Graphique de timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  📊 Évolution sur 7 jours
                </h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {timelineData.map((data, index) => {
                    const maxValue = Math.max(...timelineData.map(d => d.applications))
                    const height = maxValue > 0 ? (data.applications / maxValue) * 100 : 0
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                          <div
                            className="bg-blue-500 rounded-t-lg transition-all duration-300"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{data.period}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Métriques de sécurité principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tentatives d'intrusion</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{devMetrics.intrusionAttempts}</p>
                    </div>
                    <div className="text-red-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Dernières 24h</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attaques DDoS</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{devMetrics.ddosAttacks}</p>
                    </div>
                    <div className="text-orange-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 13H9a1 1 0 010 2H7a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 010-2h2.414l1.293 1.293a1 1 0 001.414-1.414L12.414 11H15a2 2 0 002-2V5a2 2 0 00-2-2H5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Dernières 24h</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Sécurité</p>
                      <p className={`text-3xl font-bold ${devMetrics.securityScore >= 90 ? 'text-green-600 dark:text-green-400' : devMetrics.securityScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {devMetrics.securityScore}
                      </p>
                    </div>
                    <div className={`${devMetrics.securityScore >= 90 ? 'text-green-500' : devMetrics.securityScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Évaluation globale</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vulnérabilités</p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{devMetrics.vulnerabilities}</p>
                    </div>
                    <div className="text-yellow-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Actives détectées</p>
                </div>
              </div>

              {/* Graphique de sécurité en temps réel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    📊 Activité de Sécurité (24h)
                  </h3>
                  <div className="h-48 flex items-end justify-between gap-1">
                    {devMetrics.errorTrends.map((trend, index) => {
                      const maxCount = Math.max(...devMetrics.errorTrends.map(d => d.count))
                      const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                            <div
                              className="bg-red-500 rounded-t-lg transition-all duration-300"
                              style={{ height: `${Math.max(height, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{trend.hour}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                    🔴 Attaques • 🟠 Menaces • 🟡 Échecs d'auth
                  </div>
                </div>

                {/* Analyse des vulnérabilités */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span>⚠️</span>
                    Analyse des Vulnérabilités
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{devMetrics.vulnerabilities}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Critiques</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{Math.floor(devMetrics.vulnerabilities * 0.1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Élevées</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.floor(devMetrics.vulnerabilities * 0.3)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CVSS Moyen</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">6.5</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métriques de sécurité avancées */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span>🔍</span>
                  Monitoring Sécurité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Logs de sécurité</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{Math.floor(devMetrics.intrusionAttempts * 10)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Événements suspects</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{devMetrics.intrusionAttempts}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Authentifications échouées</span>
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">{Math.floor(devMetrics.intrusionAttempts * 2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Menaces détectées</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{Math.floor(devMetrics.ddosAttacks * 3)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Traces actives</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{Math.floor(devMetrics.intrusionAttempts * 20)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse moyen</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{Math.floor(devMetrics.averageResponseTime * 1.2)}ms</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Requêtes par minute</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{Math.floor(devMetrics.apiCallsPerSecond * 60 * 1.5)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Taux d'erreur APM</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{(devMetrics.errorRate * 1.2).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Builds réussis</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{devMetrics.successfulBuilds}/{devMetrics.totalBuilds}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tests automatisés</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{devMetrics.automatedTests} exécutés</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Temps de déploiement</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{Math.round(devMetrics.avgDeploymentTime / 60)}min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Rollbacks ce mois</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{devMetrics.rolledBackDeployments}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'developer' && (
            <div className="space-y-6">
              {/* Métriques développeur */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Couverture Tests</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{devMetrics.testCoverage}%</p>
                    </div>
                    <div className="text-green-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Tests automatisés</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dette Technique</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {devMetrics.technicalDebt !== 'N/A' ? `${devMetrics.technicalDebt}h` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-orange-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Temps estimé</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">MTTR</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {devMetrics.mttr !== 'N/A' ? `${devMetrics.mttr}min` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-blue-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Mean Time To Recovery</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">MTTD</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {devMetrics.mttd !== 'N/A' ? `${devMetrics.mttd}min` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-purple-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Mean Time To Detection</p>
                </div>
              </div>

              {/* Métriques DevOps */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span>🔧</span>
                  Métriques DevOps
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">MTTR (Mean Time To Recovery)</span>
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {devMetrics.mttr !== 'N/A' ? `${devMetrics.mttr}min` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">MTTD (Mean Time To Detection)</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {devMetrics.mttd !== 'N/A' ? `${devMetrics.mttd}min` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Disponibilité ce mois</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {devMetrics.deploymentSuccessRate ? `${devMetrics.deploymentSuccessRate.toFixed(2)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Incidents majeurs</span>
                    <span className="font-bold text-red-700 dark:text-red-300">{devMetrics.majorIncidents}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal d'erreur */}
          {showErrorModal && selectedError && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Détails de l'Erreur</h3>
                    <button
                      onClick={() => setShowErrorModal(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service</label>
                      <p className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded">{selectedError.service}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endpoint</label>
                      <p className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono">{selectedError.method} {selectedError.endpoint}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code d'Erreur</label>
                      <p className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded">{selectedError.statusCode}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message d'Erreur</label>
                      <p className="text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400">
                        {selectedError.errorMessage}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timestamp</label>
                      <p className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded">{new Date(selectedError.timestamp).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  )
}

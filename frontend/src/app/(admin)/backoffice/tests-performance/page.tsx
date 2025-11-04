'use client'

import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { 
  Settings, 
  Play, 
  Pause,
  StopCircle,
  BarChart3,
  Activity,
  Cpu,
  MemoryStick,
  Network,
  Clock,
  Zap,
  TrendingUp,
  Download
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Types
interface MetricPoint {
  timestamp: string
  cpu_percent: number
  memory_percent: number
  network_rx_mb: number
  network_tx_mb: number
  response_time_avg: number
  error_rate: number
  availability_percent: number
  load_score: number
}

interface TestConfig {
  duration: number // en secondes
  interval: number // en millisecondes
  requestsPerInterval: number
  targetService: string
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  success: '#22C55E',
  purple: '#A855F7',
  cyan: '#06B6D4'
}

const AVAILABLE_METRICS = [
  { key: 'cpu_percent', label: 'CPU (%)', color: COLORS.primary, icon: Cpu },
  { key: 'memory_percent', label: 'Mémoire (%)', color: COLORS.secondary, icon: MemoryStick },
  { key: 'network_rx_mb', label: 'Réseau RX (MB)', color: COLORS.info, icon: Network },
  { key: 'network_tx_mb', label: 'Réseau TX (MB)', color: COLORS.warning, icon: Network },
  { key: 'response_time_avg', label: 'Temps de réponse (ms)', color: COLORS.purple, icon: Clock },
  { key: 'error_rate', label: 'Taux d\'erreur (%)', color: COLORS.danger, icon: Activity },
  { key: 'availability_percent', label: 'Disponibilité (%)', color: COLORS.success, icon: TrendingUp },
  { key: 'load_score', label: 'Score de charge', color: COLORS.cyan, icon: Zap }
]

export default function TestsPerformancePage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // États
  const [metricsData, setMetricsData] = useState<MetricPoint[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['cpu_percent', 'memory_percent', 'response_time_avg'])
  const [isRunning, setIsRunning] = useState(false)
  const [testConfig, setTestConfig] = useState<TestConfig>({
    duration: 60,
    interval: 1000,
    requestsPerInterval: 10,
    targetService: 'all'
  })
  const [services, setServices] = useState<string[]>([])
  const [currentTest, setCurrentTest] = useState<{
    startTime: Date
    elapsedTime: number
    requestsSent: number
  } | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadServices()
    }
  }, [isAuthenticated])

  // Charger la liste des services
  const loadServices = async () => {
    try {
      const servicesList = await centralMetricsService.getAllServices()
      setServices(servicesList.map(s => s.name || s.rawName || ''))
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  // Collecter les métriques
  const collectMetrics = async () => {
    try {
      const history = await centralMetricsService.getMetricsHistory({ limit: 1 })
      if (history && history.length > 0) {
        const latest = history[0]
        const newPoint: MetricPoint = {
          timestamp: new Date().toLocaleTimeString(),
          cpu_percent: parseFloat(String(latest.cpu_percent || 0)),
          memory_percent: parseFloat(String(latest.memory_percent || 0)),
          network_rx_mb: parseFloat(String(latest.network_rx_mb || 0)),
          network_tx_mb: parseFloat(String(latest.network_tx_mb || 0)),
          response_time_avg: parseFloat(String(latest.response_time_avg || 0)),
          error_rate: parseFloat(String(latest.error_rate || 0)),
          availability_percent: parseFloat(String(latest.availability_percent || 100)),
          load_score: parseFloat(String(latest.load_score || 0))
        }

        setMetricsData(prev => {
          const updated = [...prev, newPoint]
          // Garder maximum 100 points
          return updated.slice(-100)
        })
      }
    } catch (error) {
      console.error('Erreur collecte métriques:', error)
    }
  }

  // Démarrer le test
  const startTest = () => {
    setIsRunning(true)
    setMetricsData([])
    setCurrentTest({
      startTime: new Date(),
      elapsedTime: 0,
      requestsSent: 0
    })

    // Collecter les métriques régulièrement
    intervalRef.current = setInterval(collectMetrics, testConfig.interval)

    // Simuler des requêtes (pour l'instant)
    testIntervalRef.current = setInterval(() => {
      setCurrentTest(prev => {
        if (!prev) return null
        const elapsed = (new Date().getTime() - prev.startTime.getTime()) / 1000
        
        if (elapsed >= testConfig.duration) {
          stopTest()
          return prev
        }

        return {
          ...prev,
          elapsedTime: elapsed,
          requestsSent: prev.requestsSent + testConfig.requestsPerInterval
        }
      })
    }, testConfig.interval)
  }

  // Arrêter le test
  const stopTest = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current)
      testIntervalRef.current = null
    }
  }

  // Basculer une métrique
  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        return prev.filter(k => k !== metricKey)
      } else {
        return [...prev, metricKey]
      }
    })
  }

  // Exporter les données
  const exportData = () => {
    const dataStr = JSON.stringify(metricsData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `test-performance-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            🧪 Tests de Performance
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
            Lancez des tests de charge et visualisez les métriques en temps réel
          </p>
        </div>

        {/* Configuration du test */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Contrôles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Durée (secondes)
                </label>
                <input
                  type="number"
                  value={testConfig.duration}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                  min="10"
                  max="600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intervalle (ms)
                </label>
                <input
                  type="number"
                  value={testConfig.interval}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                  min="100"
                  max="10000"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service cible
                </label>
                <select
                  value={testConfig.targetService}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, targetService: e.target.value }))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Tous les services</option>
                  {services.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 space-y-2">
                {!isRunning ? (
                  <button
                    onClick={startTest}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    Démarrer le test
                  </button>
                ) : (
                  <button
                    onClick={stopTest}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                    Arrêter le test
                  </button>
                )}

                {metricsData.length > 0 && (
                  <button
                    onClick={exportData}
                    className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Exporter les données
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* État du test */}
          {currentTest && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                État du test
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Temps écoulé</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {currentTest.elapsedTime.toFixed(1)}s / {testConfig.duration}s
                  </p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(currentTest.elapsedTime / testConfig.duration) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Requêtes envoyées</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {currentTest.requestsSent.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Points collectés</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {metricsData.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sélection des métriques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Métriques à afficher
            </h3>
            
            <div className="space-y-2">
              {AVAILABLE_METRICS.map(metric => (
                <label key={metric.key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                    className="rounded"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{metric.label}</span>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: metric.color }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📊 Métriques en temps réel
          </h3>
          
          {metricsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Aucune donnée à afficher</p>
              <p className="text-sm">Lancez un test pour commencer à collecter des métriques</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
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
                {AVAILABLE_METRICS.filter(m => selectedMetrics.includes(m.key)).map(metric => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={2}
                    name={metric.label}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Statistiques des métriques */}
        {metricsData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedMetrics.map(metricKey => {
              const metric = AVAILABLE_METRICS.find(m => m.key === metricKey)
              if (!metric) return null

              const values = metricsData.map(d => d[metricKey as keyof MetricPoint] as number)
              const avg = values.reduce((a, b) => a + b, 0) / values.length
              const min = Math.min(...values)
              const max = Math.max(...values)
              const current = values[values.length - 1]

              return (
                <div key={metricKey} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <metric.icon className="w-5 h-5" style={{ color: metric.color }} />
                    <span className="text-2xl font-bold" style={{ color: metric.color }}>
                      {current?.toFixed(2)}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {metric.label}
                  </h4>
                  <div className="text-xs space-y-1 text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Moy:</span>
                      <span>{avg.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min:</span>
                      <span>{min.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max:</span>
                      <span>{max.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


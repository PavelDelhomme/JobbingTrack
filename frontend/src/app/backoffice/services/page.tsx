'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ServiceStatus {
  name: string
  url: string
  port: number
  status: 'online' | 'offline' | 'testing'
  responseTime?: number
  version?: string
  error?: string
  lastChecked?: string
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  service?: string
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ServicesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'services' | 'logs' | 'tests'>('services')
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health`, port: 3000, status: 'testing' },
    { name: 'Auth Service', url: `${API_GATEWAY_URL}/api/v1/auth/health`, port: 3001, status: 'testing' },
    { name: 'Application Service', url: `${API_GATEWAY_URL}/api/v1/applications/health`, port: 3002, status: 'testing' },
    { name: 'Company Service', url: `${API_GATEWAY_URL}/api/v1/companies/health`, port: 3003, status: 'testing' },
    { name: 'Contact Service', url: `${API_GATEWAY_URL}/api/v1/contacts/health`, port: 3004, status: 'testing' },
    { name: 'Interview Service', url: `${API_GATEWAY_URL}/api/v1/interviews/health`, port: 3005, status: 'testing' },
    { name: 'Notification Service', url: `${API_GATEWAY_URL}/api/v1/notifications/health`, port: 3006, status: 'testing' },
    { name: 'Dashboard Service', url: `${API_GATEWAY_URL}/api/v1/dashboard/health`, port: 3007, status: 'testing' },
    { name: 'Call Service', url: `${API_GATEWAY_URL}/api/v1/calls/health`, port: 3008, status: 'testing' },
    { name: 'Profile Service', url: `${API_GATEWAY_URL}/api/v1/profile/health`, port: 3009, status: 'testing' },
    { name: 'Event Service', url: `${API_GATEWAY_URL}/api/v1/events/health`, port: 3011, status: 'testing' },
    { name: 'FollowUp Service', url: `${API_GATEWAY_URL}/api/v1/followups/health`, port: 3012, status: 'testing' },
  ])
  const [testing, setTesting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selectedService, setSelectedService] = useState<string>('all')
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      testAllServices()
    }
  }, [isAuthenticated])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        testAllServices()
        if (activeTab === 'logs') {
          fetchLogs()
        }
      }, 30000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, activeTab])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, selectedService])

  const testService = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now()
    try {
      const response = await axios.get(service.url, { 
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const responseTime = Date.now() - startTime

      return {
        ...service,
        status: 'online',
        responseTime,
        version: response.data.version,
        lastChecked: new Date().toLocaleTimeString('fr-FR'),
        error: undefined
      }
    } catch (error: any) {
      return {
        ...service,
        status: 'offline',
        error: error.message || 'Service inaccessible',
        lastChecked: new Date().toLocaleTimeString('fr-FR')
      }
    }
  }

  const testAllServices = async () => {
    setTesting(true)
    const results = await Promise.all(
      services.map(service => testService(service))
    )
    setServices(results)
    setTesting(false)
  }

  const testSingleService = async (index: number) => {
    setServices(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'testing' }
      return updated
    })

    const result = await testService(services[index])
    
    setServices(prev => {
      const updated = [...prev]
      updated[index] = result
      return updated
    })
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const endpoint = selectedService === 'all' 
        ? `${API_GATEWAY_URL}/api/v1/admin/logs/all`
        : `${API_GATEWAY_URL}/api/v1/admin/logs/${selectedService}`

      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 10000
      })

      if (response.data.success) {
        setLogs(response.data.logs || [])
      }
    } catch (error: any) {
      console.error('Erreur chargement logs:', error)
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const restartService = async (serviceName: string, index: number) => {
    if (!confirm(`🔄 Voulez-vous vraiment redémarrer le service "${serviceName}" ?\n\nCela peut prendre quelques secondes.`)) {
      return
    }

    try {
      setServices(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'testing' }
        return updated
      })

      const response = await axios.post(
        `${API_GATEWAY_URL}/api/v1/admin/services/restart`,
        { serviceName: serviceName.toLowerCase().replace(' service', '').replace(' ', '-') },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          timeout: 30000
        }
      )

      if (response.data.success) {
        alert(`✅ Service "${serviceName}" redémarré avec succès !`)
        setTimeout(() => testSingleService(index), 3000)
      } else {
        alert(`❌ Erreur : ${response.data.error}`)
        setServices(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'offline' }
          return updated
        })
      }
    } catch (error: any) {
      alert(`❌ Erreur lors du redémarrage : ${error.message}`)
      setServices(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'offline' }
        return updated
      })
    }
  }

  const stopService = async (serviceName: string, index: number) => {
    if (!confirm(`⚠️ ATTENTION : Arrêter le service "${serviceName}" ?\n\nCe service ne sera plus accessible jusqu'à son redémarrage manuel.`)) {
      return
    }

    try {
      setServices(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'testing' }
        return updated
      })

      const response = await axios.post(
        `${API_GATEWAY_URL}/api/v1/admin/services/stop`,
        { serviceName: serviceName.toLowerCase().replace(' service', '').replace(' ', '-') },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          timeout: 30000
        }
      )

      if (response.data.success) {
        alert(`🛑 Service "${serviceName}" arrêté`)
        setServices(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'offline', error: 'Service arrêté manuellement' }
          return updated
        })
      } else {
        alert(`❌ Erreur : ${response.data.error}`)
      }
    } catch (error: any) {
      alert(`❌ Erreur lors de l'arrêt : ${error.message}`)
    }
  }

  const onlineCount = services.filter(s => s.status === 'online').length
  const offlineCount = services.filter(s => s.status === 'offline').length
  const averageResponseTime = services
    .filter(s => s.responseTime)
    .reduce((acc, s) => acc + (s.responseTime || 0), 0) / (services.filter(s => s.responseTime).length || 1)

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header avec onglets */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                🔧 Services & Tests
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Surveillance, tests et logs des microservices
              </p>
            </div>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh (30s)</span>
              </label>
              {activeTab === 'services' && (
                <button
                  onClick={testAllServices}
                  disabled={testing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                >
                  {testing ? '🔄 Test en cours...' : '🧪 Tester tous'}
                </button>
              )}
              {activeTab === 'logs' && (
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                >
                  {loadingLogs ? '🔄 Chargement...' : '🔄 Rafraîchir'}
                </button>
              )}
            </div>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('services')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🔧 Services
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                📋 Logs
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🧪 Tests DB
              </button>
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'services' && (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services Total</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{services.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En ligne</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hors ligne</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{offlineCount}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps moy. réponse</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{Math.round(averageResponseTime)}ms</p>
              </div>
            </div>

            {/* Services List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  onTest={() => testSingleService(index)}
                  onRestart={() => restartService(service.name, index)}
                  onStop={() => stopService(service.name, index)}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <LogsViewer
            logs={logs}
            services={services}
            selectedService={selectedService}
            onServiceChange={setSelectedService}
            loading={loadingLogs}
          />
        )}

        {activeTab === 'tests' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">🧪 Tests de connexion DB</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Fonctionnalité à venir : tests automatiques de connexion aux bases de données et vérification de l'intégrité des schémas Prisma.
            </p>
            <div className="space-y-2">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <span className="text-2xl mr-3">✅</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Test de connexion PostgreSQL</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <span className="text-2xl mr-3">✅</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Vérification des schémas Prisma</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <span className="text-2xl mr-3">✅</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Test des migrations</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function ServiceCard({ service, onTest, onRestart, onStop }: {
  service: ServiceStatus
  onTest: () => void
  onRestart: () => void
  onStop: () => void
}) {
  const statusColors = {
    online: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    offline: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    testing: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
  }

  const statusIcons = {
    online: '✅',
    offline: '❌',
    testing: '🔄'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {service.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Port {service.port}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[service.status]}`}>
            {statusIcons[service.status]} {service.status.toUpperCase()}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {service.responseTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Temps de réponse:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{service.responseTime}ms</span>
            </div>
          )}
          {service.version && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Version:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{service.version}</span>
            </div>
          )}
          {service.lastChecked && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Dernier test:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{service.lastChecked}</span>
            </div>
          )}
        </div>

        {service.error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-800 dark:text-red-400">{service.error}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={onTest}
              className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-sm rounded-lg transition-colors font-medium"
            >
              🧪 Tester
            </button>
            <button
              onClick={onRestart}
              className="flex-1 px-3 py-2 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-sm rounded-lg transition-colors font-medium"
              title="Redémarrer le service"
            >
              🔄 Redémarrer
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onStop}
              className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-lg transition-colors font-medium"
              title="Arrêter le service"
            >
              🛑 Arrêter
            </button>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-900/80 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center"
              title="Ouvrir l'URL du service"
            >
              🔗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogsViewer({ logs, services, selectedService, onServiceChange, loading }: {
  logs: LogEntry[]
  services: ServiceStatus[]
  selectedService: string
  onServiceChange: (service: string) => void
  loading: boolean
}) {
  const levelColors: Record<string, string> = {
    error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    warn: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    debug: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20',
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de service */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filtrer par service :
        </label>
        <select
          value={selectedService}
          onChange={(e) => onServiceChange(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="all">Tous les services</option>
          {services.map(service => (
            <option key={service.name} value={service.name.toLowerCase().replace(' service', '').replace(' ', '-')}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📋 Logs {selectedService !== 'all' ? `- ${selectedService}` : ''}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {logs.length} entrées
          </p>
        </div>
        
        <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-sm">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucun log disponible
            </div>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 200).map((log, index) => (
                <div key={index} className="flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded">
                  <span className="text-gray-500 dark:text-gray-500 shrink-0">
                    {log.timestamp}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${levelColors[log.level] || levelColors.info}`}>
                    {log.level?.toUpperCase() || 'INFO'}
                  </span>
                  {log.service && (
                    <span className="text-purple-600 dark:text-purple-400 shrink-0">
                      [{log.service}]
                    </span>
                  )}
                  <span className="text-gray-700 dark:text-gray-300 break-all">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

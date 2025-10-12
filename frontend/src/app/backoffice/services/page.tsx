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

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function ServicesPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>('services')
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health`, port: 8080, status: 'testing' },
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
    { name: 'Frontend', url: `${API_GATEWAY_URL}/health`, port: 3000, status: 'testing' },
  ])
  const [testing, setTesting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(15) // En secondes, par défaut 15s
  const [logs, setLogs] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<string>('all')
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logLines, setLogLines] = useState(100)

  useEffect(() => {
    if (token) {
      testAllServices()
    }
  }, [token])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        testAllServices()
        if (activeTab === 'logs') {
          fetchLogs()
        }
      }, refreshInterval * 1000) // Convertir les secondes en millisecondes
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, activeTab, refreshInterval])

  useEffect(() => {
    if (activeTab === 'logs' && token) {
      fetchLogs()
    }
  }, [activeTab, selectedService, token])

  const testService = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now()
    try {
      const response = await axios.get(service.url, { 
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`
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

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const serviceSlug = selectedService === 'all' 
        ? 'all'
        : selectedService.toLowerCase().replace(' service', '').replace(' ', '-')
      
      const endpoint = selectedService === 'all' 
        ? `${API_GATEWAY_URL}/api/v1/admin/logs/all?lines=${logLines}`
        : `${API_GATEWAY_URL}/api/v1/admin/logs/${serviceSlug}?lines=${logLines}`

      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      })

      if (response.data.success && response.data.logs) {
        // Les logs sont retournés comme un tableau de strings
        setLogs(Array.isArray(response.data.logs) ? response.data.logs : [])
      } else {
        setLogs([])
      }
    } catch (error: any) {
      console.error('Erreur chargement logs:', error)
      setLogs([`Erreur: ${error.message}`])
    } finally {
      setLoadingLogs(false)
    }
  }

  const onlineCount = services.filter(s => s.status === 'online').length
  const offlineCount = services.filter(s => s.status === 'offline').length
  const averageResponseTime = services
    .filter(s => s.responseTime)
    .reduce((acc, s) => acc + (s.responseTime || 0), 0) / (services.filter(s => s.responseTime).length || 1)

  return (
    <AdminLayout>
      <div>
        {/* Header avec onglets - Responsive */}
        <div className="mb-4 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4 md:mb-6">
            {/* Titre */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                🔧 Gestion des Services
              </h1>
              <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                Surveillance, tests et logs des microservices
              </p>
            </div>
            
            {/* Contrôles - En dessous sur mobile, à droite sur desktop */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
              {/* Auto-refresh */}
              <label className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Auto-refresh ({refreshInterval}s)
                </span>
              </label>
              
              {/* Contrôle de l'intervalle de refresh */}
              <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Intervalle:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1 text-xs sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100"
                >
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1 min</option>
                  <option value={120}>2 min</option>
                  <option value={300}>5 min</option>
                </select>
              </div>

              {/* Boutons d'action */}
              {activeTab === 'services' && (
                <button
                  onClick={testAllServices}
                  disabled={testing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
                >
                  {testing ? '🔄 Test en cours...' : '🧪 Tester tous'}
                </button>
              )}
              {activeTab === 'logs' && (
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
                >
                  {loadingLogs ? '🔄 Chargement...' : '🔄 Rafraîchir'}
                </button>
              )}
            </div>
          </div>

          {/* Onglets - Responsive */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8">
              {['services', 'logs'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-2 sm:py-3 md:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'services' && '🔧 Services'}
                  {tab === 'logs' && '📋 Logs'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'services' && (
          <>
            {/* Stats - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 md:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Services Total</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{services.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">En ligne</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Hors ligne</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-red-600">{offlineCount}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Temps moy.</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-600">{Math.round(averageResponseTime)}ms</p>
              </div>
            </div>

            {/* Services Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {services.map((service, index) => (
                <ServiceCard key={service.name} service={service} router={router} />
              ))}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3 md:space-y-4">
            {/* Contrôles - Responsive */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service :
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Tous les services</option>
                  {services.map(service => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lignes :
                </label>
                <input
                  type="number"
                  value={logLines}
                  onChange={(e) => setLogLines(parseInt(e.target.value))}
                  min="10"
                  max="1000"
                  step="50"
                  className="w-full sm:w-24 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Affichage des logs - Responsive */}
            <div className="bg-gray-900 rounded-lg shadow p-3 sm:p-4 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto font-mono text-xs sm:text-sm">
              {loadingLogs ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  Aucun log disponible
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-green-400 hover:bg-gray-800 px-2 py-1 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function ServiceCard({ service, router }: { service: ServiceStatus; router: any }) {
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

  // Mapping des noms de services vers leurs slugs (doit correspondre à SERVICE_CONFIGS dans la page de détail)
  const serviceNameToSlug: Record<string, string> = {
    'API Gateway': 'api-gateway',
    'Auth Service': 'auth',
    'Application Service': 'applications',
    'Company Service': 'companies',
    'Contact Service': 'contacts',
    'Interview Service': 'interviews',
    'Notification Service': 'notifications',
    'Dashboard Service': 'dashboard',
    'Call Service': 'calls',
    'Profile Service': 'profile',
    'Event Service': 'events',
    'FollowUp Service': 'followups',
    'Frontend': 'frontend',
  }

  const serviceSlug = serviceNameToSlug[service.name] || service.name
    .toLowerCase()
    .replace(' service', '')
    .replace(/\s+/g, '-')

  const handleClick = () => {
    router.push(`/backoffice/services/${serviceSlug}`)
  }

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-xl transition-all p-3 sm:p-4 md:p-6 cursor-pointer group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {service.name}
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400">→</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Port {service.port} • Cliquer pour les détails</p>
        </div>
        <div className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${statusColors[service.status]} whitespace-nowrap flex-shrink-0`}>
          {statusIcons[service.status]} {service.status.toUpperCase()}
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {service.responseTime && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600 dark:text-gray-400 truncate">Temps de réponse:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0 ml-2">{service.responseTime}ms</span>
          </div>
        )}
        {service.lastChecked && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600 dark:text-gray-400 truncate">Dernier test:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0 ml-2">{service.lastChecked}</span>
          </div>
        )}
      </div>

      {service.error && (
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-[10px] sm:text-xs text-red-800 dark:text-red-400 break-words">{service.error}</p>
        </div>
      )}
    </div>
  )
}

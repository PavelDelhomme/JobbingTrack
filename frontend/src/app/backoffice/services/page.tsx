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
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ServicesPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>('services')
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health`, port: 3000, status: 'testing' },
    { name: 'Auth Service', url: `http://localhost:3001/health`, port: 3001, status: 'testing' },
    { name: 'Application Service', url: `http://localhost:3002/health`, port: 3002, status: 'testing' },
    { name: 'Company Service', url: `http://localhost:3003/health`, port: 3003, status: 'testing' },
    { name: 'Contact Service', url: `http://localhost:3004/health`, port: 3004, status: 'testing' },
    { name: 'Interview Service', url: `http://localhost:3005/health`, port: 3005, status: 'testing' },
    { name: 'Notification Service', url: `http://localhost:3006/health`, port: 3006, status: 'testing' },
    { name: 'Dashboard Service', url: `http://localhost:3007/health`, port: 3007, status: 'testing' },
    { name: 'Call Service', url: `http://localhost:3008/health`, port: 3008, status: 'testing' },
    { name: 'Profile Service', url: `http://localhost:3009/health`, port: 3009, status: 'testing' },
    { name: 'Event Service', url: `http://localhost:3011/health`, port: 3011, status: 'testing' },
    { name: 'FollowUp Service', url: `http://localhost:3012/health`, port: 3012, status: 'testing' },
    { name: 'Frontend', url: `http://localhost:8080/health`, port: 8080, status: 'testing' }
  ])

  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10)

  // Vérification d'authentification
  if (!token || !user) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Accès refusé</p>
            <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  useEffect(() => {
    testAllServices()

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(testAllServices, refreshInterval * 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const testAllServices = async () => {
    setLoading(true)
    const updatedServices = [...services]

    for (let i = 0; i < updatedServices.length; i++) {
      await testService(updatedServices[i], i)
    }

    setServices(updatedServices)
    setLoading(false)
  }

  const testService = async (service: ServiceStatus, index: number) => {
    const startTime = Date.now()
    try {
      const response = await axios.get(service.url, {
        timeout: 5000,
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const responseTime = Date.now() - startTime

      services[index] = {
        ...service,
        status: 'online',
        responseTime,
        version: response.data.version || '1.0.0',
        error: undefined
      }
    } catch (error: any) {
      services[index] = {
        ...service,
        status: 'offline',
        error: error.message || 'Service inaccessible',
        responseTime: undefined,
        version: undefined
      }
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
                Surveillez l'état et les performances de tous vos microservices
              </p>
            </div>

            {/* Contrôles */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={testAllServices}
                disabled={loading}
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                {loading ? '🔄 Test...' : '🔄 Tester Tout'}
              </button>

              <label className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Auto ({refreshInterval}s)
                </span>
              </label>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-500 flex items-center justify-center text-base sm:text-xl">
                  📊
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{services.length}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">En ligne</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-500 flex items-center justify-center text-base sm:text-xl">
                  ✅
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{onlineCount}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Hors ligne</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-red-500 flex items-center justify-center text-base sm:text-xl">
                  ❌
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{offlineCount}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Temps moyen</span>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-500 flex items-center justify-center text-base sm:text-xl">
                  ⚡
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {averageResponseTime ? `${Math.round(averageResponseTime)}ms` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 md:mb-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'services'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Logs Système
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  onClick={() => router.push(`/backoffice/services/${service.name.toLowerCase().replace(' ', '-')}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {service.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Port {service.port}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        service.status === 'online'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {service.status === 'online' ? '✅ En ligne' : '❌ Hors ligne'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Temps de réponse:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
                        </span>
                      </div>

                      {service.version && (
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Version:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{service.version}</span>
                        </div>
                      )}

                      {service.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-400">
                          {service.error}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Cliquer pour détails</span>
                        <span className="flex items-center gap-1">
                          <span>👁️</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Logs Système
              </h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                <p>Logs système en cours d'implémentation...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
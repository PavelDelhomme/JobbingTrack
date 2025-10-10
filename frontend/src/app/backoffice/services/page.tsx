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

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ServicesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
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
      }, 30000) // Refresh toutes les 30 secondes
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

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
    // Mettre le service en mode "testing"
    setServices(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'testing' }
      return updated
    })

    // Tester le service
    const result = await testService(services[index])
    
    // Mettre à jour avec le résultat
    setServices(prev => {
      const updated = [...prev]
      updated[index] = result
      return updated
    })
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
        // Attendre 3 secondes puis tester le service
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
    // Double confirmation pour l'arrêt
    if (!confirm(`⚠️ ATTENTION : Arrêter le service "${serviceName}" ?\n\nCe service ne sera plus accessible jusqu'à son redémarrage manuel.`)) {
      return
    }

    if (!confirm(`❗ Êtes-vous VRAIMENT sûr de vouloir arrêter "${serviceName}" ?\n\nCette action nécessite une intervention manuelle pour redémarrer le service.`)) {
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
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 Services & Monitoring
            </h1>
            <p className="mt-2 text-gray-600">
              Surveillance et tests des microservices
            </p>
          </div>
          <div className="flex space-x-3">
            <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={testAllServices}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
            >
              {testing ? '🔄 Test en cours...' : '🧪 Tester tous les services'}
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Services Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{services.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">En ligne</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{onlineCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Hors ligne</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{offlineCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Temps moy. réponse</p>
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
    online: 'bg-green-100 text-green-800 border-green-200',
    offline: 'bg-red-100 text-red-800 border-red-200',
    testing: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const statusIcons = {
    online: '✅',
    offline: '❌',
    testing: '🔄'
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {service.name}
            </h3>
            <p className="text-sm text-gray-500">Port {service.port}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[service.status]}`}>
            {statusIcons[service.status]} {service.status.toUpperCase()}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          {service.responseTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Temps de réponse:</span>
              <span className="font-medium text-gray-900">{service.responseTime}ms</span>
            </div>
          )}
          {service.version && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium text-gray-900">{service.version}</span>
            </div>
          )}
          {service.lastChecked && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dernier test:</span>
              <span className="font-medium text-gray-900">{service.lastChecked}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {service.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800">{service.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={onTest}
              className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg transition-colors font-medium"
            >
              🧪 Tester
            </button>
            <button
              onClick={onRestart}
              className="flex-1 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm rounded-lg transition-colors font-medium"
              title="Redémarrer le service"
            >
              🔄 Redémarrer
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onStop}
              className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg transition-colors font-medium"
              title="Arrêter le service (confirmation requise)"
            >
              🛑 Arrêter
            </button>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-lg transition-colors flex items-center justify-center"
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



'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/features'
import { Activity, Server, Play, Square, RefreshCw, Cpu, MemoryStick, Network, Clock, AlertTriangle } from 'lucide-react'

const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014'

interface Service {
  name: string
  status: string
  health_status: string
  is_running: boolean
  is_healthy: boolean
  created: string
  ports: string
  image: string
  metrics: {
    cpu_percent: number
    memory_percent: number
    memory_usage_mb: number
    pids: number
  } | null
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCpu, setFilterCpu] = useState<string>('all')
  const [filterMemory, setFilterMemory] = useState<string>('all')

  const loadServices = async () => {
    try {
      const response = await fetch(`${METRICS_URL}/api/v1/docker/services/all`)
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Erreur chargement services:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
    const interval = setInterval(loadServices, 10000) // Rafraîchir toutes les 10 secondes
    return () => clearInterval(interval)
  }, [])

  // Filtrage des services
  const filteredServices = services.filter(service => {
    // Filtre par état
    if (filterStatus === 'running' && !service.is_running) return false
    if (filterStatus === 'stopped' && service.is_running) return false
    if (filterStatus === 'unhealthy' && (service.is_healthy || !service.is_running)) return false

    // Filtre par CPU
    if (filterCpu !== 'all' && service.metrics) {
      const cpu = service.metrics.cpu_percent
      if (filterCpu === 'high' && cpu <= 80) return false
      if (filterCpu === 'medium' && (cpu < 40 || cpu > 80)) return false
      if (filterCpu === 'low' && cpu >= 40) return false
    }

    // Filtre par Mémoire
    if (filterMemory !== 'all' && service.metrics) {
      const memory = service.metrics.memory_percent
      if (filterMemory === 'high' && memory <= 80) return false
      if (filterMemory === 'medium' && (memory < 40 || memory > 80)) return false
      if (filterMemory === 'low' && memory >= 40) return false
    }

    return true
  })

  const runningServices = services.filter(s => s.is_running)
  const stoppedServices = services.filter(s => !s.is_running)
  const unhealthyServices = services.filter(s => s.is_running && !s.is_healthy)

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Services JobbingTrack
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestion et monitoring des services
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadServices}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Services</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{services.length}</p>
              </div>
              <Server className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Services en cours</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{runningServices.length}</p>
              </div>
              <Play className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Services unhealthy</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{unhealthyServices.length}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Services arrêtés</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{stoppedServices.length}</p>
              </div>
              <Square className="h-12 w-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtres :</span>
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous les états</option>
              <option value="running">Actifs</option>
              <option value="stopped">Arrêtés</option>
              <option value="unhealthy">Non sains</option>
            </select>
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
              value={filterCpu}
              onChange={(e) => setFilterCpu(e.target.value)}
            >
              <option value="all">Tous les CPU</option>
              <option value="high">CPU élevé (&gt; 80%)</option>
              <option value="medium">CPU moyen (40-80%)</option>
              <option value="low">CPU faible (&lt; 40%)</option>
            </select>
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
              value={filterMemory}
              onChange={(e) => setFilterMemory(e.target.value)}
            >
              <option value="all">Toutes les mémoires</option>
              <option value="high">Mémoire élevée (&gt; 80%)</option>
              <option value="medium">Mémoire moyenne (40-80%)</option>
              <option value="low">Mémoire faible (&lt; 40%)</option>
            </select>
            {(filterStatus !== 'all' || filterCpu !== 'all' || filterMemory !== 'all') && (
              <button
                onClick={() => {
                  setFilterStatus('all')
                  setFilterCpu('all')
                  setFilterMemory('all')
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Liste des services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Liste des Services ({filteredServices.length} / {services.length})
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CPU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mémoire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    PIDs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredServices.map((service) => (
                  <tr 
                    key={service.name} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => router.push(`/backoffice/services/${service.name.replace('jobbingtrack-', '')}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Server className="h-5 w-5 text-blue-500 mr-2" />
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {service.name.replace('jobbingtrack-', '')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* État Docker (running, stopped, etc.) */}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          service.is_running
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {service.is_running ? 'running' : service.status}
                        </span>
                        {/* Health status Docker (none, healthy, unhealthy, starting) */}
                        {service.is_running && service.health_status && service.health_status !== 'none' && (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            service.health_status === 'healthy'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : service.health_status === 'unhealthy'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : service.health_status === 'starting'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {service.health_status}
                          </span>
                        )}
                        {/* Afficher "none" seulement si le service est running mais sans healthcheck */}
                        {service.is_running && (!service.health_status || service.health_status === 'none') && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            none
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {service.metrics ? (
                        <div className="flex items-center gap-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          {service.metrics.cpu_percent.toFixed(2)}%
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {service.metrics ? (
                        <div className="flex items-center gap-1">
                          <MemoryStick className="h-4 w-4 text-green-500" />
                          {service.metrics.memory_usage_mb.toFixed(0)} MB ({service.metrics.memory_percent.toFixed(1)}%)
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {service.metrics?.pids || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {service.ports || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {!service.is_running ? (
                          <button
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const serviceName = service.name.replace('jobbingtrack-', '');
                              try {
                                const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/start`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await response.json();
                                if (data.success) {
                                  setTimeout(() => loadServices(), 1000);
                                } else {
                                  alert(`Erreur: ${data.error}`);
                                }
                              } catch (error) {
                                console.error('Erreur démarrage service:', error);
                                alert('Erreur lors du démarrage du service');
                              }
                            }}
                            title="Démarrer le service"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Êtes-vous sûr de vouloir arrêter ${service.name.replace('jobbingtrack-', '')} ?`)) {
                                return;
                              }
                              const serviceName = service.name.replace('jobbingtrack-', '');
                              try {
                                const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/stop`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await response.json();
                                if (data.success) {
                                  setTimeout(() => loadServices(), 1000);
                                } else {
                                  alert(`Erreur: ${data.error}`);
                                }
                              } catch (error) {
                                console.error('Erreur arrêt service:', error);
                                alert('Erreur lors de l\'arrêt du service');
                              }
                            }}
                            title="Arrêter le service"
                          >
                            <Square className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Services arrêtés */}
        {stoppedServices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Square className="h-5 w-5 text-red-600" />
              Services arrêtés ({stoppedServices.length})
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      État
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stoppedServices.map((service) => (
                    <tr key={service.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Server className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {service.name.replace('jobbingtrack-', '')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {service.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {service.created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {service.image}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const serviceName = service.name.replace('jobbingtrack-', '');
                            try {
                              const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/start`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                              });
                              const data = await response.json();
                              if (data.success) {
                                // Rafraîchir la liste après 1 seconde
                                setTimeout(() => loadServices(), 1000);
                              } else {
                                alert(`Erreur: ${data.error}`);
                              }
                            } catch (error) {
                              console.error('Erreur démarrage service:', error);
                              alert('Erreur lors du démarrage du service');
                            }
                          }}
                          title="Démarrer le service"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dernière mise à jour */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4 inline mr-1" />
          Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </AdminLayout>
  )
}


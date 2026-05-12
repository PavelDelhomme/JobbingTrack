'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/features'
import { Activity, Server, Play, Square, RefreshCw, Cpu, MemoryStick, Network, Clock, AlertTriangle, RotateCw, ArrowUp, ArrowDown, ArrowUpDown, FileText } from 'lucide-react'
import Link from 'next/link'

// Une seule source : metrics-aggregator (récupère les données depuis monitoring-c, persiste en BDD)
const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004'

// Services critiques qui ne doivent pas être redémarrés/arrêtés depuis l'interface
const CRITICAL_SERVICES = [
  'postgres',
  'redis',
  'api-gateway',
  'frontend',
  'metrics-aggregator' // Critique car nécessaire pour gérer les autres services
]

/** A1d : même « promesse » que la page détail service (historique + sources), sans charger Recharts sur la liste. */
const SERVICE_ROW_DETAIL_HINT =
  'Ouvre le détail du service : graphes d’historique (CPU, mémoire, réseau, Block I/O), encart sources (session / fichiers / BDD), logs et raccourcis.'

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
  const [initialLoad, setInitialLoad] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCpu, setFilterCpu] = useState<string>('all')
  const [filterMemory, setFilterMemory] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const loadServices = async (isInitial = false) => {
    try {
      // Pour le chargement initial, afficher le loading
      if (isInitial) {
        setLoading(true)
      }
      
      // Timeout très long pour le chargement initial (60s), plus court pour les rafraîchissements (20s)
      // Le backend peut prendre du temps avec tous les health checks
      const timeout = isInitial ? 60000 : 20000
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      let data: { services?: Service[] } | null = null

      const mapAggToServices = (list: any[]): Service[] =>
        list.map((s: any) => ({
          name: (s.name || '').replace(/^jobbingtrack-/, ''),
          status: s.status || (s.is_running ? 'running' : 'stopped'),
          health_status: s.health_status || (s.is_healthy ? 'healthy' : 'unknown'),
          is_running: Boolean(s.is_running),
          is_healthy: Boolean(s.is_healthy),
          created: s.created || '',
          ports: s.ports || '',
          image: s.image || '',
          metrics: s.metrics ? {
            cpu_percent: Number(s.metrics.cpu_percent) || 0,
            memory_percent: Number(s.metrics.memory_percent) || 0,
            memory_usage_mb: Number(s.metrics.memory_usage_mb) || 0,
            pids: s.metrics.pids ?? null
          } : null
        }))

      try {
        const res = await fetch(`${METRICS_URL}/api/v1/docker/services/all`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const json = await res.json()
          const list = json.services || []
          if (list.length > 0) {
            data = { services: mapAggToServices(list) }
          }
        }
      } catch (_) {
        // continuer
      }

      if (!data?.services?.length) {
        try {
          const res2 = await fetch(`${METRICS_URL}/api/v1/metrics`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          })
          if (res2.ok) {
            const json = await res2.json()
            const servicesList = json.servicesList || (json.services ? Object.values(json.services) : [])
            const containers = json.containers && typeof json.containers === 'object' ? Object.entries(json.containers) : []
            if (servicesList.length > 0) {
              data = { services: mapAggToServices(servicesList) }
            } else if (containers.length > 0) {
              data = {
                services: mapAggToServices(containers.map(([name, m]: [string, any]) => ({
                  name: name.replace(/^jobbingtrack-/, ''),
                  status: m.status || 'running',
                  health_status: m.health?.status || 'unknown',
                  is_running: m.status !== 'stopped',
                  is_healthy: m.health?.status === 'healthy',
                  created: '',
                  ports: '',
                  image: '',
                  metrics: m.metrics || (m.cpu ? { cpu_percent: m.cpu.percentage || 0, memory_percent: m.memory?.percentage || 0, memory_usage_mb: m.memory?.usage || 0, pids: null } : null)
                })))
              }
            }
          }
        } catch (_) {
          // garder data vide
        }
      }

      clearTimeout(timeoutId)
      
      if (data && data.services) {
        // Charger progressivement : d'abord les services actifs, puis les autres
        const loadedServices = data.services || []
        
        // Toujours afficher les services dès qu'on les reçoit, même partiellement
        if (loadedServices.length > 0) {
          if (isInitial) {
            // Afficher d'abord les services actifs pour un chargement progressif
            const runningServices = loadedServices.filter((s: Service) => s.is_running)
            if (runningServices.length > 0) {
              setServices(runningServices)
              setLastUpdate(new Date())
              setLoading(false)
              setInitialLoad(false)
              
              // Puis charger tous les services après un court délai
              setTimeout(() => {
                setServices(loadedServices)
                setLastUpdate(new Date())
              }, 500)
            } else {
              // Si pas de services actifs, afficher tous les services directement
              setServices(loadedServices)
              setLastUpdate(new Date())
              setLoading(false)
              setInitialLoad(false)
            }
          } else {
            // Pour les rafraîchissements, mettre à jour directement
            setServices(loadedServices)
            setLastUpdate(new Date())
          }
        } else {
          // Aucun service trouvé
          if (isInitial) {
            setLoading(false)
            setInitialLoad(false)
            setServices([])
          }
        }
      } else {
        // En cas d'erreur HTTP, ne pas bloquer l'interface
        if (isInitial) {
          setLoading(false)
          setInitialLoad(false)
          // Garder les services déjà chargés si disponibles
          if (services.length === 0) {
            setServices([])
          }
        }
      }
    } catch (error: any) {
      // Gérer les erreurs de timeout et réseau
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        // Timeout : essayer de récupérer les services déjà chargés
        if (isInitial) {
          // Si on a déjà des services, les garder
          if (services.length === 0) {
            // Pas de services chargés, réessayer une fois après un délai
            setTimeout(() => {
              loadServices(true).catch(() => {
                setLoading(false)
                setInitialLoad(false)
                setServices([])
              })
            }, 2000)
          } else {
            // On a déjà des services, arrêter le loading
            setLoading(false)
            setInitialLoad(false)
          }
        }
        // Ne pas logger les timeouts pour éviter le spam
      } else {
        // Autres erreurs : logger uniquement en développement
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur chargement services:', error)
        }
        // En cas d'erreur, ne pas bloquer l'interface
        if (isInitial) {
          setLoading(false)
          setInitialLoad(false)
          // Garder les services déjà chargés si disponibles
          if (services.length === 0) {
            setServices([])
          }
        }
      }
    }
  }

  useEffect(() => {
    loadServices(true) // Chargement initial
    // Rafraîchir toutes les 20 secondes (plus long pour éviter les timeouts)
    // ✅ OPTIMISATION : Arrêter le polling si la page n'est pas visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        loadServices(false)
      }
    }, 30000) // Augmenté de 20s à 30s pour réduire CPU
    return () => clearInterval(interval)
  }, [])

  // Fonction de tri
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Inverser la direction si on clique sur la même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nouvelle colonne, trier par ordre croissant
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Fonction pour obtenir l'icône de tri
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-blue-500" />
      : <ArrowDown className="h-4 w-4 ml-1 text-blue-500" />
  }

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

  // Appliquer le tri
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'service':
        aValue = a.name.replace('jobbingtrack-', '').toLowerCase()
        bValue = b.name.replace('jobbingtrack-', '').toLowerCase()
        break
      case 'cpu':
        aValue = a.metrics?.cpu_percent ?? 0
        bValue = b.metrics?.cpu_percent ?? 0
        break
      case 'memory':
        aValue = a.metrics?.memory_percent ?? 0
        bValue = b.metrics?.memory_percent ?? 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const runningServices = services.filter(s => s.is_running)
  const stoppedServices = services.filter(s => !s.is_running)
  const unhealthyServices = services.filter(s => s.is_running && !s.is_healthy)

  // Afficher un chargement progressif : d'abord les stats, puis les services
  if (initialLoad && loading) {
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
                Chargement des services... (cela peut prendre jusqu'à 60 secondes)
              </p>
            </div>
          </div>
          
          {/* Stats en chargement */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          
          {/* Indicateur de chargement */}
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Chargement des services en cours...
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
              Cela peut prendre jusqu'à 60 secondes selon le nombre de services
            </p>
          </div>
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
            {/* ✅ NOUVEAU : Lien vers Services & Logs */}
            <Link
              href="/b4ck0ff1ce/services/logs"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Services & Logs
            </Link>
            <button
              onClick={() => loadServices()}
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
            Liste des Services ({sortedServices.length} / {services.length})
          </h2>
          
          {services.length === 0 && !loading && (
            <div className="text-center py-12">
              <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                Aucun service disponible
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                Les services peuvent prendre quelques instants à charger. Vérifiez que le service metrics-aggregator est démarré.
              </p>
              <button
                onClick={() => loadServices(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          )}
          
          {services.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('service')}
                  >
                    <div className="flex items-center">
                      Service
                      {getSortIcon('service')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    État
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('cpu')}
                  >
                    <div className="flex items-center">
                      CPU
                      {getSortIcon('cpu')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('memory')}
                  >
                    <div className="flex items-center">
                      Mémoire
                      {getSortIcon('memory')}
                    </div>
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
                {sortedServices.map((service) => (
                  <tr 
                    key={service.name} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    title={SERVICE_ROW_DETAIL_HINT}
                    onClick={() => router.push(`/b4ck0ff1ce/services/${service.name.replace('jobbingtrack-', '')}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Server className="h-5 w-5 text-blue-500 mr-2 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {service.name.replace('jobbingtrack-', '')}
                          </div>
                          {service.metrics != null ? (
                            <div
                              className="mt-1 max-w-[9rem]"
                              title="CPU instantané (agrégateur). Courbe complète et sources d’historique sur la page détail."
                              aria-hidden
                            >
                              <div className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, service.metrics.cpu_percent))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}
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
                        {/* Health status Docker - Ne pas afficher "none" si le service est running */}
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
                        {/* Ne pas afficher "none" - si le service est running sans healthcheck, c'est normal */}
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
                        {/* ✅ NOUVEAU : Bouton "Voir les logs" */}
                        <Link
                          href={`/b4ck0ff1ce/services/logs?service=${encodeURIComponent(service.name.replace('jobbingtrack-', ''))}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Logs
                        </Link>
                        {(() => {
                          const serviceName = service.name.replace('jobbingtrack-', '');
                          const isCritical = CRITICAL_SERVICES.includes(serviceName);
                          
                          if (!service.is_running) {
                            return (
                              <button
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être démarré depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument le démarrer.`);
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/start`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(10000)
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} démarré avec succès !`);
                                      setTimeout(() => loadServices(false), 1000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert('Timeout: Le service met trop de temps à répondre');
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert('Erreur de connexion : Le service metrics-aggregator pourrait être indisponible. Vérifiez qu\'il est démarré.');
                                    } else {
                                      console.error('Erreur démarrage service:', error);
                                      alert(`Erreur lors du démarrage du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Démarrage désactivé" : "Démarrer le service"}
                                disabled={isCritical}
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            );
                          }
                          
                          return (
                            <>
                              <button
                                className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être redémarré depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument le redémarrer.`);
                                    return;
                                  }
                                  
                                  if (!confirm(`Êtes-vous sûr de vouloir redémarrer ${serviceName} ?\n\nLe service sera temporairement indisponible pendant le redémarrage.`)) {
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/restart`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(15000) // 15 secondes pour le redémarrage
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} redémarré avec succès !\n\nLa liste des services sera rafraîchie dans quelques secondes.`);
                                      setTimeout(() => loadServices(false), 2000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert(`⏳ Le redémarrage prend plus de temps que prévu.\n\nLe service ${serviceName} est peut-être en cours de redémarrage. La liste sera rafraîchie automatiquement.`);
                                      setTimeout(() => loadServices(false), 3000);
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert(`⚠️ Le service ${serviceName} est peut-être en cours de redémarrage.\n\nLa liste des services sera rafraîchie automatiquement dans quelques secondes.`);
                                      setTimeout(() => loadServices(false), 5000);
                                    } else {
                                      console.error('Erreur redémarrage service:', error);
                                      alert(`Erreur lors du redémarrage du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Redémarrage désactivé" : "Redémarrer le service"}
                                disabled={isCritical}
                              >
                                <RotateCw className="h-4 w-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être arrêté depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument l'arrêter.`);
                                    return;
                                  }
                                  
                                  if (!confirm(`Êtes-vous sûr de vouloir arrêter ${serviceName} ?\n\nLe service sera indisponible jusqu'à son redémarrage.`)) {
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/stop`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(10000)
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} arrêté avec succès !`);
                                      setTimeout(() => loadServices(false), 1000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert('Timeout: Le service met trop de temps à répondre');
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert('Erreur de connexion : Le service metrics-aggregator pourrait être indisponible. Vérifiez qu\'il est démarré.');
                                    } else {
                                      console.error('Erreur arrêt service:', error);
                                      alert(`Erreur lors de l'arrêt du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Arrêt désactivé" : "Arrêter le service"}
                                disabled={isCritical}
                              >
                                <Square className="h-4 w-4" />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
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
                        {(() => {
                          const serviceName = service.name.replace('jobbingtrack-', '');
                          const isCritical = CRITICAL_SERVICES.includes(serviceName);
                          
                          if (!service.is_running) {
                            return (
                              <button
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être démarré depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument le démarrer.`);
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/start`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(10000)
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} démarré avec succès !`);
                                      setTimeout(() => loadServices(false), 1000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert('Timeout: Le service met trop de temps à répondre');
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert('Erreur de connexion : Le service metrics-aggregator pourrait être indisponible. Vérifiez qu\'il est démarré.');
                                    } else {
                                      console.error('Erreur démarrage service:', error);
                                      alert(`Erreur lors du démarrage du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Démarrage désactivé" : "Démarrer le service"}
                                disabled={isCritical}
                              >
                                <Play className="h-5 w-5" />
                              </button>
                            );
                          }
                          
                          return (
                            <div className="flex gap-2">
                              <button
                                className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être redémarré depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument le redémarrer.`);
                                    return;
                                  }
                                  
                                  if (!confirm(`Êtes-vous sûr de vouloir redémarrer ${serviceName} ?\n\nLe service sera temporairement indisponible pendant le redémarrage.`)) {
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/restart`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(15000)
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} redémarré avec succès !\n\nLa liste des services sera rafraîchie dans quelques secondes.`);
                                      setTimeout(() => loadServices(false), 2000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert(`⏳ Le redémarrage prend plus de temps que prévu.\n\nLe service ${serviceName} est peut-être en cours de redémarrage. La liste sera rafraîchie automatiquement.`);
                                      setTimeout(() => loadServices(false), 3000);
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert(`⚠️ Le service ${serviceName} est peut-être en cours de redémarrage.\n\nLa liste des services sera rafraîchie automatiquement dans quelques secondes.`);
                                      setTimeout(() => loadServices(false), 5000);
                                    } else {
                                      console.error('Erreur redémarrage service:', error);
                                      alert(`Erreur lors du redémarrage du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Redémarrage désactivé" : "Redémarrer le service"}
                                disabled={isCritical}
                              >
                                <RotateCw className="h-5 w-5" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  if (isCritical) {
                                    alert(`⚠️ Ce service est critique et ne peut pas être arrêté depuis l'interface pour des raisons de sécurité.\n\nService: ${serviceName}\n\nUtilisez la ligne de commande si vous devez absolument l'arrêter.`);
                                    return;
                                  }
                                  
                                  if (!confirm(`Êtes-vous sûr de vouloir arrêter ${serviceName} ?\n\nLe service sera indisponible jusqu'à son redémarrage.`)) {
                                    return;
                                  }
                                  
                                  try {
                                    const response = await fetch(`${METRICS_URL}/api/v1/docker/service/${serviceName}/stop`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      signal: AbortSignal.timeout(10000)
                                    });
                                    
                                    if (!response.ok) {
                                      const errorText = await response.text();
                                      let errorMessage = `Erreur ${response.status}`;
                                      try {
                                        const errorData = JSON.parse(errorText);
                                        errorMessage = errorData.error || errorData.message || errorMessage;
                                      } catch {
                                        errorMessage = errorText.includes('<!DOCTYPE') 
                                          ? 'Service metrics-aggregator non disponible ou route introuvable'
                                          : errorText || errorMessage;
                                      }
                                      alert(`Erreur: ${errorMessage}`);
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                      alert(`✅ Service ${serviceName} arrêté avec succès !`);
                                      setTimeout(() => loadServices(false), 1000);
                                    } else {
                                      alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
                                    }
                                  } catch (error: any) {
                                    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                                      alert('Timeout: Le service met trop de temps à répondre');
                                    } else if (
                                      error.message === 'Failed to fetch' || 
                                      error.message?.includes('ERR_EMPTY_RESPONSE') ||
                                      error.message?.includes('net::ERR_') ||
                                      error.name === 'TypeError'
                                    ) {
                                      alert('Erreur de connexion : Le service metrics-aggregator pourrait être indisponible. Vérifiez qu\'il est démarré.');
                                    } else {
                                      console.error('Erreur arrêt service:', error);
                                      alert(`Erreur lors de l'arrêt du service: ${error.message || 'Erreur inconnue'}`);
                                    }
                                  }
                                }}
                                title={isCritical ? "Service critique - Arrêt désactivé" : "Arrêter le service"}
                                disabled={isCritical}
                              >
                                <Square className="h-5 w-5" />
                              </button>
                            </div>
                          );
                        })()}
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


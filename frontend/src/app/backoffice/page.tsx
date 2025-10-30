'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/features'
import MetricsErrorBoundary from '@/components/MetricsErrorBoundary'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'
import { Activity, TrendingUp, Users, Building2, FileText, Phone, Calendar, Settings, Database, Shield, Zap, Clock, X, Cpu, MemoryStick } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function BackofficePage() {
  const { user, loading, isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalCompanies: 0,
    totalInterviews: 0,
    totalUsers: 0,
    activeUsers: 0,
    recentApplications: 0,
    totalContacts: 0,
    totalCalls: 0,
    totalFollowups: 0,
    totalEvents: 0,
    systemHealth: 100,
    averageResponseTime: 0,
    errorRate: 0,
    activeSessions: 0,
    recentErrors: 0,
    securityAlerts: 0,
    codeQuality: 85,
    vulnerabilities: 0,
    deploymentStatus: 'success'
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy')
  const [showServicesPopup, setShowServicesPopup] = useState(false)
  const [systemMetrics, setSystemMetrics] = useState<any>(null)
  const [containerMetrics, setContainerMetrics] = useState<any>(null)
  const [loadingSystemMetrics, setLoadingSystemMetrics] = useState(false)
  const [servicesWithMetrics, setServicesWithMetrics] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<{[key: string]: any}>({})

  const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  // Charger les maintenances
  const loadMaintenances = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.data.success) {
        const maintenanceMap: {[key: string]: any} = {}
        response.data.maintenances.forEach((m: any) => {
          maintenanceMap[m.serviceName] = m
        })
        setMaintenances(maintenanceMap)
      }
    } catch (error) {
      console.error('Erreur chargement maintenances:', error)
    }
  }

  // Activer la maintenance pour un service
  const activateMaintenance = async (serviceId: string) => {
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceId}/activate`, {
        message: `Maintenance activée depuis le dashboard`
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await loadMaintenances()
    } catch (error) {
      console.error('Erreur activation maintenance:', error)
    }
  }

  // Désactiver la maintenance pour un service
  const deactivateMaintenance = async (serviceId: string) => {
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceId}/deactivate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await loadMaintenances()
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error)
    }
  }

  // Liste des services disponibles
  const services = [
    {
      id: 'auth-service',
      name: 'Service d\'Authentification',
      description: 'Gestion des utilisateurs et authentification',
      icon: '🔐',
      status: 'running',
      route: '/backoffice/services/auth-service'
    },
    {
      id: 'application-service',
      name: 'Service des Candidatures',
      description: 'Gestion des candidatures et processus',
      icon: '📝',
      status: 'running',
      route: '/backoffice/services/application-service'
    },
    {
      id: 'company-service',
      name: 'Service des Entreprises',
      description: 'Gestion des entreprises et recrutement',
      icon: '🏢',
      status: 'running',
      route: '/backoffice/services/company-service'
    },
    {
      id: 'contact-service',
      name: 'Service des Contacts',
      description: 'Gestion des contacts et réseaux',
      icon: '👥',
      status: 'running',
      route: '/backoffice/services/contact-service'
    },
    {
      id: 'interview-service',
      name: 'Service des Entretiens',
      description: 'Gestion des entretiens et calendrier',
      icon: '📅',
      status: 'running',
      route: '/backoffice/services/interview-service'
    },
    {
      id: 'call-service',
      name: 'Service des Appels',
      description: 'Gestion des appels et communications',
      icon: '📞',
      status: 'running',
      route: '/backoffice/services/call-service'
    },
    {
      id: 'notification-service',
      name: 'Service de Notifications',
      description: 'Gestion des notifications et alertes',
      icon: '🔔',
      status: 'running',
      route: '/backoffice/services/notification-service'
    },
    {
      id: 'dashboard-service',
      name: 'Service du Tableau de Bord',
      description: 'Gestion des métriques et analytics',
      icon: '📊',
      status: 'running',
      route: '/backoffice/services/dashboard-service'
    },
    {
      id: 'workflow-service',
      name: 'Service de Workflow',
      description: 'Gestion des workflows automatisés',
      icon: '⚙️',
      status: 'running',
      route: '/backoffice/services/workflow-service'
    },
    {
      id: 'event-service',
      name: 'Service des Événements',
      description: 'Gestion des événements et rappels',
      icon: '🎯',
      status: 'running',
      route: '/backoffice/services/event-service'
    },
    {
      id: 'followup-service',
      name: 'Service de Relances',
      description: 'Gestion des relances automatiques',
      icon: '📧',
      status: 'running',
      route: '/backoffice/services/followup-service'
    },
    {
      id: 'profile-service',
      name: 'Service des Profils',
      description: 'Gestion des profils utilisateurs',
      icon: '👤',
      status: 'running',
      route: '/backoffice/services/profile-service'
    }
  ]

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Charger les métriques système
  useEffect(() => {
    const loadSystemMetrics = async () => {
      try {
        setLoadingSystemMetrics(true)
        
        // Récupérer toutes les métriques depuis le service centralisé
        const allMetrics = await centralMetricsService.fetchMetrics()
        
        if (allMetrics) {
          setSystemMetrics(allMetrics.system || null)
          setContainerMetrics(allMetrics.containers || null)
        } else {
          // Fallback vers les métriques individuelles
          const systemMetricsData = await centralMetricsService.getSystemMetrics()
          setSystemMetrics(systemMetricsData)
          
          const containerMetricsData = await centralMetricsService.getContainerMetrics()
          setContainerMetrics(containerMetricsData)
        }
      } catch (error) {
        console.error('Erreur chargement métriques système:', error)
      } finally {
        setLoadingSystemMetrics(false)
      }
    }

    if (isAuthenticated) {
      loadSystemMetrics()
      // Actualiser toutes les 30 secondes
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadSystemMetrics()
        }
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        // Récupérer les statistiques depuis les services
        const [
          applicationsResponse,
          usersResponse,
          companiesResponse
        ] = await Promise.all([
          applicationService.getAll().catch(() => ({ data: { total: 0, applications: [] } })),
          authService.getAllUsers().catch(() => ({ data: { users: [] } })),
          companyService.getAll().catch(() => ({ data: { companies: [] } }))
        ])

        // Calculer les statistiques
        const totalApplications = applicationsResponse.data.total || 0
        const totalUsers = usersResponse.data.users?.length || 0
        const totalCompanies = companiesResponse.data.companies?.length || 0

        setStats(prev => ({
          ...prev,
          totalApplications,
          totalUsers,
          totalCompanies,
          activeUsers: totalUsers,
          systemHealth: 100,
          deploymentStatus: 'success'
        }))
      } catch (error) {
        console.error('Erreur chargement statistiques:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  // Charger les services avec leurs métriques
  useEffect(() => {
    const loadServicesWithMetrics = async () => {
      try {
        const servicesData = await centralMetricsService.getAllServices()
        if (servicesData && servicesData.length > 0) {
          const updatedServices = services.map(service => {
            const metricsData = servicesData.find((s: any) => 
              s.name?.includes(service.id) || s.id === service.id
            )
            return {
              ...service,
              status: metricsData?.status === 'running' ? 'running' : 'stopped',
              metrics: metricsData,
              uptime: metricsData?.status === 'running' ? 'En ligne' : 'Hors ligne'
            }
          })
          setServicesWithMetrics(updatedServices)
        } else {
          setServicesWithMetrics(services)
        }
      } catch (error) {
        console.error('Erreur chargement services:', error)
        setServicesWithMetrics(services)
      }
    }

    loadServicesWithMetrics()
    const interval = setInterval(loadServicesWithMetrics, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  // Charger les maintenances au démarrage
  useEffect(() => {
    if (isAuthenticated && token) {
      loadMaintenances()
    }
  }, [isAuthenticated, token])

  // Fonction pour générer le statut des services (simulé pour l'instant)
  const generateServiceStatus = () => {
    const services = [
      { name: 'Auth Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Application Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Company Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Contact Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Interview Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Notification Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Dashboard Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Call Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Profile Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Event Service', status: 'running', uptime: '15j 4h 23m' },
      { name: 'Followup Service', status: 'running', uptime: '15j 4h 23m' }
    ]

    return services
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-blue-600">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Header amélioré */}
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-100 break-words">
                Bienvenue, {user?.firstName} ! 👋
              </h1>
              <p className="mt-2 text-base md:text-lg text-blue-600 dark:text-blue-400">
                Vue d'ensemble de votre plateforme JobbingTrack
              </p>
            </div>

            {/* Boutons d'action rapide */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/backoffice/analytics')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setShowServicesPopup(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Activity className="h-4 w-4" />
                Services
              </button>
            </div>
          </div>
        </div>

        {/* Métriques principales en grille - Version administrative */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <MetricCard
            title="Sessions Actives"
            value={stats.activeUsers}
            subtitle={`${stats.totalUsers} utilisateurs`}
            icon={<Users className="h-6 w-6" />}
            color="green"
            href="/backoffice/users"
          />
          <MetricCard
            title="Erreurs Récentes"
            value={stats.recentErrors}
            subtitle="24h dernières"
            icon={<Shield className="h-6 w-6" />}
            color="red"
            href="/backoffice/logs"
          />
          <MetricCard
            title="Santé Système"
            value={`${stats.systemHealth}%`}
            subtitle="Disponibilité"
            icon={<Zap className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Temps Réponse"
            value={`${stats.averageResponseTime}ms`}
            subtitle="Moyen"
            icon={<Clock className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="CPU"
            value={systemMetrics && systemMetrics.cpu && typeof systemMetrics.cpu.usage === 'number' ? `${systemMetrics.cpu.usage.toFixed(1)}%` : loadingSystemMetrics ? '...' : 'N/A'}
            subtitle={systemMetrics?.cpu?.cores ? `${systemMetrics.cpu.cores} coeurs` : 'Chargement...'}
            icon={<Cpu className="h-6 w-6" />}
            color={systemMetrics?.cpu?.usage > 80 ? "red" : systemMetrics?.cpu?.usage > 60 ? "yellow" : "green"}
          />
          <MetricCard
            title="Mémoire"
            value={systemMetrics && systemMetrics.memory && typeof systemMetrics.memory.usage === 'number' ? `${systemMetrics.memory.usage.toFixed(1)}%` : loadingSystemMetrics ? '...' : 'N/A'}
            subtitle={systemMetrics?.memory?.total ? `${systemMetrics.memory.total} MB` : 'Chargement...'}
            icon={<MemoryStick className="h-6 w-6" />}
            color={systemMetrics?.memory?.usage > 85 ? "red" : systemMetrics?.memory?.usage > 70 ? "yellow" : "green"}
          />
        </div>

        {/* Métriques système principales */}
        <MetricsErrorBoundary>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              État du système
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">📊 Prometheus</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${!loadingSystemMetrics && systemMetrics ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`text-sm ${!loadingSystemMetrics && systemMetrics ? 'text-green-600' : 'text-yellow-600'}`}>
                {!loadingSystemMetrics && systemMetrics ? 'Connecté' : loadingSystemMetrics ? 'Chargement...' : 'Déconnecté'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {systemMetrics?.containersAggregate?.cpu?.percent || systemMetrics?.cpu?.usage || 'N/A'}
                {(systemMetrics?.containersAggregate?.cpu?.percent || systemMetrics?.cpu?.usage !== 'N/A') && '%'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">CPU</div>
              {systemMetrics?.containersAggregate && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {systemMetrics.containersAggregate.cpu.containers} conteneurs
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {systemMetrics?.containersAggregate?.memory?.percent || systemMetrics?.memory?.usage || 'N/A'}
                {(systemMetrics?.containersAggregate?.memory?.percent || systemMetrics?.memory?.usage !== 'N/A') && '%'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire</div>
              {systemMetrics?.containersAggregate && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {systemMetrics.containersAggregate.memory.used}MB / {systemMetrics.containersAggregate.memory.limit}MB
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemMetrics && systemMetrics.load && systemMetrics.load.average !== 'N/A' && systemMetrics.load.average !== null ? (typeof systemMetrics.load.average === 'number' ? systemMetrics.load.average.toFixed(2) : systemMetrics.load.average) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Charge</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {containerMetrics ? Object.keys(containerMetrics).length : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Conteneurs</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {containerMetrics && Object.keys(containerMetrics).length > 0 ? '✅' : '❌'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {services ? services.length : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {services && services.length > 0 ? '🟢' : '🔴'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemMetrics && systemMetrics.disk && systemMetrics.disk.length > 0 && systemMetrics.disk[0].usage !== 'N/A' ? `${systemMetrics.disk[0].usage}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Disque</div>
              {systemMetrics && systemMetrics.disk && systemMetrics.disk.length > 0 && systemMetrics.disk[0].usage !== 'N/A' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {systemMetrics.disk[0].usage > 80 ? '🔴' : '✅'}
                </div>
              )}
            </div>
          </div>

          {/* Métriques des conteneurs JobbingTrack */}
          {systemMetrics && systemMetrics.jobbingtrack && systemMetrics.jobbingtrack.containers && (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                📦 Conteneurs JobbingTrack ({systemMetrics.jobbingtrack.containers.count})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">CPU Moyen</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {systemMetrics.jobbingtrack.containers.cpu.averagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.cpu.averagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total: {systemMetrics.jobbingtrack.containers.cpu.totalPercent}%
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mémoire Utilisée</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {systemMetrics.jobbingtrack.containers.memory.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.memory.percent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {systemMetrics.jobbingtrack.containers.memory.used} MB / {systemMetrics.jobbingtrack.containers.memory.limit} MB
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </MetricsErrorBoundary>

        {/* Services et métriques avancées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* État des services */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setShowServicesPopup(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                État des Services
              </h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/backoffice/services');
                }}
                className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
              >
                Voir tous
              </button>
            </div>
            <div className="space-y-3">
              {generateServiceStatus().slice(0, 5).map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${service.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{service.uptime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Métriques de performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stats.averageResponseTime}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taux d'erreur</span>
                <span className="font-bold text-red-600 dark:text-red-400">{stats.errorRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sessions actives</span>
                <span className="font-bold text-green-600 dark:text-green-400">{stats.activeSessions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Popup des Services */}
        {showServicesPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Services Disponibles
                  </h2>
                </div>
                <button
                  onClick={() => setShowServicesPopup(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(servicesWithMetrics.length > 0 ? servicesWithMetrics : services).map((service) => {
                    const maintenance = maintenances[service.id]
                    
                    return (
                      <div
                        key={service.id}
                        className={`rounded-lg p-4 cursor-pointer transition-colors border ${
                          maintenance?.isActive
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">{service.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                                {service.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  service.status === 'running' ? 'bg-green-500' :
                                  service.status === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}></span>
                                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                  {service.status === 'running' ? 'En ligne' :
                                   service.status === 'stopped' ? 'Hors ligne' : 'Test...'}
                                </span>
                                {maintenance?.isActive && (
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium rounded-full">
                                    🔧 Maintenance
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Contrôles de maintenance */}
                          <div className="flex items-center gap-1">
                            {maintenance?.isActive ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deactivateMaintenance(service.id)
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Désactiver la maintenance"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  activateMaintenance(service.id)
                                }}
                                className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors"
                                title="Activer la maintenance"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                          {service.description}
                        </p>

                        {/* Informations des métriques */}
                        {service.metrics && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>CPU:</span>
                              <span>{service.metrics.cpu ? `${service.metrics.cpu.toFixed(1)}%` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mémoire:</span>
                              <span>{service.metrics.memory?.percent ? `${service.metrics.memory.percent.toFixed(1)}%` : 'N/A'}</span>
                            </div>
                          </div>
                        )}

                        {/* Clic pour naviguer vers la page du service */}
                        <div
                          onClick={() => {
                            router.push(service.route)
                            setShowServicesPopup(false)
                          }}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Voir détails →
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(servicesWithMetrics.length > 0 ? servicesWithMetrics : services).length} services disponibles
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowServicesPopup(false);
                        router.push('/backoffice/services');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Gestion Complète
                    </button>
                    <button
                      onClick={() => setShowServicesPopup(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// Composant graphique des tendances d'erreurs
function ErrorTrendChart({ stats }: { stats: any }) {
  const [errorData, setErrorData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simuler des données d'erreurs par heure
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      total: Math.floor(Math.random() * 10) + (stats.recentErrors > 0 ? Math.floor(stats.recentErrors / 24) : 0)
    }))
    setErrorData(mockData)
    setLoading(false)
  }, [stats.recentErrors])

  if (loading) {
    return <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
  }

  const maxValue = errorData.length > 0 ? Math.max(...errorData.map(d => d.total)) : 10

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Erreurs par heure</span>
        </div>
      </div>

      {/* Graphique en barres */}
      <div className="h-48 flex items-end justify-between gap-1">
        {errorData.map((data, index) => {
          const height = maxValue > 0 ? (data.total / maxValue) * 100 : 0
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                <div
                  className="bg-red-500 dark:bg-red-400 rounded-t-lg transition-all duration-300"
                  style={{ height: `${Math.max(height, 5)}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{data.hour}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Composant pour les cartes de métriques
function MetricCard({ title, value, subtitle, icon, color, href }: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'pink' | 'red'
  href?: string
}) {
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    pink: 'bg-pink-500 hover:bg-pink-600',
    red: 'bg-red-500 hover:bg-red-600'
  }

  const CardComponent = href ? 'a' : 'div'

  return (
    <CardComponent
      href={href}
      className={`relative overflow-hidden rounded-lg shadow-lg transition-all duration-200 ${href ? 'cursor-pointer hover:scale-105' : ''} ${color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' : color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : color === 'pink' ? 'bg-gradient-to-br from-pink-500 to-pink-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}
    >
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white/80">
            {icon}
          </div>
          {href && (
            <div className="text-white/60 text-sm">
              →
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
          <p className="text-sm font-medium text-white/90">{title}</p>
          <p className="text-xs text-white/70">{subtitle}</p>
        </div>
      </div>
    </CardComponent>
  )
}

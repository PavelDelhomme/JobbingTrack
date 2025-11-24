'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/features/AdminLayout'
import MetricsErrorBoundary from '@/components/MetricsErrorBoundary'
import { LoadingState } from '@/components/ui/LoadingState'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'
import { Activity, TrendingUp, Users, Building2, FileText, Phone, Calendar, Settings, Database, Shield, Zap, Clock, X, Cpu, MemoryStick, Server } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// ✅ Fonction utilitaire pour formater les nombres en toute sécurité
const safeToFixed = (value: any, decimals: number = 2, fallback: string = 'N/A'): string => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value.toFixed(decimals);
  }
  return fallback;
};

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
  const [initialMetricsLoaded, setInitialMetricsLoaded] = useState(false)

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

  // Charger les métriques système et des services
  useEffect(() => {
    const loadSystemMetrics = async () => {
      try {
        // ✅ NE PAS mettre loading à true pour le premier chargement uniquement
        // Cela évite d'afficher N/A pendant les rechargements
        if (!systemMetrics) {
          setLoadingSystemMetrics(true)
        }
        
        // Récupérer toutes les métriques depuis le service centralisé
        const allMetrics = await centralMetricsService.fetchMetrics()
        
        if (allMetrics) {
          // ✅ FUSIONNER les nouvelles métriques avec les anciennes pour garder toutes les valeurs
          // Ne jamais mettre null ou undefined pour éviter d'afficher N/A
          if (allMetrics.system) {
            setSystemMetrics((prev: any) => ({
              ...prev,
              ...allMetrics.system,
              // Préserver les sous-objets en les fusionnant aussi
              cpu: prev?.cpu ? { ...prev.cpu, ...allMetrics.system.cpu } : allMetrics.system.cpu,
              memory: prev?.memory ? { ...prev.memory, ...allMetrics.system.memory } : allMetrics.system.memory,
              load: prev?.load ? { ...prev.load, ...allMetrics.system.load } : allMetrics.system.load,
              disk: allMetrics.system.disk || prev?.disk,
              jobbingtrack: prev?.jobbingtrack ? {
                ...prev.jobbingtrack,
                ...allMetrics.system.jobbingtrack,
                containers: allMetrics.system.jobbingtrack?.containers || prev.jobbingtrack.containers
              } : allMetrics.system.jobbingtrack
            }))
          }
          if (allMetrics.containers) {
            setContainerMetrics((prev: any) => ({
              ...prev,
              ...allMetrics.containers
            }))
          }
          
          // ✅ Enrichir les services avec leurs métriques en temps réel
          // FUSIONNER avec les valeurs précédentes pour éviter d'afficher "Test en cours" pendant le chargement
          setServicesWithMetrics((prevServices: any[]) => {
            return services.map(service => {
              // Trouver le service précédent pour garder ses valeurs si disponibles
              const prevService = prevServices.find(s => s.id === service.id)
              
              // Chercher les métriques du conteneur correspondant au service
              const serviceKey = service.id.replace('-service', '')
              let containerMetrics = null
              
              // Chercher dans containers si disponible
              if (allMetrics.containers) {
                const containerName = `jobbingtrack-${serviceKey}`
                containerMetrics = Object.entries(allMetrics.containers).find(([name]) => 
                  name.toLowerCase().includes(serviceKey)
                )?.[1]
              }
              
              // Chercher dans services si disponible
              let serviceMetrics = null
              if (allMetrics.services && allMetrics.services[service.id]) {
                serviceMetrics = allMetrics.services[service.id]
              }
              
              // Déterminer le status : garder l'ancien si le nouveau n'est pas disponible
              let newStatus = prevService?.status || 'testing'
              if (serviceMetrics?.health?.status === 'healthy') {
                newStatus = 'running'
              } else if (serviceMetrics?.health?.status === 'unhealthy') {
                newStatus = 'stopped'
              } else if (serviceMetrics?.health?.status) {
                newStatus = serviceMetrics.health.status
              }
              
              return {
                ...service,
                // Garder les anciennes valeurs si les nouvelles ne sont pas disponibles
                metrics: containerMetrics || serviceMetrics?.metrics || prevService?.metrics,
                health: serviceMetrics?.health || prevService?.health,
                status: newStatus,
                responseTime: serviceMetrics?.health?.responseTime || prevService?.responseTime || 'N/A',
                uptime: serviceMetrics?.uptime || prevService?.uptime || 'N/A',
              }
            })
          })
          
          // ✅ Calculer le temps de réponse moyen depuis les métriques
          const responseTimes = allMetrics.servicesList
            ?.filter((svc: any) => typeof svc.responseTimeMs === 'number' && svc.responseTimeMs > 0)
            .map((svc: any) => svc.responseTimeMs) || []
          
          const avgResponseTime = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length)
            : allMetrics.responseTime?.average_ms 
              ? Math.round(Number(allMetrics.responseTime.average_ms))
              : 0
          
          // ✅ Mettre à jour les stats avec le temps de réponse
          if (avgResponseTime > 0) {
            setStats((prev: any) => ({
              ...prev,
              averageResponseTime: avgResponseTime
            }))
          }
        }
        // ✅ Suppression du else - on garde les anciennes valeurs si échec
      } catch (error) {
        console.error('Erreur chargement métriques système:', error)
        // ✅ Ne rien faire en cas d'erreur - garder les anciennes valeurs
      } finally {
        setLoadingSystemMetrics(false)
      }
    }

    if (isAuthenticated) {
      loadSystemMetrics()
      loadMaintenances()
      
      // Actualiser toutes les 5 secondes (rafraîchissement rapide pour les métriques système)
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadSystemMetrics()
        }
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        
        // Récupérer les statistiques depuis les services (avec gestion silencieuse des 404)
        const fetchWithFallback = async (promise: Promise<any>, fallback: any) => {
          try {
            const result = await promise
            return result
          } catch (error: any) {
            // Ne log que les erreurs autres que 404
            if (error?.response?.status !== 404 && error?.code !== 'ERR_BAD_REQUEST') {
              console.warn('Erreur récupération données:', error.message)
            }
            return fallback
          }
        }

        const [
          applicationsResponse,
          usersResponse,
          companiesResponse,
          activeSessionsResponse
        ] = await Promise.all([
          fetchWithFallback(
            applicationService.getAll(),
            { data: { total: 0, applications: [] } }
          ),
          fetchWithFallback(
            axios.get(`${API_URL}/api/v1/auth/users`, {
              headers: { 'Authorization': `Bearer ${token}` },
              validateStatus: (status) => status < 500 // Accepter 401, 403, 404 mais pas 500
            }).then(r => ({ data: r.data })).catch(e => {
              // Si erreur, essayer le fallback /api/v1/users
              if (e.response?.status !== 401 && e.response?.status !== 403) {
                return axios.get(`${API_URL}/api/v1/users`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                  validateStatus: (status) => status < 500
                }).then(r => ({ data: r.data })).catch(() => ({ data: { users: [] } }));
              }
              return { data: { users: [] } };
            }),
            { data: { users: [] } }
          ),
          fetchWithFallback(
            companyService.getAll(),
            { data: { companies: [] } }
          ),
          fetchWithFallback(
            axios.get(`${API_URL}/api/v1/auth/sessions/active`, {
              headers: { 'Authorization': `Bearer ${token}` },
              validateStatus: (status) => status < 500 // Accepter 401, 403, 404 mais pas 500
            }),
            { data: { total: 0, activeUsersLast30Min: 0 } }
          )
        ])

        // Calculer les statistiques
        const totalApplications = applicationsResponse?.data?.total || 0
        const totalUsers = usersResponse?.data?.users?.length || usersResponse?.data?.total || 0
        const totalCompanies = companiesResponse?.data?.companies?.length || 0
        // Pour les sessions actives, utiliser l'utilisateur connecté si aucune session n'est trouvée
        const activeSessions = activeSessionsResponse?.data?.total || activeSessionsResponse?.data?.activeUsersLast30Min || (user ? 1 : 0)

        setStats(prev => ({
          ...prev,
          totalApplications,
          totalUsers,
          totalCompanies,
          activeUsers: activeSessions,
          activeSessions: activeSessions, // ✅ Ajouter aussi ici
          systemHealth: 100,
          deploymentStatus: 'success'
        }))
      } catch (error) {
        console.error('Erreur chargement statistiques:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAuthenticated && token) {
      fetchStats()
    }
  }, [isAuthenticated, token])

  // Charger les services avec leurs métriques
  useEffect(() => {
    const loadServicesWithMetrics = async () => {
      try {
        const servicesData = await centralMetricsService.getAllServices()
        if (servicesData && servicesData.length > 0) {
          // ✅ FUSIONNER avec les valeurs précédentes au lieu d'écraser
          setServicesWithMetrics((prevServices: any[]) => {
            return services.map(service => {
              // Trouver le service précédent pour garder ses valeurs
              const prevService = prevServices.find(s => s.id === service.id)
              
              // Chercher le service correspondant dans les données Docker
              const dockerService = servicesData.find((s: any) => 
                s.name?.includes(service.id) || s.name === `jobbingtrack-${service.id}`
              )
              
              // Si on a des nouvelles données Docker, les utiliser, sinon garder les anciennes
              if (dockerService) {
                return {
                  ...service,
                  status: dockerService.is_running ? 'running' : 'stopped',
                  metrics: dockerService.metrics ? {
                    cpu: dockerService.metrics.cpu_percent,
                    memory: {
                      percent: dockerService.metrics.memory_percent,
                      usage: dockerService.metrics.memory_usage_mb
                    },
                    pids: dockerService.metrics.pids
                  } : prevService?.metrics,
                  uptime: dockerService.is_running ? 'En ligne' : 'Hors ligne'
                }
              }
              
              // Pas de nouvelles données Docker, garder les anciennes valeurs
              return prevService || service
            })
          })
        }
        // ✅ Ne rien faire si pas de données - garder les valeurs existantes
      } catch (error) {
        console.error('Erreur chargement services:', error)
        // ✅ Ne rien faire en cas d'erreur - garder les valeurs existantes
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
        <LoadingState 
          message="Chargement du tableau de bord..." 
          size="lg"
        />
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
                onClick={() => router.push('/backoffice/statistique')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Database className="h-4 w-4" />
                Statistiques
              </button>
              <button
                onClick={() => router.push('/search')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Activity className="h-4 w-4" />
                Recherche
              </button>
              <button
                onClick={() => setShowServicesPopup(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Server className="h-4 w-4" />
                Services
              </button>
            </div>
          </div>
        </div>

        {/* Métriques principales en grille - Version administrative */}
        {/* Sous 1280px : 3 colonnes (2 lignes) | À partir de 1280px : 6 colonnes (1 ligne) */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          <MetricCard
            title="Sessions Actives"
            value={stats.activeUsers !== undefined ? stats.activeUsers : '...'}
            subtitle={`${stats.totalUsers || 0} utilisateurs`}
            icon={<Users className="h-6 w-6" />}
            color="green"
            href="/backoffice/users"
          />
          <MetricCard
            title="Erreurs Récentes"
            value={stats.recentErrors !== undefined ? stats.recentErrors : '...'}
            subtitle="24h dernières"
            icon={<Shield className="h-6 w-6" />}
            color="red"
            href="/backoffice/security/logs"
          />
          <MetricCard
            title="Santé Système"
            value={stats.systemHealth !== undefined ? `${stats.systemHealth}%` : '...'}
            subtitle="Disponibilité"
            icon={<Zap className="h-6 w-6" />}
            color="blue"
            trend={2.5}  // Exemple: +2.5% de disponibilité (bon = vert ⬆️)
            trendType="negative-is-bad"  // Plus de disponibilité = bon
          />
          <MetricCard
            title="Temps Réponse"
            value={stats.averageResponseTime !== undefined && stats.averageResponseTime > 0 ? `${stats.averageResponseTime}ms` : '...'}
            subtitle="Moyen"
            icon={<Clock className="h-6 w-6" />}
            color="purple"
            trend={-8.3}  // Exemple: -8.3% de temps de réponse (bon = vert ⬇️)
            trendType="positive-is-bad"  // Moins de temps de réponse = bon
          />
          <MetricCard
            title="CPU (Conteneurs)"
            value={systemMetrics?.jobbingtrack?.containers?.cpu?.totalPercent !== undefined 
              ? `${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.totalPercent, 1)}%` 
              : systemMetrics?.cpu?.containers_only !== undefined 
              ? `${safeToFixed(systemMetrics.cpu.containers_only, 1)}%` 
              : '...'}
            subtitle={systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined 
              ? `Moy: ${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.averagePercent, 1)}% • ${systemMetrics.jobbingtrack.containers.count || 0} conteneurs`
              : systemMetrics?.cpu?.cores 
              ? `${systemMetrics.cpu.cores} coeurs • ${safeToFixed(systemMetrics.cpu.per_core, 1)}% par coeur` 
              : '...'}
            icon={<Cpu className="h-6 w-6" />}
            color={
              (systemMetrics?.jobbingtrack?.containers?.cpu?.totalPercent !== undefined 
                ? systemMetrics.jobbingtrack.containers.cpu.totalPercent 
                : systemMetrics?.cpu?.containers_only) > 80 
              ? "red" 
              : (systemMetrics?.jobbingtrack?.containers?.cpu?.totalPercent !== undefined 
                ? systemMetrics.jobbingtrack.containers.cpu.totalPercent 
                : systemMetrics?.cpu?.containers_only) > 60 
              ? "yellow" 
              : "green"}
            trend={-3.2}  // Exemple: -3.2% de CPU (bon = vert ⬇️ car moins de CPU utilisé)
            trendType="positive-is-bad"  // Moins de CPU = bon, Plus = mauvais
          />
          <MetricCard
            title="Mémoire (Conteneurs)"
            value={systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined 
              ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.percent, 1)}%` 
              : systemMetrics?.memory?.usage !== undefined 
              ? `${safeToFixed(systemMetrics.memory.usage, 1)}%` 
              : '...'}
            subtitle={systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.jobbingtrack?.containers?.memory?.limit
              ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.jobbingtrack.containers.memory.limit, 0)} MB`
              : systemMetrics?.memory?.used 
              ? `${systemMetrics.memory.used} / ${systemMetrics.memory.total}` 
              : '...'}
            icon={<MemoryStick className="h-6 w-6" />}
            color={
              (systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined 
                ? systemMetrics.jobbingtrack.containers.memory.percent 
                : systemMetrics?.memory?.usage) > 85 
              ? "red" 
              : (systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined 
                ? systemMetrics.jobbingtrack.containers.memory.percent 
                : systemMetrics?.memory?.usage) > 70 
              ? "yellow" 
              : "green"}
            trend={1.8}  // Exemple: +1.8% de mémoire (mauvais = rouge ⬆️ car plus de mémoire utilisée)
            trendType="positive-is-bad"  // Moins de mémoire = bon, Plus = mauvais
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
              <div className={`w-3 h-3 rounded-full ${systemMetrics ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${systemMetrics ? 'text-green-600' : 'text-red-600'}`}>
                {systemMetrics ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {systemMetrics?.jobbingtrack?.containers?.cpu?.totalPercent !== undefined 
                  ? `${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.totalPercent, 1)}%` 
                  : systemMetrics?.cpu?.containers_only !== undefined 
                  ? `${safeToFixed(systemMetrics.cpu.containers_only, 1)}%` 
                  : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">CPU (Conteneurs)</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined 
                  ? `Moy: ${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.averagePercent, 1)}% • ${systemMetrics.jobbingtrack.containers.count || 0} conteneurs`
                  : systemMetrics?.cpu?.per_core !== undefined 
                  ? `${safeToFixed(systemMetrics.cpu.per_core, 1)}% par coeur` 
                  : '...'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined 
                  ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.percent, 1)}%` 
                  : systemMetrics?.memory?.usage !== undefined 
                  ? `${safeToFixed(systemMetrics.memory.usage, 1)}%` 
                  : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire (Conteneurs)</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.jobbingtrack?.containers?.memory?.limit
                  ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.jobbingtrack.containers.memory.limit, 0)} MB`
                  : systemMetrics?.memory?.used 
                  ? `${systemMetrics.memory.used} / ${systemMetrics.memory.total}` 
                  : '...'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {systemMetrics?.load?.average !== undefined || systemMetrics?.load?.load_1 !== undefined
                  ? safeToFixed(systemMetrics?.load?.average || systemMetrics?.load?.load_1, 2, '0.00')
                  : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Charge</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.cpu?.cores ? `${systemMetrics.cpu.cores} coeurs` : '...'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemMetrics?.jobbingtrack?.containers?.count !== undefined 
                  ? systemMetrics.jobbingtrack.containers.count 
                  : containerMetrics && Object.keys(containerMetrics).length > 0
                  ? Object.keys(containerMetrics).length
                  : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Conteneurs</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(systemMetrics?.jobbingtrack?.containers?.count !== undefined && systemMetrics.jobbingtrack.containers.count > 0) || 
                 (containerMetrics && Object.keys(containerMetrics).length > 0)
                  ? '✅ Actifs' 
                  : systemMetrics ? 'Aucun conteneur détecté' : '...'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {services && services.length > 0 ? services.length : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {services && services.length > 0 ? '🟢 OK' : '...'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {systemMetrics?.disk?.[0]?.usage_percent !== undefined && systemMetrics.disk[0].usage_percent !== null
                  ? `${systemMetrics.disk[0].usage_percent}%` 
                  : loadingSystemMetrics ? '...' : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Disque</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {systemMetrics?.disk?.[0]?.used_human && systemMetrics?.disk?.[0]?.total_human ? 
                  `${systemMetrics.disk[0].used_human} / ${systemMetrics.disk[0].total_human}` : 
                  systemMetrics?.disk?.[0]?.used !== undefined && systemMetrics?.disk?.[0]?.total !== undefined ?
                  `${systemMetrics.disk[0].used} GB / ${systemMetrics.disk[0].total} GB` :
                  systemMetrics?.disk?.[0]?.usage_percent !== undefined && systemMetrics.disk[0].usage_percent > 0
                  ? (systemMetrics.disk[0].usage_percent > 80 ? '⚠️ Plein' : '✅ OK')
                  : loadingSystemMetrics ? '...' : 'N/A'}
              </div>
            </div>
          </div>

          {/* Métriques des conteneurs JobbingTrack - Toujours visible */}
          {systemMetrics?.jobbingtrack?.containers?.count !== undefined ? (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                📦 Conteneurs JobbingTrack ({systemMetrics.jobbingtrack.containers.count})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">CPU Moyen</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined 
                        ? `${systemMetrics.jobbingtrack.containers.cpu.averagePercent.toFixed(1)}%` 
                        : '...'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.cpu?.averagePercent || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total: {systemMetrics.jobbingtrack.containers.cpu?.totalPercent !== undefined 
                      ? `${systemMetrics.jobbingtrack.containers.cpu.totalPercent.toFixed(1)}%` 
                      : '...'}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mémoire Utilisée</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {systemMetrics.jobbingtrack.containers.memory?.percent !== undefined 
                        ? `${systemMetrics.jobbingtrack.containers.memory.percent.toFixed(1)}%` 
                        : '...'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.memory?.percent || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {systemMetrics.jobbingtrack.containers.memory?.used && systemMetrics.jobbingtrack.containers.memory?.limit 
                      ? `${systemMetrics.jobbingtrack.containers.memory.used.toFixed(0)} MB / ${systemMetrics.jobbingtrack.containers.memory.limit.toFixed(0)} MB`
                      : '...'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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

                        {/* État de santé et temps de réponse */}
                        {service.health && (
                          <div className="mb-2 p-2 bg-white dark:bg-gray-600/50 rounded text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">État:</span>
                              <span className={`font-semibold ${
                                service.health.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                                service.health.status === 'unhealthy' ? 'text-red-600 dark:text-red-400' :
                                'text-yellow-600 dark:text-yellow-400'
                              }`}>
                                {service.health.status === 'healthy' ? '✅ Disponible' :
                                 service.health.status === 'unhealthy' ? '❌ Indisponible' :
                                 '⚠️ En cours de test'}
                              </span>
                            </div>
                            {service.responseTime !== 'N/A' && (
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-gray-600 dark:text-gray-400">Temps de réponse:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {service.responseTime}ms
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Informations des métriques */}
                        {service.metrics && (
                          <div className="text-xs space-y-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <Cpu className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">CPU:</span>
                              </div>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {service.metrics.cpu?.percentage !== undefined 
                                  ? `${service.metrics.cpu.percentage.toFixed(1)}%` 
                                  : service.metrics.cpu 
                                  ? `${service.metrics.cpu.toFixed(1)}%` 
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <MemoryStick className="h-3 w-3 text-green-600 dark:text-green-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Mémoire:</span>
                              </div>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {service.metrics.memory?.percentage !== undefined 
                                  ? `${service.metrics.memory.percentage.toFixed(1)}%` 
                                  : service.metrics.memory?.percent 
                                  ? `${service.metrics.memory.percent.toFixed(1)}%` 
                                  : 'N/A'}
                                {service.metrics.memory?.usage && (
                                  <span className="text-xs ml-1 text-gray-500">
                                    ({(service.metrics.memory.usage / 1024 / 1024).toFixed(0)} MB)
                                  </span>
                                )}
                              </span>
                            </div>
                            {service.metrics.pids && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Processus:</span>
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {service.metrics.pids}
                                </span>
                              </div>
                            )}
                            {service.metrics.network && (service.metrics.network.rx || service.metrics.network.tx) && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Réseau:</span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {((service.metrics.network.rx + service.metrics.network.tx) / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clic pour naviguer vers la page du service */}
                        <div
                          onClick={() => {
                            router.push(service.route)
                            setShowServicesPopup(false)
                          }}
                          className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
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
function MetricCard({ title, value, subtitle, icon, color, href, trend, trendType = 'negative-is-bad' }: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'pink' | 'red'
  href?: string
  trend?: number  // Pourcentage de changement (positif = augmentation, négatif = diminution)
  trendType?: 'negative-is-bad' | 'positive-is-bad'  
  // 'negative-is-bad' pour Disponibilité (plus = mieux)
  // 'positive-is-bad' pour CPU, Mémoire, Temps de réponse (moins = mieux)
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

  // Déterminer la couleur de la tendance
  const getTrendColor = () => {
    if (trend === undefined || trend === null || trend === 0) return 'text-white/70'
    
    if (trendType === 'positive-is-bad') {
      // Pour CPU, Mémoire, Temps de réponse : augmentation = mauvais (rouge), diminution = bon (vert)
      return trend > 0 ? 'text-red-200' : 'text-green-200'
    } else {
      // Pour Disponibilité : augmentation = bon (vert), diminution = mauvais (rouge)
      return trend > 0 ? 'text-green-200' : 'text-red-200'
    }
  }

  const getTrendIcon = () => {
    if (trend === undefined || trend === null || trend === 0) return null
    return trend > 0 ? '↑' : '↓'
  }

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
          {trend !== undefined && trend !== null && trend !== 0 ? (
            <div className={`text-sm font-semibold ${getTrendColor()} flex items-center gap-0.5`}>
              <span>{getTrendIcon()}</span>
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          ) : href ? (
            <div className="text-white/60 text-sm">
              →
            </div>
          ) : null}
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

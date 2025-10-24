'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { AdminLayout } from '@/components/features'
import MetricsErrorBoundary from '@/components/MetricsErrorBoundary'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'
import { Activity, TrendingUp, Users, Building2, FileText, Phone, Calendar, Settings, Database, Shield, Zap, Clock, X } from 'lucide-react'
import axios from 'axios'

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function BackofficePage() {
  const { user, loading, isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [systemMetrics, setSystemMetrics] = useState<any>(null)
  const [containerMetrics, setContainerMetrics] = useState<any>(null)
  const [loadingSystemMetrics, setLoadingSystemMetrics] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalApplications: 'N/A',
    totalCompanies: 'N/A',
    totalInterviews: 'N/A',
    totalUsers: 'N/A',
    activeUsers: 'N/A',
    recentApplications: 'N/A',
    totalContacts: 'N/A',
    totalCalls: 'N/A',
    totalFollowups: 'N/A',
    totalEvents: 'N/A',
    systemHealth: 'N/A',
    averageResponseTime: 'N/A',
    errorRate: 'N/A',
    activeSessions: 'N/A',
    recentErrors: 'N/A',
    securityAlerts: 'N/A',
    codeQuality: 'N/A',
    vulnerabilities: 'N/A',
    deploymentStatus: 'N/A'
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy')
  const [showServicesPopup, setShowServicesPopup] = useState(false)
  const [maintenances, setMaintenances] = useState<{[key: string]: any}>({})

  // Générer les services avec les vraies données des métriques
  const generateServicesWithMetrics = (servicesData?: any[]) => {
    const serviceMapping: { [key: string]: { name: string; description: string; icon: string; route: string } } = {
      'auth-service': {
        name: 'Service d\'Authentification',
        description: 'Gestion des utilisateurs et authentification',
        icon: '🔐',
        route: '/backoffice/services/auth-service'
      },
      'application-service': {
        name: 'Service des Candidatures',
        description: 'Gestion des candidatures et processus',
        icon: '📝',
        route: '/backoffice/services/application-service'
      },
      'company-service': {
        name: 'Service des Entreprises',
        description: 'Gestion des entreprises et recrutement',
        icon: '🏢',
        route: '/backoffice/services/company-service'
      },
      'contact-service': {
        name: 'Service des Contacts',
        description: 'Gestion des contacts et réseaux',
        icon: '👥',
        route: '/backoffice/services/contact-service'
      },
      'interview-service': {
        name: 'Service des Entretiens',
        description: 'Gestion des entretiens et calendrier',
        icon: '📅',
        route: '/backoffice/services/interview-service'
      },
      'call-service': {
        name: 'Service des Appels',
        description: 'Gestion des appels et communications',
        icon: '📞',
        route: '/backoffice/services/call-service'
      },
      'notification-service': {
        name: 'Service de Notifications',
        description: 'Gestion des notifications et alertes',
        icon: '🔔',
        route: '/backoffice/services/notification-service'
      },
      'dashboard-service': {
        name: 'Service du Tableau de Bord',
        description: 'Gestion des métriques et analytics',
        icon: '📊',
        route: '/backoffice/services/dashboard-service'
      },
      'workflow-service': {
        name: 'Service de Workflow',
        description: 'Gestion des workflows automatisés',
        icon: '⚙️',
        route: '/backoffice/services/workflow-service'
      },
      'event-service': {
        name: 'Service des Événements',
        description: 'Gestion des événements et rappels',
        icon: '🎯',
        route: '/backoffice/services/event-service'
      },
      'followup-service': {
        name: 'Service de Relances',
        description: 'Gestion des relances automatiques',
        icon: '📧',
        route: '/backoffice/services/followup-service'
      },
      'profile-service': {
        name: 'Service des Profils',
        description: 'Gestion des profils utilisateurs',
        icon: '👤',
        route: '/backoffice/services/profile-service'
      }
    }

    // Si les données de services ne sont pas disponibles, retourner les services avec statut par défaut
    if (!servicesData || servicesData.length === 0) {
      return Object.entries(serviceMapping).map(([serviceKey, serviceConfig]) => ({
        id: serviceKey,
        name: serviceConfig.name,
        description: serviceConfig.description,
        icon: serviceConfig.icon,
        status: 'stopped' as const,
        route: serviceConfig.route,
        uptime: 'N/A'
      }))
    }

    return servicesData.map((serviceData: any) => {
      const serviceKey = serviceData.name || serviceData.id
      const serviceConfig = serviceMapping[serviceKey] || {
        name: serviceKey?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Service Inconnu',
        description: `Service ${serviceKey}`,
        icon: '🔧',
        route: `/backoffice/services/${serviceKey}`
      }

      return {
        id: serviceKey,
        name: serviceConfig.name,
        description: serviceConfig.description,
        icon: serviceConfig.icon,
        status: serviceData.status === 'running' || serviceData.health?.status === 'online' ? 'running' : 'stopped',
        route: serviceConfig.route,
        metrics: serviceData,
        uptime: serviceData.status === 'running' ? 'En ligne' : 'Hors ligne'
      }
    })
  }

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

  // Charger les services au démarrage
  useEffect(() => {
    const loadServices = async () => {
      try {
        const servicesData = await centralMetricsService.getAllServices()
        if (servicesData) {
          const updatedServices = generateServicesWithMetrics(servicesData)
          setServices(updatedServices)
        }
      } catch (error) {
        console.error('Erreur chargement services:', error)
        // Fallback vers la fonction par défaut
        const updatedServices = generateServicesWithMetrics()
        setServices(updatedServices)
      }
    }

    loadServices()
  }, [])

  // Charger les maintenances au démarrage
  useEffect(() => {
    if (isAuthenticated && token) {
      loadMaintenances()
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Charger les métriques système depuis le service centralisé
  useEffect(() => {
    const loadSystemMetrics = async () => {
      try {
        setLoadingSystemMetrics(true)

        // Vérifier d'abord que les services sont disponibles (gestion d'erreur silencieuse)
        try {
          const healthResponse = await fetch('http://localhost:3000/health', {
            signal: AbortSignal.timeout(2000)
          })

          if (!healthResponse.ok) {
            throw new Error('Services non disponibles')
          }
        } catch (healthError) {
          // Erreur silencieuse - services non disponibles (normal)
          setSystemMetrics({
            cpu: { usage: 'N/A', cores: 'N/A', model: 'Services indisponibles' },
            memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
            load: { average: 'N/A', cores: 'N/A' },
            disk: []
          })
          setContainerMetrics({})
          setLoadingSystemMetrics(false)
          return
        }

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
        // En cas d'erreur, définir des valeurs par défaut sûres
        setSystemMetrics({
          cpu: { usage: 'N/A', cores: 'N/A', model: 'Erreur de chargement' },
          memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
          load: { average: 'N/A', cores: 'N/A' },
          disk: []
        })
        setContainerMetrics({})
      } finally {
        setLoadingSystemMetrics(false)
      }
    }

    if (isAuthenticated) {
      loadSystemMetrics()

      // Actualiser les métriques toutes les 30 secondes
      const interval = setInterval(() => {
        // Vérifier que la page est toujours visible avant de rafraîchir
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
        // Remplacer les vraies données par 'N/A' pour éviter les données fausses
        setStats(prev => ({
          ...prev,
          totalApplications: 'N/A',
          totalUsers: 'N/A',
          totalCompanies: 'N/A',
          activeUsers: 'N/A',
          systemHealth: 'N/A',
          deploymentStatus: 'N/A'
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

  // Fonction pour générer le statut des services avec les vraies données
  const generateServiceStatus = (servicesData?: any[]) => {
    if (!servicesData || servicesData.length === 0) {
      return []
    }

    return servicesData.map((serviceData: any) => ({
      name: serviceData.name?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Service Inconnu',
      status: serviceData.status === 'running' || serviceData.health?.status === 'online' ? 'running' : 'stopped',
      uptime: serviceData.health?.responseTime ? `${serviceData.health.responseTime}ms` : 'N/A',
      responseTime: typeof serviceData.health?.responseTime === 'number' ? serviceData.health.responseTime : 0,
      version: serviceData.health?.version || 'N/A'
    }))
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 break-words">
                Bienvenue, {user?.firstName} ! 👋
              </h1>
              <p className="mt-2 text-base md:text-lg text-gray-600 dark:text-gray-400">
                Vue d'ensemble de votre plateforme JobbingTrack
              </p>
            </div>

            {/* Boutons d'action rapide */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/backoffice/analytics')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/backoffice/performance-tests')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <Zap className="h-4 w-4" />
                Tests Performance
              </button>
              <button
                onClick={() => setShowServicesPopup(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <Activity className="h-4 w-4" />
                Services
              </button>
            </div>
          </div>
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
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemMetrics && systemMetrics.cpu && systemMetrics.cpu.usage !== 'N/A' && systemMetrics.cpu.usage !== null ? `${systemMetrics.cpu.usage}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">CPU</div>
              {systemMetrics && systemMetrics.cpu && systemMetrics.cpu.usage !== 'N/A' && systemMetrics.cpu.usage !== null && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${systemMetrics.cpu.usage}%` }}></div>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                N/A
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                N/A
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Charge</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                N/A
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Conteneurs</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ❌
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                N/A
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                🔴
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                N/A
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Disque</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ❌
              </div>
            </div>
          </div>

          {/* Section des métriques de conteneurs détaillées */}
          {containerMetrics && Object.keys(containerMetrics).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Métriques des Conteneurs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(containerMetrics).slice(0, 6).map(([containerName, container]: [string, any]) => (
                  <div key={containerName} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {containerName}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        container.status === 'running'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {container.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">CPU</span>
                          <span className="font-medium">{container && container.cpu && container.cpu.percentage !== undefined && container.cpu.percentage !== null ? `${container.cpu.percentage}%` : 'N/A'}</span>
                        </div>
                        {container && container.cpu && container.cpu.percentage !== undefined && container.cpu.percentage !== null && container.cpu.percentage !== 'N/A' && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${container.cpu.percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Mémoire</span>
                          <span className="font-medium">{container && container.memory && container.memory.percentage !== undefined && container.memory.percentage !== null ? `${container.memory.percentage}%` : 'N/A'}</span>
                        </div>
                        {container && container.memory && container.memory.percentage !== undefined && container.memory.percentage !== null && container.memory.percentage !== 'N/A' && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-green-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${container.memory.percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </MetricsErrorBoundary>

        {/* Métriques principales en grille - Version administrative */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <MetricCard
            title="Sessions Actives"
            value="N/A"
            subtitle="utilisateurs"
            icon={<Users className="h-6 w-6" />}
            color="green"
            href="/backoffice/users"
          />
          <MetricCard
            title="Erreurs Récentes"
            value="N/A"
            subtitle="24h dernières"
            icon={<Shield className="h-6 w-6" />}
            color="red"
            href="/backoffice/logs"
          />
          <MetricCard
            title="Santé Système"
            value="N/A"
            subtitle="Disponibilité"
            icon={<Zap className="h-6 w-6" />}
            color="blue"
            href="/backoffice/analytics?tab=performance"
          />
          <MetricCard
            title="Temps Réponse"
            value="N/A"
            subtitle="Moyen"
            icon={<Clock className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Alertes Sécurité"
            value="N/A"
            subtitle="Aujourd'hui"
            icon={<Shield className="h-6 w-6" />}
            color="yellow"
            href="/backoffice/security-analysis"
          />
          <MetricCard
            title="Tests Performance"
            value="N/A"
            subtitle="Score"
            icon={<Zap className="h-6 w-6" />}
            color="purple"
            href="/backoffice/performance-tests"
          />
        </div>

        {/* Services et métriques avancées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* État des services - Cliquable pour ouvrir la popup */}
          <div
            onClick={() => setShowServicesPopup(true)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] group"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600 group-hover:text-purple-700 transition-colors" />
              État des Services
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 group-hover:text-purple-600 transition-colors">
                Voir tout →
              </span>
            </h3>
            <div className="space-y-3">
              {services.slice(0, 4).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'running' ? 'bg-green-500' :
                      service.status === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {service.status === 'running' ? 'En ligne' : service.status === 'stopped' ? 'Hors ligne' : 'Maintenance'}
                  </span>
                </div>
              ))}
              {services.length > 4 && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    +{services.length - 4} autres services
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Métriques de performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">N/A</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taux d'erreur</span>
                <span className="font-bold text-red-700 dark:text-red-300">N/A</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sessions actives</span>
                <span className="font-bold text-green-700 dark:text-green-300">N/A</span>
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
                  {services.map((service) => {
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
                              <span>Réponse:</span>
                              <span>{service.metrics.health?.responseTime ? `${service.metrics.health.responseTime}ms` : 'N/A'}</span>
                            </div>
                            {service.metrics.health?.version && (
                              <div className="flex justify-between">
                                <span>Version:</span>
                                <span>{service.metrics.health.version}</span>
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
                    {services.length} services disponibles
                  </p>
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
    // Remplacer les données d'erreurs par 'N/A'
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      total: 'N/A'
    }))
    setErrorData(mockData)
    setLoading(false)
  }, [stats.recentErrors])

  if (loading) {
    return <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
  }

  return (
    <div className="space-y-4">
      {/* Message d'information */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Données non disponibles</span>
        </div>
      </div>

      {/* Graphique avec 'N/A' */}
      <div className="h-48 flex items-end justify-between gap-1">
        {errorData.map((data, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">N/A</span>
              </div>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{data.hour}</span>
          </div>
        ))}
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
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  const textColors = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    purple: 'text-purple-700 dark:text-purple-300',
    orange: 'text-orange-700 dark:text-orange-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    pink: 'text-pink-700 dark:text-pink-300',
    red: 'text-red-700 dark:text-red-300'
  }

  const CardComponent = href ? 'a' : 'div'

  return (
    <CardComponent
      href={href}
      className={`relative overflow-hidden rounded-lg shadow-lg transition-all duration-200 ${href ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''} ${colors[color]} border`}
    >
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`${textColors[color]}`}>
            {icon}
          </div>
          {href && (
            <div className={`${textColors[color]} text-sm`}>
              →
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className={`text-sm font-medium ${textColors[color]}`}>{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
    </CardComponent>
  )
}

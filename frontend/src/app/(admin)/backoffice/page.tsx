'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/features/AdminLayout'
import MetricsErrorBoundary from '@/components/MetricsErrorBoundary'
import { LoadingState } from '@/components/ui/LoadingState'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'
import { cacheManager } from '@/lib/cache/cacheManager'
import { preferencesService } from '@/lib/services/preferencesService'
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Activity, TrendingUp, Users, Building2, FileText, Phone, Calendar, Settings, Shield, Zap, Clock, X, Cpu, MemoryStick, Server, Wifi } from '@/lib/icons'
import axios from 'axios'
import { useTracking } from '@/components/tracking/TrackingProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

// ✅ Fonction utilitaire pour formater les nombres en toute sécurité
const safeToFixed = (value: any, decimals: number = 2, fallback: string = 'N/A'): string => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value.toFixed(decimals);
  }
  return fallback;
}

/** Libellé droite « État des services » : le badge vert = processus joignable, pas forcément durée d’uptime remontée par l’agrégateur. */
function serviceAvailabilityCaption(service: {
  status?: string
  uptime?: string
  responseTime?: string | number
}): string {
  const u = service.uptime
  const looksLikeDuration =
    typeof u === 'string' && u.length > 0 && u !== 'N/A' && u !== 'En ligne' && u !== 'Hors ligne' && /[\djhms]/.test(u)
  if (looksLikeDuration) return u
  const rt = service.responseTime
  if (rt !== undefined && rt !== null && rt !== 'N/A') {
    const n = typeof rt === 'number' ? rt : Number(String(rt).replace(/[^\d.]/g, ''))
    if (!Number.isNaN(n) && n > 0) return `~${Math.round(n)} ms`
  }
  if (service.status === 'running') return 'En ligne'
  if (service.status === 'stopped') return 'Hors ligne'
  return '—'
}

export default function BackofficePage() {
  const { user, loading, isAuthenticated, token } = useAuth()
  const router = useRouter()
  const { trackEvent } = useTracking()
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
  const [metricsRefreshInterval, setMetricsRefreshInterval] = useState(15000) // Valeur par défaut, sera remplacée par les préférences
  const [servicesRefreshInterval, setServicesRefreshInterval] = useState(20000) // Valeur par défaut

  const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

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

  // ✅ Valeurs attendues (pour afficher X/Y)
  // Par défaut, on se base sur la liste des services affichés (source de vérité UI).
  const expectedServicesCount = services.length
  // Le nombre de conteneurs JobbingTrack attendus dépend du profil docker-compose.
  // On conserve une valeur par défaut (22) mais permet override via env.
  const expectedJobbingtrackContainers =
    Number(process.env.NEXT_PUBLIC_EXPECTED_JOBBINGTRACK_CONTAINERS || 22) || 22

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
            // ✅ OPTIMISATION : Éviter les mises à jour si les données n'ont pas changé significativement
            setSystemMetrics((prev: any) => {
              // ✅ CORRECTION : Toujours retourner un objet valide, même si prev est null
              if (!prev) {
                return {
                  ...allMetrics.system,
                  monitoringC: allMetrics.monitoringC,
                  jobbingtrack: allMetrics.system.jobbingtrack
                }
              }
              
              // ✅ OPTIMISATION : Comparer les valeurs numériques au lieu des strings pour éviter les re-renders inutiles
              const prevCpuPercent = typeof prev?.cpu?.usage_percent === 'number' ? prev.cpu.usage_percent : 
                (typeof prev?.cpu?.usage === 'string' ? parseFloat(prev.cpu.usage.replace('%', '')) : 0)
              const newCpuPercent = typeof allMetrics.system.cpu?.usage_percent === 'number' ? allMetrics.system.cpu.usage_percent :
                (typeof allMetrics.system.cpu?.usage === 'string' ? parseFloat(allMetrics.system.cpu.usage.replace('%', '')) : 0)
              
              const prevMemPercent = typeof prev?.memory?.usage_percent === 'number' ? prev.memory.usage_percent :
                (typeof prev?.memory?.usage === 'string' ? parseFloat(prev.memory.usage.replace('%', '')) : 0)
              const newMemPercent = typeof allMetrics.system.memory?.usage_percent === 'number' ? allMetrics.system.memory.usage_percent :
                (typeof allMetrics.system.memory?.usage === 'string' ? parseFloat(allMetrics.system.memory.usage.replace('%', '')) : 0)
              
              const cpuChanged = Math.abs(prevCpuPercent - newCpuPercent) > 0.5 // Seuil de 0.5% pour éviter trop de re-renders
              const memChanged = Math.abs(prevMemPercent - newMemPercent) > 0.5
              
              // ✅ OPTIMISATION : Toujours mettre à jour si les données projet ont changé
              const projectCpuChanged = Math.abs(
                (prev?.jobbingtrack?.containers?.cpu?.averagePercent || 0) - 
                (allMetrics.system.jobbingtrack?.containers?.cpu?.averagePercent || 0)
              ) > 0.1
              const projectMemChanged = Math.abs(
                (prev?.jobbingtrack?.containers?.memory?.percent_of_system || 0) - 
                (allMetrics.system.jobbingtrack?.containers?.memory?.percent_of_system || 0)
              ) > 0.1
              
              // Si pas de changement significatif, retourner l'objet précédent (évite re-render)
              if (!cpuChanged && !memChanged && !projectCpuChanged && !projectMemChanged && prev) {
                return prev
              }
              
              return {
                ...prev,
                ...allMetrics.system,
                // ✅ CORRECTION : Préserver monitoringC et jobbingtrack
                monitoringC: allMetrics.monitoringC || prev.monitoringC,
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
              }
            })
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
            // ✅ CORRECTION : S'assurer que prevServices est un tableau
            const safePrevServices = Array.isArray(prevServices) ? prevServices : []
            return services.map(service => {
              // Trouver le service précédent pour garder ses valeurs si disponibles
              const prevService = safePrevServices.find(s => s.id === service.id)
              
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
              
              // ✅ CORRECTION : Chercher aussi dans servicesList pour avoir les métriques complètes
              const serviceFromList = allMetrics.servicesList?.find((s: any) => 
                s.rawName === `jobbingtrack-${serviceKey}` || 
                s.name === service.id ||
                s.serviceType === serviceKey
              )
              
              if (serviceFromList) {
                serviceMetrics = serviceFromList
              }
              
              // ✅ CORRECTION : Déterminer le status correctement depuis les métriques
              let newStatus = prevService?.status || 'testing'
              
              // Priorité 1 : Statut depuis serviceMetrics (le plus fiable)
              if (serviceMetrics?.status) {
                newStatus = serviceMetrics.status
              } else if (serviceMetrics?.healthStatus) {
                // Mapper healthStatus vers status
                if (serviceMetrics.healthStatus === 'online' || serviceMetrics.healthStatus === 'healthy') {
                  newStatus = 'running'
                } else if (serviceMetrics.healthStatus === 'offline' || serviceMetrics.healthStatus === 'unhealthy') {
                  newStatus = 'stopped'
                } else if (serviceMetrics.healthStatus === 'degraded') {
                  newStatus = 'degraded'
                } else {
                  newStatus = 'unknown'
                }
              } else if (serviceMetrics?.health?.status) {
                const healthStatus = serviceMetrics.health.status
                if (healthStatus === 'healthy') {
                  newStatus = 'running'
                } else if (healthStatus === 'unhealthy' || healthStatus === 'down') {
                  newStatus = 'stopped'
                } else if (healthStatus === 'degraded') {
                  newStatus = 'degraded'
                } else {
                  newStatus = 'unknown'
                }
              } else if (containerMetrics) {
                // Si on a des métriques de conteneur, le service est probablement running
                newStatus = 'running'
              } else {
                // Pas de métriques disponibles : garder l'ancien statut ou 'unknown'
                newStatus = prevService?.status || 'unknown'
              }
              
              const resolvedUptime =
                (serviceMetrics?.uptime && serviceMetrics.uptime !== 'N/A' && String(serviceMetrics.uptime).trim() !== '')
                  ? serviceMetrics.uptime
                  : (prevService?.uptime && prevService.uptime !== 'N/A' ? prevService.uptime : undefined)
                  ?? (newStatus === 'running' || containerMetrics ? 'En ligne' : newStatus === 'stopped' ? 'Hors ligne' : '—')

              return {
                ...service,
                // Garder les anciennes valeurs si les nouvelles ne sont pas disponibles
                metrics: containerMetrics || serviceMetrics?.metrics || prevService?.metrics,
                health: serviceMetrics?.health || prevService?.health,
                status: newStatus,
                responseTime: serviceMetrics?.health?.responseTime ?? prevService?.responseTime ?? 'N/A',
                uptime: resolvedUptime,
              }
            })
          })
          
          // ✅ Calculer le temps de réponse moyen depuis les métriques
          // Priorité 1 : Utiliser avg_response_time_ms depuis monitoringC (le plus fiable)
          // Priorité 2 : Utiliser responseTime.average_ms (calculé depuis servicesList)
          // Priorité 3 : Calculer depuis servicesList individuellement
          const avgResponseTime = allMetrics.monitoringC?.avg_response_time_ms !== null && allMetrics.monitoringC?.avg_response_time_ms !== undefined
            ? Math.round(Number(allMetrics.monitoringC.avg_response_time_ms))
            : allMetrics.responseTime?.average_ms !== null && allMetrics.responseTime?.average_ms !== undefined
            ? Math.round(Number(allMetrics.responseTime.average_ms))
            : (() => {
                const responseTimes = allMetrics.servicesList
                  ?.filter((svc: any) => typeof svc.responseTimeMs === 'number' && svc.responseTimeMs > 0)
                  .map((svc: any) => svc.responseTimeMs) || []
                return responseTimes.length > 0
                  ? Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length)
                  : 0
              })()
          
          // ✅ Calculer le taux d'erreur depuis les métriques
          const totalErrors = allMetrics.errors?.total_last_5m || 0
          const errorRate = allMetrics.errors?.rate_per_min || 0
          
          // Événements erreur côté agrégateur (fenêtre courte, ex. 5 min) — pas une vue 24h tant que l’API ne l’expose pas
          const securityWindowErrors = typeof totalErrors === 'number' ? totalErrors : 0
          const nextErrorRate = typeof errorRate === 'number' && !Number.isNaN(errorRate) ? errorRate : 0

          // ✅ Mettre à jour les stats (0 explicite pour taux / compteurs, pas conserver une ancienne valeur)
          setStats((prev: any) => ({
            ...prev,
            averageResponseTime: (typeof avgResponseTime === 'number' && !Number.isNaN(avgResponseTime)) ? avgResponseTime : prev.averageResponseTime,
            errorRate: nextErrorRate,
            recentErrors: securityWindowErrors,
            systemHealth: allMetrics.health?.availability_percent
              ? Math.round(Number(allMetrics.health.availability_percent))
              : prev.systemHealth
          }))
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
      // ✅ Charger les préférences de rafraîchissement
      const loadRefreshIntervals = async () => {
        try {
          const metricsInterval = await preferencesService.getRefreshInterval('metrics')
          const dashboardInterval = await preferencesService.getRefreshInterval('dashboard')
          setMetricsRefreshInterval(metricsInterval)
          setServicesRefreshInterval(dashboardInterval)
        } catch (error) {
          console.error('Erreur chargement préférences:', error)
        }
      }
      loadRefreshIntervals()

      // ✅ OPTIMISATION : Délai initial pour ne pas bloquer le chargement principal
      const initialTimeout = setTimeout(() => {
        loadSystemMetrics()
        loadMaintenances()
      }, 500)
      
      // ✅ Actualiser selon les préférences utilisateur
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible' && !document.hidden) {
          loadSystemMetrics()
        }
      }, metricsRefreshInterval)
      
      return () => {
        clearTimeout(initialTimeout)
        clearInterval(interval)
      }
    }
  }, [isAuthenticated, metricsRefreshInterval])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        
        // Récupérer les statistiques depuis les services (avec gestion silencieuse des erreurs)
        const fetchWithFallback = async (promise: Promise<any>, fallback: any) => {
          try {
            const result = await promise
            return result
          } catch (error: any) {
            // Gérer les erreurs 500, 503, et autres erreurs serveur gracieusement
            const status = error?.response?.status
            const isServerError = status >= 500 && status < 600
            const isClientError = status >= 400 && status < 500
            
            // Ne log que les erreurs serveur (500+) ou les erreurs client critiques (401, 403)
            // Ignorer silencieusement les 404 et autres erreurs non critiques
            if (isServerError || (isClientError && (status === 401 || status === 403))) {
              // En développement, logger pour debug
              if (process.env.NODE_ENV === 'development') {
                console.warn('Error retrieving data:', {
                  status,
                  message: error.message,
                  url: error?.config?.url
                });
              }
            }
            // Toujours retourner le fallback pour éviter de bloquer l'interface
            return fallback
          }
        }

        // ✅ OPTIMISATION : Charger les données en parallèle mais avec cache et limites
        const cacheKey = `backoffice_overview_stats_${token?.substring(0, 10)}`
        const cached = await cacheManager?.get(cacheKey, { ttl: 15000 }) // Cache 15 secondes
        
        if (cached) {
          setStats(cached as typeof stats)
          setLoadingStats(false)
          // ✅ OPTIMISATION : Rafraîchir en arrière-plan sans bloquer
          Promise.all([
            fetchWithFallback(
              applicationService.getAll({ limit: 10 }).catch((error: any) => {
                if (error?.response?.status === 500) {
                  console.warn('[Vue d\'ensemble] Erreur 500 sur /api/v1/applications');
                }
                throw error;
              }),
              { data: { total: 0, applications: [] } }
            ),
            fetchWithFallback(
              axios.get(`${API_URL}/api/v1/auth/users?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: (status) => status < 500
              }).then(r => ({ data: r.data })).catch(e => {
                if (e.response?.status !== 401 && e.response?.status !== 403) {
                  return axios.get(`${API_URL}/api/v1/users?limit=10`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    validateStatus: (status) => status < 500
                  }).then(r => ({ data: r.data })).catch(() => ({ data: { users: [] } }));
                }
                return { data: { users: [] } };
              }),
              { data: { users: [] } }
            ),
            fetchWithFallback(
              companyService.getAll({ limit: 10 }),
              { data: { companies: [] } }
            ),
            fetchWithFallback(
              axios.get(`${API_URL}/api/v1/auth/sessions/active`, {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: (status) => status < 500
              }),
              { data: { total: 0, activeUsersLast30Min: 0 } }
            )
          ]).then(([applicationsResponse, usersResponse, companiesResponse, activeSessionsResponse]) => {
            const totalApplications = applicationsResponse?.data?.total || 0
            const totalUsers = usersResponse?.data?.users?.length || usersResponse?.data?.total || 0
            const totalCompanies = companiesResponse?.data?.companies?.length || 0
            const activeSessions = activeSessionsResponse?.data?.total || activeSessionsResponse?.data?.activeUsersLast30Min || (user ? 1 : 0)

            const newStats = {
              totalApplications,
              totalUsers,
              totalCompanies,
              activeUsers: activeSessions,
              activeSessions: activeSessions,
              systemHealth: 100,
              deploymentStatus: 'success' as const
            }

            setStats(prev => ({ ...prev, ...newStats }))
            cacheManager?.set(cacheKey, newStats, { ttl: 15000 }).catch(() => {})
          }).catch(() => {})
          return
        }
        
        // Pas de cache, charger les données
        const [
          applicationsResponse,
          usersResponse,
          companiesResponse,
          activeSessionsResponse
        ] = await Promise.all([
          fetchWithFallback(
            applicationService.getAll({ limit: 10 }).catch((error: any) => {
              if (error?.response?.status === 500) {
                console.warn('[Vue d\'ensemble] Erreur 500 sur /api/v1/applications');
              }
              throw error;
            }),
            { data: { total: 0, applications: [] } }
          ),
          fetchWithFallback(
            axios.get(`${API_URL}/api/v1/auth/users?limit=10`, {
              headers: { 'Authorization': `Bearer ${token}` },
              validateStatus: (status) => status < 500
            }).then(r => ({ data: r.data })).catch(e => {
              if (e.response?.status !== 401 && e.response?.status !== 403) {
                return axios.get(`${API_URL}/api/v1/users?limit=10`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                  validateStatus: (status) => status < 500
                }).then(r => ({ data: r.data })).catch(() => ({ data: { users: [] } }));
              }
              return { data: { users: [] } };
            }),
            { data: { users: [] } }
          ),
          fetchWithFallback(
            companyService.getAll({ limit: 10 }),
            { data: { companies: [] } }
          ),
          fetchWithFallback(
            axios.get(`${API_URL}/api/v1/auth/sessions/active`, {
              headers: { 'Authorization': `Bearer ${token}` },
              validateStatus: (status) => status < 500
            }),
            { data: { total: 0, activeUsersLast30Min: 0 } }
          )
        ])

        // Calculer les statistiques
        const totalApplications = applicationsResponse?.data?.total || 0
        const totalUsers = usersResponse?.data?.users?.length || usersResponse?.data?.total || 0
        const totalCompanies = companiesResponse?.data?.companies?.length || 0
        const activeSessions = activeSessionsResponse?.data?.total || activeSessionsResponse?.data?.activeUsersLast30Min || (user ? 1 : 0)

        const newStats = {
          totalApplications,
          totalUsers,
          totalCompanies,
          activeUsers: activeSessions,
          activeSessions: activeSessions,
          systemHealth: 100,
          deploymentStatus: 'success' as const
        }

        setStats(prev => ({
          ...prev,
          ...newStats
        }))
        
        // Mettre en cache
        await cacheManager?.set(cacheKey, newStats, { ttl: 15000 })
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

  // ✅ OPTIMISATION : Charger les services avec leurs métriques avec cache et délai
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const loadServicesWithMetrics = async () => {
      try {
        // ✅ OPTIMISATION : Utiliser le cache
        const cacheKey = 'backoffice_services_metrics'
        const cached = await cacheManager?.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
        
        if (cached && mounted) {
          setServicesWithMetrics(Array.isArray(cached) ? cached : [])
          // Rafraîchir en arrière-plan
          timeoutId = setTimeout(async () => {
            try {
              const servicesData = await centralMetricsService.getAllServices()
              if (servicesData && servicesData.length > 0 && mounted) {
                const updatedServices = services.map(service => {
                  const serviceData = servicesData.find((s: any) => s.name === service.name || s.id === service.id)
                  return serviceData ? { ...service, ...serviceData } : service
                })
                await cacheManager?.set(cacheKey, updatedServices, { ttl: 30000 })
                if (mounted) setServicesWithMetrics(updatedServices)
              }
            } catch (error) {
              // Ignorer les erreurs en arrière-plan
            }
          }, 1000)
          return
        }
        
        // ✅ OPTIMISATION : Délai initial pour ne pas bloquer le chargement principal
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const servicesData = await centralMetricsService.getAllServices()
        if (servicesData && servicesData.length > 0 && mounted) {
          // ✅ FUSIONNER avec les valeurs précédentes au lieu d'écraser
          setServicesWithMetrics((prevServices: any[]) => {
            // ✅ CORRECTION : S'assurer que prevServices est un tableau
            const safePrevServices = Array.isArray(prevServices) ? prevServices : []
            const updated = services.map(service => {
              // Trouver le service précédent pour garder ses valeurs
              const prevService = safePrevServices.find(s => s.id === service.id)
              
              // Chercher le service correspondant dans les données Docker
              const dockerService = servicesData.find((s: any) => 
                s.name?.includes(service.id) || s.name === `jobbingtrack-${service.id}`
              )
              
              // ✅ OPTIMISATION : Si on a des nouvelles données Docker, les utiliser avec logique stable
              if (dockerService) {
                // Logique de statut stable - ne changer que si nécessaire
                const dockerStatus = dockerService.is_running ? 'running' : 'stopped'
                // Garder l'ancien statut si le nouveau est 'stopped' mais l'ancien était 'running'
                // (éviter les changements erratiques dus aux requêtes qui échouent temporairement)
                const finalStatus = (prevService?.status === 'running' && dockerStatus === 'stopped' && !dockerService.is_healthy) 
                  ? prevService.status  // Garder 'running' si on était en ligne et que la requête échoue
                  : dockerStatus
                
                return {
                  ...service,
                  status: finalStatus,
                  metrics: dockerService.metrics ? {
                    cpu: dockerService.metrics.cpu_percent,
                    memory: {
                      percent: dockerService.metrics.memory_percent,
                      usage: dockerService.metrics.memory_usage_mb
                    },
                    pids: dockerService.metrics.pids
                  } : prevService?.metrics,
                  health: prevService?.health || (dockerService.is_healthy ? { status: 'healthy' } : { status: 'unhealthy' }),
                  responseTime: prevService?.responseTime || 'N/A',
                  uptime: prevService?.uptime || (dockerService.is_running ? 'En ligne' : 'Hors ligne')
                }
              }
              
              // Pas de nouvelles données Docker, garder les anciennes valeurs
              return prevService || service
            })
            return updated
          })
        }
        // ✅ Ne rien faire si pas de données - garder les valeurs existantes
      } catch (error) {
        console.error('Erreur chargement services:', error)
        // ✅ Ne rien faire en cas d'erreur - garder les valeurs existantes
      }
    }

    // ✅ Charger les préférences de rafraîchissement
    const loadRefreshIntervals = async () => {
      try {
        const servicesInterval = await preferencesService.getRefreshInterval('services')
        setServicesRefreshInterval(servicesInterval)
      } catch (error) {
        console.error('Erreur chargement préférences:', error)
      }
    }
    loadRefreshIntervals()

    loadServicesWithMetrics()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        loadServicesWithMetrics()
      }
    }, servicesRefreshInterval)
    return () => clearInterval(interval)
  }, [servicesRefreshInterval])

  // Charger les maintenances au démarrage
  useEffect(() => {
    if (isAuthenticated && token) {
      loadMaintenances()
    }
  }, [isAuthenticated, token])

  // ✅ OPTIMISATION : Mémoriser le statut des services simulés avec useMemo
  const generateServiceStatus = useMemo(() => {
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
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState 
            message="Chargement du tableau de bord..." 
            size="lg"
            fullScreen={false}
          />
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
        {/* Ligne 1 : pilotage produit / dispo — Ligne 2 : ressources conteneurs (évite 6 cartes serrées sur une seule rangée) */}
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <MetricCard
              title="Sessions actives"
              value={stats.activeUsers !== undefined ? stats.activeUsers : '...'}
              subtitle={`${stats.totalUsers || 0} utilisateurs`}
              icon={<Users className="h-6 w-6" />}
              color="green"
              href="/backoffice/users"
            />
            <MetricCard
              title="Incidents sécurité"
              value={stats.recentErrors !== undefined ? stats.recentErrors : '...'}
              subtitle="Fenêtre courte (agrégateur), pas 24 h"
              icon={<Shield className="h-6 w-6" />}
              color="red"
              href="/backoffice/security"
            />
            <MetricCard
              title="Santé système"
              value={stats.systemHealth !== undefined ? `${stats.systemHealth}%` : '...'}
              subtitle="Disponibilité"
              icon={<Zap className="h-6 w-6" />}
              color="blue"
            />
            <MetricCard
              title="Temps de réponse"
              value={stats.averageResponseTime != null && typeof stats.averageResponseTime === 'number' ? `${Math.round(stats.averageResponseTime)}ms` : 'N/A'}
              subtitle="Moyenne agrégée"
              icon={<Clock className="h-6 w-6" />}
              color="purple"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 xl:max-w-3xl gap-4 md:gap-6">
            <MetricCard
              title="CPU projet (conteneurs)"
              value={systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
                ? `${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.averagePercent, 1)}%`
                : systemMetrics?.cpu?.containers_only !== undefined
                ? `${safeToFixed(systemMetrics.cpu.containers_only, 1)}%`
                : '...'}
              subtitle={systemMetrics?.jobbingtrack?.containers?.cpu?.totalPercent !== undefined
                ? `Total ${safeToFixed(systemMetrics.jobbingtrack.containers.cpu.totalPercent, 1)}% (somme CPUs cont.) · ${systemMetrics.jobbingtrack.containers.count || 0} cont. — peut varier si la détection change`
                : systemMetrics?.jobbingtrack?.containers?.count !== undefined
                ? `${systemMetrics.jobbingtrack.containers.count} conteneurs JobbingTrack`
                : '...'}
              icon={<Cpu className="h-6 w-6" />}
              color={
                (systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
                  ? systemMetrics.jobbingtrack.containers.cpu.averagePercent
                  : systemMetrics?.cpu?.containers_only) > 80
                ? 'red'
                : (systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
                  ? systemMetrics.jobbingtrack.containers.cpu.averagePercent
                  : systemMetrics?.cpu?.containers_only) > 60
                ? 'yellow'
                : 'green'}
            />
            <MetricCard
              title="Mémoire projet (conteneurs)"
              value={systemMetrics?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
                ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.percent_of_system, 1)}%`
                : systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined
                ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.percent, 1)}%`
                : '...'}
              subtitle={systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.memory?.total_mb
                ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.memory.total_mb, 0)} MB système · ${systemMetrics.jobbingtrack.containers.count || 0} cont.`
                : systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.jobbingtrack?.containers?.memory?.limit
                ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.jobbingtrack.containers.memory.limit, 0)} MB limite`
                : '...'}
              icon={<MemoryStick className="h-6 w-6" />}
              color={
                (systemMetrics?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
                  ? systemMetrics.jobbingtrack.containers.memory.percent_of_system
                  : systemMetrics?.jobbingtrack?.containers?.memory?.percent) > 20
                ? 'red'
                : (systemMetrics?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
                  ? systemMetrics.jobbingtrack.containers.memory.percent_of_system
                  : systemMetrics?.jobbingtrack?.containers?.memory?.percent) > 10
                ? 'yellow'
                : 'green'}
            />
          </div>
        </div>

        {/* Métriques système principales */}
        <MetricsErrorBoundary>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              État du système
              <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">⚡ metrics-aggregator</span>
              {/* ✅ Afficher X/Y services et X/Y conteneurs */}
              {(() => {
                const svcList = Array.isArray(servicesWithMetrics) ? servicesWithMetrics : []
                const healthyServices = svcList.filter(s => (s.health?.status === 'healthy' || s.status === 'running')).length
                const totalServices = expectedServicesCount
                const containersCount = Number(systemMetrics?.jobbingtrack?.containers?.count || 0)
                const containersLabel = containersCount > 0
                  ? `${containersCount}/${expectedJobbingtrackContainers} conteneurs`
                  : `—/${expectedJobbingtrackContainers} conteneurs`
                return (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 px-2 py-1 rounded">
                    {healthyServices}/{totalServices} services • {containersLabel}
                  </span>
                )
              })()}
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                loadingSystemMetrics 
                  ? 'bg-yellow-500 animate-pulse' 
                  : systemMetrics 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
              }`}></div>
              <span className={`text-sm ${
                loadingSystemMetrics 
                  ? 'text-yellow-600' 
                  : systemMetrics 
                    ? 'text-green-600' 
                    : 'text-red-600'
              }`}>
                {loadingSystemMetrics ? 'Connexion...' : systemMetrics ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Charge Système + Disque en dessous */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                (() => {
                  const loadValue = systemMetrics?.cpu?.load_1 !== undefined && systemMetrics.cpu.load_1 > 0
                    ? systemMetrics.cpu.load_1
                    : systemMetrics?.load?.load_1 !== undefined && systemMetrics.load.load_1 > 0
                    ? systemMetrics.load.load_1
                    : systemMetrics?.load?.average !== undefined
                    ? systemMetrics.load.average
                    : 0;
                  const cores = systemMetrics?.cpu?.cores && systemMetrics.cpu.cores !== 'N/A' && parseInt(systemMetrics.cpu.cores) > 0
                    ? parseInt(systemMetrics.cpu.cores)
                    : systemMetrics?.load?.cores && systemMetrics.load.cores !== 'N/A' && parseInt(systemMetrics.load.cores) > 0
                    ? parseInt(systemMetrics.load.cores)
                    : 1;
                  const loadPerCore = cores > 0 ? loadValue / cores : loadValue;
                  return loadPerCore > 1.5 ? 'text-red-600 dark:text-red-400' : loadPerCore > 1.0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400';
                })()
              }`}>
                {systemMetrics?.cpu?.load_1 !== undefined && systemMetrics.cpu.load_1 > 0
                  ? safeToFixed(systemMetrics.cpu.load_1, 2, '0.00')
                  : systemMetrics?.load?.load_1 !== undefined && systemMetrics.load.load_1 > 0
                  ? safeToFixed(systemMetrics.load.load_1, 2, '0.00')
                  : systemMetrics?.load?.average !== undefined
                  ? safeToFixed(systemMetrics.load.average, 2, '0.00')
                  : loadingSystemMetrics ? '...' : '0.00'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <span>Charge Système</span>
                {systemMetrics?.cpu?.load_1 !== undefined && systemMetrics.cpu.cores && systemMetrics.cpu.cores !== 'N/A' && parseInt(systemMetrics.cpu.cores) > 0 && (
                  <span className={`text-xs ${(systemMetrics.cpu.load_1 / parseInt(systemMetrics.cpu.cores)) > 1.5 ? 'text-red-500' : (systemMetrics.cpu.load_1 / parseInt(systemMetrics.cpu.cores)) > 1.0 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {(systemMetrics.cpu.load_1 / parseInt(systemMetrics.cpu.cores)) > 1.5 ? '🔴' : (systemMetrics.cpu.load_1 / parseInt(systemMetrics.cpu.cores)) > 1.0 ? '🟡' : '🟢'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.cpu?.cores && systemMetrics.cpu.cores !== 'N/A' && parseInt(systemMetrics.cpu.cores) > 0
                  ? `${systemMetrics.cpu.cores} coeurs`
                  : systemMetrics?.load?.cores && systemMetrics.load.cores !== 'N/A'
                  ? `${systemMetrics.load.cores} coeurs`
                  : 'N/A'}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                  <span>Disque</span>
                  {(typeof systemMetrics?.disk?.[0]?.usage_percent === 'number' || typeof systemMetrics?.disk?.[0]?.usage === 'number') && (
                    (() => {
                      const pct = Number(systemMetrics.disk[0].usage_percent ?? systemMetrics.disk[0].usage)
                      return (
                        <span className={`text-xs ${pct > 90 ? 'text-red-500' : pct > 80 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {pct > 90 ? '🔴' : pct > 80 ? '🟡' : '🟢'}
                        </span>
                      )
                    })()
                  )}
                </div>
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {(typeof systemMetrics?.disk?.[0]?.usage_percent === 'number' || typeof systemMetrics?.disk?.[0]?.usage === 'number')
                    ? `${safeToFixed(Number(systemMetrics.disk[0].usage_percent ?? systemMetrics.disk[0].usage), 1)}%`
                    : loadingSystemMetrics ? '...' : 'N/A'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {systemMetrics?.disk?.[0]?.used != null && systemMetrics?.disk?.[0]?.total != null
                    ? `${systemMetrics.disk[0].used} / ${systemMetrics.disk[0].total} GB`
                    : systemMetrics?.jobbingtrack?.disk?.[0]?.used_human && systemMetrics?.jobbingtrack?.disk?.[0]?.total_human
                    ? `${systemMetrics.jobbingtrack.disk[0].used_human} / ${systemMetrics.jobbingtrack.disk[0].total_human}`
                    : loadingSystemMetrics ? '...' : 'N/A'}
                </div>
              </div>
            </div>

            {/* 2. CPU Système avec CPU Projet en dessous */}
            {/* 3. Mémoire Système + Mémoire Projet en dessous */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                (systemMetrics?.cpu?.usage_percent !== undefined && systemMetrics.cpu.usage_percent > 0) || (typeof systemMetrics?.cpu?.usage === 'number' && systemMetrics.cpu.usage > 0)
                  ? ((systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 80 ? 'text-red-600 dark:text-red-400' : (systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')
                  : systemMetrics?.monitoringC?.avg_cpu_percent !== undefined && systemMetrics.monitoringC.avg_cpu_percent > 0
                  ? (systemMetrics.monitoringC.avg_cpu_percent > 80 ? 'text-red-600 dark:text-red-400' : systemMetrics.monitoringC.avg_cpu_percent > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {(systemMetrics?.cpu?.usage_percent !== undefined && systemMetrics.cpu.usage_percent > 0)
                  ? `${safeToFixed(systemMetrics.cpu.usage_percent, 1)}%`
                  : (typeof systemMetrics?.cpu?.usage === 'number' && systemMetrics.cpu.usage > 0)
                  ? `${safeToFixed(systemMetrics.cpu.usage, 1)}%`
                  : systemMetrics?.monitoringC?.avg_cpu_percent !== undefined && systemMetrics.monitoringC.avg_cpu_percent > 0
                  ? `${safeToFixed(systemMetrics.monitoringC.avg_cpu_percent, 1)}%`
                  : loadingSystemMetrics ? '...' : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <span>CPU Système</span>
                {((systemMetrics?.cpu?.usage_percent !== undefined) || (typeof systemMetrics?.cpu?.usage === 'number')) && (
                  <span className={`text-xs ${(systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 80 ? 'text-red-500' : (systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {(systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 80 ? '🔴' : (systemMetrics.cpu.usage_percent ?? systemMetrics.cpu.usage) > 60 ? '🟡' : '🟢'}
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold mt-1">
                {(() => {
                  const cpuProject = systemMetrics?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
                    ? systemMetrics.jobbingtrack.containers.cpu.averagePercent
                    : systemMetrics?.cpu?.containers_only !== undefined
                    ? systemMetrics.cpu.containers_only
                    : null
                  if (cpuProject === null) return <span className="text-gray-700 dark:text-gray-300">—</span>
                  const colorClass = cpuProject > 80
                    ? 'text-red-600 dark:text-red-400'
                    : cpuProject > 60
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                  const indicator = cpuProject > 80 ? '🔴' : cpuProject > 60 ? '🟡' : '🟢'
                  return <span className={colorClass}>{indicator} {safeToFixed(cpuProject, 1)}%</span>
                })()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">CPU Projet</div>
            </div>

            <div className="text-center">
              <div className={`text-3xl font-bold ${
                systemMetrics?.memory?.usage_percent !== undefined
                  ? (systemMetrics.memory.usage_percent > 90 ? 'text-red-600 dark:text-red-400' : systemMetrics.memory.usage_percent > 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')
                  : systemMetrics?.memory?.usage !== undefined 
                  ? (() => {
                      const memUsage = parseFloat(systemMetrics.memory.usage.toString().replace('%', ''));
                      return memUsage > 90 ? 'text-red-600 dark:text-red-400' : memUsage > 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400';
                    })()
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {systemMetrics?.memory?.usage_percent !== undefined
                  ? `${safeToFixed(systemMetrics.memory.usage_percent, 1)}%`
                  : systemMetrics?.memory?.usage !== undefined 
                  ? `${safeToFixed(parseFloat(systemMetrics.memory.usage.toString().replace('%', '')), 1)}%`
                  : loadingSystemMetrics ? '...' : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <span>Mémoire Système</span>
                {systemMetrics?.memory?.usage_percent !== undefined && (
                  <span className={`text-xs ${systemMetrics.memory.usage_percent > 90 ? 'text-red-500' : systemMetrics.memory.usage_percent > 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {systemMetrics.memory.usage_percent > 90 ? '🔴' : systemMetrics.memory.usage_percent > 75 ? '🟡' : '🟢'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.memory?.used_mb && systemMetrics?.memory?.total_mb
                  ? `${safeToFixed(systemMetrics.memory.used_mb, 0)} MB / ${safeToFixed(systemMetrics.memory.total_mb, 0)} MB`
                  : systemMetrics?.memory?.used && systemMetrics?.memory?.total
                  ? `${systemMetrics.memory.used} / ${systemMetrics.memory.total}` 
                  : '...'}
              </div>
              <div className="text-2xl font-bold mt-2">
                {(() => {
                  const memPct = systemMetrics?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
                    ? systemMetrics.jobbingtrack.containers.memory.percent_of_system
                    : systemMetrics?.jobbingtrack?.containers?.memory?.percent !== undefined
                    ? systemMetrics.jobbingtrack.containers.memory.percent
                    : null
                  if (memPct === null) return <span className="text-gray-500 dark:text-gray-500">Mémoire Projet: —</span>
                  const colorClass = memPct > 20
                    ? 'text-red-600 dark:text-red-400'
                    : memPct > 10
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                  const indicator = memPct > 20 ? '🔴' : memPct > 10 ? '🟡' : '🟢'
                  return <span className={colorClass}>{indicator} {safeToFixed(memPct, 1)}%</span>
                })()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire Projet</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.memory?.total_mb
                  ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.memory.total_mb, 0)} MB système`
                  : systemMetrics?.jobbingtrack?.containers?.memory?.used && systemMetrics?.jobbingtrack?.containers?.memory?.limit
                  ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.jobbingtrack.containers.memory.limit, 0)} MB limite`
                  : '...'}
              </div>
            </div>

            {/* 4. Conteneurs actifs + état Services en dessous */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemMetrics?.jobbingtrack?.containers?.count !== undefined 
                  ? systemMetrics.jobbingtrack.containers.count 
                  : containerMetrics && Object.keys(containerMetrics).length > 0
                  ? Object.keys(containerMetrics).length
                  : '...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Conteneurs actifs</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(systemMetrics?.jobbingtrack?.containers?.count !== undefined && systemMetrics.jobbingtrack.containers.count > 0) || 
                 (containerMetrics && Object.keys(containerMetrics).length > 0)
                  ? 'Conteneurs détectés' 
                  : systemMetrics ? 'Aucun conteneur détecté' : '...'}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const svcList = Array.isArray(servicesWithMetrics) ? servicesWithMetrics : []
                    const healthyServices = svcList.filter(s => (s.health?.status === 'healthy' || s.status === 'running')).length
                    return `${healthyServices}/${expectedServicesCount}`
                  })()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(() => {
                    const svcList = Array.isArray(servicesWithMetrics) ? servicesWithMetrics : []
                    const healthyServices = svcList.filter(s => (s.health?.status === 'healthy' || s.status === 'running')).length
                    const isOk = healthyServices >= expectedServicesCount
                    return loadingSystemMetrics ? '...' : isOk ? '🟢 OK' : `🟡 ${expectedServicesCount - healthyServices} KO`
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Métriques des conteneurs JobbingTrack - Toujours visible */}
          {systemMetrics?.jobbingtrack?.containers?.count !== undefined ? (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                📦 Métriques Projet - Conteneurs JobbingTrack ({systemMetrics.jobbingtrack.containers.count})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Moyen (Projet)</span>
                    <span className={`text-lg font-bold ${systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 80 ? 'text-red-600 dark:text-red-400' : systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined 
                        ? `${systemMetrics.jobbingtrack.containers.cpu.averagePercent.toFixed(1)}%` 
                        : '...'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 80 ? 'bg-red-500' : systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.cpu?.averagePercent || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total: {systemMetrics.jobbingtrack.containers.cpu?.totalPercent !== undefined 
                      ? `${systemMetrics.jobbingtrack.containers.cpu.totalPercent.toFixed(1)}%` 
                      : '...'} • 
                    {systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 80 
                      ? ' 🔴 Élevé' 
                      : systemMetrics.jobbingtrack.containers.cpu?.averagePercent !== undefined && systemMetrics.jobbingtrack.containers.cpu.averagePercent > 60 
                      ? ' 🟡 Modéré' 
                      : ' 🟢 Normal'}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mémoire Utilisée (Projet)</span>
                    <span className={`text-lg font-bold ${systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 20 ? 'text-red-600 dark:text-red-400' : systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                      {systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined 
                        ? `${systemMetrics.jobbingtrack.containers.memory.percent_of_system.toFixed(1)}%` 
                        : systemMetrics.jobbingtrack.containers.memory?.percent !== undefined
                        ? `${systemMetrics.jobbingtrack.containers.memory.percent.toFixed(1)}%`
                        : '...'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 20 ? 'bg-red-500' : systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(systemMetrics.jobbingtrack.containers.memory?.percent_of_system || systemMetrics.jobbingtrack.containers.memory?.percent || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {systemMetrics.jobbingtrack.containers.memory?.used && systemMetrics?.memory?.total_mb
                      ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.memory.total_mb, 0)} MB système`
                      : systemMetrics.jobbingtrack.containers.memory?.used && systemMetrics.jobbingtrack.containers.memory?.limit 
                      ? `${safeToFixed(systemMetrics.jobbingtrack.containers.memory.used, 0)} MB / ${safeToFixed(systemMetrics.jobbingtrack.containers.memory.limit, 0)} MB limite`
                      : '...'} • 
                    {systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 20 
                      ? ' 🔴 Élevé' 
                      : systemMetrics.jobbingtrack.containers.memory?.percent_of_system !== undefined && systemMetrics.jobbingtrack.containers.memory.percent_of_system > 10 
                      ? ' 🟡 Modéré' 
                      : ' 🟢 Normal'}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                <p className="font-medium mb-1">💡 Explication des métriques :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Charge Système</strong> : Load average sur 1 minute. Normal si {'<'} 1.0 par core, critique si {'>'} 1.5 par core</li>
                  <li><strong>CPU Système</strong> : Utilisation CPU globale de la machine (tous les processus). Seuil critique: {'>'} 80%. <strong>CPU Projet</strong> en dessous : CPU des conteneurs JobbingTrack uniquement</li>
                  <li><strong>Mémoire Système</strong> : Mémoire totale utilisée par tout le système. Seuil critique: {'>'} 90%</li>
                  <li><strong>Conteneurs actifs</strong> : Nombre de conteneurs JobbingTrack actuellement actifs</li>
                  <li><strong>Mémoire Projet</strong> : Part de la mémoire système utilisée par les conteneurs JobbingTrack. Seuil critique: {'>'} 20%</li>
                </ul>
                <p className="mt-2 font-medium">🎨 Indicateurs :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>🟢 <strong>Vert</strong> : Normal - Tout fonctionne bien</li>
                  <li>🟡 <strong>Jaune</strong> : Attention - Surveillance recommandée</li>
                  <li>🔴 <strong>Rouge</strong> : Critique - Action requise</li>
                </ul>
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
              <h3
                className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                title="Le point vert = service considéré joignable. « En ligne » ou « ~X ms » s’affiche quand l’uptime détaillé n’est pas fourni par l’agrégateur."
              >
                <Settings className="h-5 w-5" />
                État des services
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
              {(Array.isArray(servicesWithMetrics) && servicesWithMetrics.length > 0 ? servicesWithMetrics : generateServiceStatus).slice(0, 5).map((service: any, index: number) => (
                <div key={service.id || service.name || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${service.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{service.name || service.id}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                    {serviceAvailabilityCaption(service)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Métriques de performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div>
                <h3
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                  title="Les valeurs viennent du metrics-aggregator (latence, débit erreurs) et de l’API auth (sessions). Ce n’est pas un APM complet."
                >
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                  Agrégateur : temps de réponse moyen, débit d&apos;erreurs (erreurs/min, pas un %). Auth : sessions actives.
                </p>
              </div>
              <Link
                href="/services/backoffice"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Services &amp; logs →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title="Moyenne remontée par monitoring / metrics-aggregator (fenêtre courante)"
                >
                  Temps de réponse (moy.)
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {typeof stats.averageResponseTime === 'number' && !Number.isNaN(stats.averageResponseTime)
                    ? `${Math.round(stats.averageResponseTime)}ms`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title="Champ rate_per_min côté agrégateur : nombre d’erreurs par minute, pas un pourcentage"
                >
                  Débit d&apos;erreurs (agrégateur)
                </span>
                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {typeof stats.errorRate === 'number' && !Number.isNaN(stats.errorRate)
                    ? `${stats.errorRate.toFixed(2)} /min`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title="GET /api/v1/auth/sessions/active — total ou utilisateurs actifs récents selon réponse API"
                >
                  Sessions actives (auth)
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 tabular-nums">{stats.activeSessions || 0}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3">
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title="Pourcentage de disponibilité agrégé (carte Santé système en haut de page)"
                >
                  Disponibilité (synthèse)
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {typeof stats.systemHealth === 'number' && !Number.isNaN(stats.systemHealth)
                    ? `${Math.round(stats.systemHealth)}%`
                    : 'N/A'}
                </span>
              </div>
              {/* ✅ NOUVEAU : Trafic réseau */}
              {systemMetrics?.network && (
                <>
                  <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Wifi className="h-4 w-4" />
                      Trafic Réseau (RX)
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {systemMetrics.network.total_rx_mb !== undefined 
                        ? `${systemMetrics.network.total_rx_mb.toFixed(2)} MB`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Wifi className="h-4 w-4" />
                      Trafic Réseau (TX)
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {systemMetrics.network.total_tx_mb !== undefined 
                        ? `${systemMetrics.network.total_tx_mb.toFixed(2)} MB`
                        : 'N/A'}
                    </span>
                  </div>
                </>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-3 mt-1 border-t border-dashed border-gray-200 dark:border-gray-600 leading-relaxed">
                Un débit à 0 peut indiquer une fenêtre sans erreurs agrégées ou une métrique non alimentée ; pour le détail par service, utiliser Services &amp; logs ou le lot B (logs multi-sources, voir doc projet).
              </p>
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
                  {((Array.isArray(servicesWithMetrics) && servicesWithMetrics.length > 0) ? servicesWithMetrics : (Array.isArray(services) ? services : [])).map((service) => {
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
                    {((Array.isArray(servicesWithMetrics) && servicesWithMetrics.length > 0) ? servicesWithMetrics : (Array.isArray(services) ? services : [])).length} services disponibles
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

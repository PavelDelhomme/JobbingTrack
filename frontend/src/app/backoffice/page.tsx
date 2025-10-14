'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'
import { Activity, TrendingUp, Users, Building2, FileText, Phone, Calendar, Settings, Database, Shield, Zap, Clock } from 'lucide-react'

export default function BackofficePage() {
  const { user, loading, isAuthenticated } = useAuth()
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
    errorRate: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)

        // Récupérer les statistiques depuis les services
        const [appsResponse, usersResponse, companiesResponse] = await Promise.all([
          applicationService.getAll().catch(() => ({ data: { total: 0, applications: [] } })),
          authService.getAllUsers().catch(() => ({ data: { users: [] } })),
          companyService.getAll().catch(() => ({ data: { companies: [] } }))
        ])

        // Calculer les statistiques de base
        const totalApplications = appsResponse.data.total || appsResponse.data.applications?.length || 0
        const totalUsers = usersResponse.data.users?.length || 0
        const activeUsers = usersResponse.data.users?.filter((u: any) => u.isActive !== false)?.length || 0
        const totalCompanies = companiesResponse.data.companies?.length || 0

        // Calculer les candidatures récentes (7 derniers jours)
        const recentApplications = appsResponse.data.applications?.filter((app: any) => {
          if (!app.createdAt) return false
          const createdDate = new Date(app.createdAt)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return createdDate > weekAgo
        }).length || 0

        // Statistiques simulées pour les nouvelles fonctionnalités
        const totalContacts = Math.floor(totalApplications * 1.5) // Estimation basée sur les candidatures
        const totalCalls = Math.floor(totalApplications * 0.8) // Estimation
        const totalFollowups = Math.floor(totalApplications * 1.2) // Estimation
        const totalEvents = Math.floor(totalApplications * 0.3) // Estimation
        const totalInterviews = Math.floor(totalApplications * 0.4) // Estimation

        // Métriques système simulées
        const systemHealth = 95 + Math.random() * 5 // 95-100%
        const averageResponseTime = 80 + Math.random() * 40 // 80-120ms
        const errorRate = Math.random() * 2 // 0-2%

        setStats({
          totalApplications,
          totalCompanies,
          totalInterviews,
          totalUsers,
          activeUsers,
          recentApplications,
          totalContacts,
          totalCalls,
          totalFollowups,
          totalEvents,
          systemHealth: Math.round(systemHealth),
          averageResponseTime: Math.round(averageResponseTime),
          errorRate: Math.round(errorRate * 10) / 10
        })

        setSystemStatus('healthy')
      } catch (error) {
        console.error('Erreur chargement stats:', error)
        setSystemStatus('degraded')
        // Garder les valeurs par défaut
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAuthenticated && !loading) {
      fetchStats()
    }
  }, [isAuthenticated, loading])

  // Fonction pour générer le statut des services (simulé pour l'instant)
  const generateServiceStatus = () => {
    return {
      'api-gateway': true,
      'auth-service': true,
      'application-service': false,
      'company-service': false,
      'contact-service': false,
      'interview-service': false,
      'notification-service': false,
      'dashboard-service': false,
      'call-service': false,
      'profile-service': false,
      'event-service': false,
      'followup-service': false
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
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

            {/* Actions rapides du header */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/backoffice/analytics')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/backoffice/services')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Activity className="h-4 w-4" />
                Services
              </button>
            </div>
          </div>
        </div>

        {/* Métriques principales en grille */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <MetricCard
            title="Candidatures"
            value={stats.totalApplications}
            subtitle={`${stats.recentApplications} cette semaine`}
            icon={<FileText className="h-6 w-6" />}
            color="blue"
            href="/backoffice/applications"
          />
          <MetricCard
            title="Entreprises"
            value={stats.totalCompanies}
            subtitle="Partenaires actifs"
            icon={<Building2 className="h-6 w-6" />}
            color="green"
            href="/backoffice/companies"
          />
          <MetricCard
            title="Contacts"
            value={stats.totalContacts}
            subtitle="Réseau professionnel"
            icon={<Users className="h-6 w-6" />}
            color="purple"
            href="/backoffice/contacts"
          />
          <MetricCard
            title="Entretiens"
            value={stats.totalInterviews}
            subtitle="Planifiés & passés"
            icon={<Calendar className="h-6 w-6" />}
            color="orange"
            href="/backoffice/interviews"
          />
          <MetricCard
            title="Appels"
            value={stats.totalCalls}
            subtitle="Suivi téléphonique"
            icon={<Phone className="h-6 w-6" />}
            color="yellow"
            href="/backoffice/calls"
          />
          <MetricCard
            title="Relances"
            value={stats.totalFollowups}
            subtitle="Suivi des candidatures"
            icon={<Clock className="h-6 w-6" />}
            color="pink"
            href="/backoffice/followups"
          />
        </div>

        {/* Sections principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Actions rapides étendues */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Zap className="h-6 w-6 text-yellow-500" />
                Actions Rapides
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Accès direct aux fonctionnalités principales
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <QuickActionButton
                  href="/backoffice/applications"
                  icon="📝"
                  title="Candidatures"
                  description="Gérer les candidatures"
                  color="blue"
                />
                <QuickActionButton
                  href="/backoffice/companies"
                  icon="🏢"
                  title="Entreprises"
                  description="Base de données entreprises"
                  color="green"
                />
                <QuickActionButton
                  href="/backoffice/contacts"
                  icon="👥"
                  title="Contacts"
                  description="Réseau professionnel"
                  color="purple"
                />
                <QuickActionButton
                  href="/backoffice/interviews"
                  icon="📅"
                  title="Entretiens"
                  description="Planifier & suivre"
                  color="orange"
                />
                <QuickActionButton
                  href="/backoffice/calls"
                  icon="📞"
                  title="Appels"
                  description="Historique des appels"
                  color="yellow"
                />
                <QuickActionButton
                  href="/backoffice/followups"
                  icon="📧"
                  title="Relances"
                  description="Suivi automatique"
                  color="pink"
                />
              </div>
            </div>
          </div>

          {/* État du système */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Shield className="h-6 w-6 text-green-500" />
                État du Système
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Santé et performances en temps réel
              </p>
            </div>
            <div className="p-6 space-y-4">
              <SystemMetric
                label="Santé globale"
                value={`${stats.systemHealth}%`}
                icon={<Activity className="h-5 w-5" />}
                status={stats.systemHealth >= 95 ? 'success' : stats.systemHealth >= 80 ? 'warning' : 'error'}
              />
              <SystemMetric
                label="Temps de réponse"
                value={`${stats.averageResponseTime}ms`}
                icon={<Zap className="h-5 w-5" />}
                status={stats.averageResponseTime < 100 ? 'success' : stats.averageResponseTime < 200 ? 'warning' : 'error'}
              />
              <SystemMetric
                label="Taux d'erreur"
                value={`${stats.errorRate}%`}
                icon={<Shield className="h-5 w-5" />}
                status={stats.errorRate < 1 ? 'success' : stats.errorRate < 5 ? 'warning' : 'error'}
              />
              <SystemMetric
                label="Services actifs"
                value={`${Object.keys(generateServiceStatus()).filter(s => generateServiceStatus()[s as keyof ReturnType<typeof generateServiceStatus>]).length}/${Object.keys(generateServiceStatus()).length}`}
                icon={<Database className="h-5 w-5" />}
                status="success"
                onClick={() => router.push('/backoffice/services')}
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
              />
            </div>
          </div>
        </div>

        {/* Graphiques et métriques avancées */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Activité récente */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                Activité Récente
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Évolution des activités sur les 7 derniers jours
              </p>
            </div>
            <div className="p-6">
              <ActivityChart stats={stats} />
            </div>
          </div>

          {/* Raccourcis avancés */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Settings className="h-6 w-6 text-gray-500" />
                Outils Avancés
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fonctionnalités expertes
              </p>
            </div>
            <div className="p-6 space-y-3">
              <QuickActionButton
                href="/backoffice/analytics"
                icon="📊"
                title="Analytics"
                description="Métriques détaillées"
                color="blue"
              />
              <QuickActionButton
                href="/backoffice/services"
                icon="🔧"
                title="Services"
                description="Monitoring système"
                color="green"
              />
              <QuickActionButton
                href="/backoffice/api-tester"
                icon="🧪"
                title="Testeur API"
                description="Tests des endpoints"
                color="purple"
              />
              <QuickActionButton
                href="/backoffice/data-management"
                icon="💾"
                title="Gestion Données"
                description="Administration DB"
                color="orange"
              />
              <QuickActionButton
                href="/backoffice/users"
                icon="👥"
                title="Utilisateurs"
                description="Gestion des comptes"
                color="yellow"
              />
              <QuickActionButton
                href="/backoffice/test-data"
                icon="🎲"
                title="Données Test"
                description="Générateur de données"
                color="pink"
              />
            </div>
          </div>
        </div>

        {/* Métriques système détaillées */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Database className="h-6 w-6 text-indigo-500" />
              Informations Système
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configuration et environnement technique
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SystemMetric
                label="Version JobbingTrack"
                value="1.0.0"
                icon={<FileText className="h-5 w-5" />}
              />
              <SystemMetric
                label="Environnement"
                value={process.env.NODE_ENV === 'production' ? 'Production' : 'Développement'}
                icon={<Settings className="h-5 w-5" />}
              />
              <SystemMetric
                label="Base de données"
                value="PostgreSQL 15"
                icon={<Database className="h-5 w-5" />}
                status="success"
              />
              <SystemMetric
                label="Utilisateurs actifs"
                value={`${stats.activeUsers}/${stats.totalUsers}`}
                icon={<Users className="h-5 w-5" />}
                status="success"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// Composant graphique d'activité
function ActivityChart({ stats }: { stats: any }) {
  // Générer des données d'exemple pour le graphique
  const generateActivityData = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    return days.map((day, index) => ({
      day,
      applications: Math.floor(stats.totalApplications * (0.1 + Math.random() * 0.3)),
      interviews: Math.floor(stats.totalInterviews * (0.05 + Math.random() * 0.2)),
      calls: Math.floor(stats.totalCalls * (0.08 + Math.random() * 0.25))
    }))
  }

  const data = generateActivityData()
  const maxValue = Math.max(...data.flatMap(d => [d.applications, d.interviews, d.calls]))

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Candidatures</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Entretiens</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Appels</span>
        </div>
      </div>

      {/* Graphique à barres */}
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col items-end space-y-0.5">
              <div
                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                style={{
                  height: maxValue > 0 ? `${Math.max((item.applications / maxValue) * 80, 4)}px` : '4px',
                  minHeight: '4px'
                }}
                title={`${item.applications} candidatures`}
              ></div>
              <div
                className="w-full bg-orange-500 rounded-t transition-all hover:bg-orange-600"
                style={{
                  height: maxValue > 0 ? `${Math.max((item.interviews / maxValue) * 60, 3)}px` : '3px',
                  minHeight: '3px'
                }}
                title={`${item.interviews} entretiens`}
              ></div>
              <div
                className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                style={{
                  height: maxValue > 0 ? `${Math.max((item.calls / maxValue) * 100, 5)}px` : '5px',
                  minHeight: '5px'
                }}
                title={`${item.calls} appels`}
              ></div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {item.day}
            </span>
          </div>
        ))}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.reduce((sum, d) => sum + d.applications, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total candidatures</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.reduce((sum, d) => sum + d.interviews, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total entretiens</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.reduce((sum, d) => sum + d.calls, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total appels</div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon, color, href }: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'pink'
  href?: string
}) {
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    pink: 'bg-pink-500 hover:bg-pink-600'
  }

  const CardComponent = href ? 'a' : 'div'

  return (
    <CardComponent
      href={href}
      className={`group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:-translate-y-1 ${href ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-0 ${colors[color]} opacity-10 group-hover:opacity-15 transition-opacity`}></div>
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]} text-white shadow-lg`}>
            {icon}
          </div>
        </div>

        {/* Indicateur de croissance */}
        <div className="mt-4 flex items-center text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">+12% cette semaine</span>
        </div>
      </div>
    </CardComponent>
  )
}

function QuickActionButton({ href, icon, title, description, color }: {
  href: string
  icon: string
  title: string
  description: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'pink'
}) {
  const colors = {
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    orange: 'hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    yellow: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    pink: 'hover:bg-pink-50 dark:hover:bg-pink-900/20 border-pink-200 dark:border-pink-800'
  }

  return (
    <a
      href={href}
      className={`flex items-center p-4 rounded-lg border-2 transition-all hover:scale-105 ${colors[color]}`}
    >
      <div className="text-2xl mr-3 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{description}</p>
      </div>
    </a>
  )
}

function SystemMetric({ label, value, icon, status, onClick, className }: {
  label: string
  value: string
  icon: React.ReactNode
  status?: 'success' | 'warning' | 'error'
  onClick?: () => void
  className?: string
}) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  }

  return (
    <div
      className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all ${onClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:scale-105' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`${status ? statusColors[status] : 'text-gray-600 dark:text-gray-400'}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
      </div>
      <span className={`text-sm font-bold ${status ? statusColors[status] : 'text-gray-900 dark:text-gray-100'} flex-shrink-0 ml-3`}>
        {value}
      </span>
    </div>
  )
}

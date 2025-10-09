'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { dashboardService, applicationService } from '@/lib/api'

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalCompanies: 0,
    totalInterviews: 0,
    totalUsers: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Charger les stats depuis le backend
        const appsResponse = await applicationService.getAll()
        setStats(prev => ({
          ...prev,
          totalApplications: appsResponse.data.total || 0
        }))
      } catch (error) {
        console.error('Erreur chargement stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {user?.firstName} !
          </h1>
          <p className="mt-2 text-gray-600">
            Voici un aperçu de votre plateforme JobbingTrack
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Candidatures"
            value={stats.totalApplications}
            icon="📝"
            color="blue"
            loading={loadingStats}
          />
          <StatCard
            title="Entreprises"
            value={stats.totalCompanies}
            icon="🏢"
            color="green"
            loading={loadingStats}
          />
          <StatCard
            title="Entretiens"
            value={stats.totalInterviews}
            icon="📅"
            color="purple"
            loading={loadingStats}
          />
          <StatCard
            title="Utilisateurs"
            value={stats.totalUsers}
            icon="👥"
            color="orange"
            loading={loadingStats}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <QuickActionButton 
                href="/dashboard/applications/new"
                icon="➕"
                title="Nouvelle candidature"
                description="Ajouter une candidature"
              />
              <QuickActionButton 
                href="/dashboard/companies/new"
                icon="🏢"
                title="Nouvelle entreprise"
                description="Créer une entreprise"
              />
              <QuickActionButton 
                href="/dashboard/users"
                icon="👥"
                title="Gérer les utilisateurs"
                description="Administration des utilisateurs"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Activité récente
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>Aucune activité récente</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color, loading }: {
  title: string
  value: number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  loading?: boolean
}) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${colors[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ href, icon, title, description }: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="text-2xl mr-3">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  )
}


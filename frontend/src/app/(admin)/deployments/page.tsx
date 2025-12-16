'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface Deployment {
  id: string
  version: string
  environment: string
  status: string
  startTime: string
  endTime?: string
  duration?: number
  commitHash?: string
  branch?: string
  triggeredBy?: string
  rollbackReason?: string
  logs?: any[]
  metrics?: any
}

interface DeploymentMetrics {
  overview: {
    totalDeployments: number
    successfulDeployments: number
    failedDeployments: number
    rolledBackDeployments: number
    successRate: number
    avgDeploymentTime: number
  }
  performance: {
    avgBuildTime: number
    avgTestTime: number
    avgDeployTime: number
    avgErrorRate: number
    avgResponseTime: number
    totalDowntime: number
  }
  trends: any[]
  recentDeployments: Deployment[]
}

export default function DeploymentsPage() {
  const { token } = useAuth()
  const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'rollbacks' | 'metrics'>('overview')

  useEffect(() => {
    if (token) {
      loadDeploymentData()
    }
  }, [token])

  const loadDeploymentData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/deployments/metrics/analytics?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })

      setMetrics(response.data.data)
    } catch (error) {
      console.error('Erreur lors du chargement des données de déploiement:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}min`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'running': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      case 'rolled_back': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🚀 Gestion des Déploiements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Surveillance et gestion des déploiements CI/CD
          </p>
        </div>

        {/* Onglets */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
              { id: 'deployments', label: 'Déploiements', icon: '🚀' },
              { id: 'rollbacks', label: 'Rollbacks', icon: '↩️' },
              { id: 'metrics', label: 'Métriques', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Déploiements réussis</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {metrics.overview.successfulDeployments}/{metrics.overview.totalDeployments}
                    </p>
                  </div>
                  <div className="text-green-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Taux de succès: {metrics.overview.successRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps moyen</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(metrics.overview.avgDeploymentTime)}
                    </p>
                  </div>
                  <div className="text-blue-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Durée moyenne des déploiements
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rollbacks</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {metrics.overview.rolledBackDeployments}
                    </p>
                  </div>
                  <div className="text-orange-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Nombre de rollbacks ce mois
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disponibilité</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {((100 - (metrics.performance.avgErrorRate * 100))).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-purple-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 13H9a1 1 0 010 2H7a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 010-2h2.414l1.293 1.293a1 1 0 001.414-1.414L12.414 11H15a2 2 0 002-2V5a2 2 0 00-2-2H5z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Disponibilité du système
                </p>
              </div>
            </div>

            {/* Graphique des tendances */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                📈 Tendances des Déploiements (30 derniers jours)
              </h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {metrics.trends.map((trend, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                      <div
                        className="bg-blue-500 rounded-t-lg transition-all duration-300"
                        style={{ height: `${(trend.deployment_count / Math.max(...metrics.trends.map(t => t.deployment_count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {new Date(trend.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployments' && metrics && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              🚀 Déploiements Récents
            </h3>
            <div className="space-y-4">
              {metrics.recentDeployments.map((deployment) => (
                <div key={deployment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(deployment.status)}`}>
                        {deployment.status}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Version {deployment.version}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {deployment.environment}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(deployment.startTime)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Durée:</span>
                      <span className="ml-2 font-medium">
                        {deployment.duration ? formatDuration(deployment.duration) : 'En cours'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Commit:</span>
                      <span className="ml-2 font-medium font-mono text-xs">
                        {deployment.commitHash?.substring(0, 7) || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Branche:</span>
                      <span className="ml-2 font-medium">
                        {deployment.branch || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Déclenché par:</span>
                      <span className="ml-2 font-medium">
                        {deployment.triggeredBy || 'Système'}
                      </span>
                    </div>
                  </div>

                  {deployment.rollbackReason && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                      <p className="text-sm text-orange-800 dark:text-orange-400">
                        <strong>Raison du rollback:</strong> {deployment.rollbackReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rollbacks' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              ↩️ Historique des Rollbacks
            </h3>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Fonctionnalité de rollback en cours de développement</p>
              <p className="text-sm mt-2">Les rollbacks seront affichés ici une fois implémentés</p>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && metrics && (
          <div className="space-y-6">
            {/* Métriques de performance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                ⚡ Métriques de Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de Build Moyen</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatDuration(metrics.performance.avgBuildTime)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de Test Moyen</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatDuration(metrics.performance.avgTestTime)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de Déploiement Moyen</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatDuration(metrics.performance.avgDeployTime)}
                  </p>
                </div>
              </div>
            </div>

            {/* Métriques d'impact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                📊 Métriques d'Impact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux d'Erreur Moyen</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(metrics.performance.avgErrorRate * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps de Réponse Moyen</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round(metrics.performance.avgResponseTime)}ms
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps d'Indisponibilité Total</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatDuration(metrics.performance.totalDowntime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bouton d'actualisation */}
        <div className="mt-6">
          <button
            onClick={loadDeploymentData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

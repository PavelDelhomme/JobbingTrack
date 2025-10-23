'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface SecurityMetrics {
  totalLogs: number
  criticalEvents: number
  intrusionAttempts: number
  ddosAttacks: number
  authFailures: number
  uniqueIPs: number
  blockedIPs: number
  averageRiskScore: number
}

interface SecurityRiskAnalysis {
  overallRisk: string
  attackTrends: {
    hourly: any[]
    byType: any
    byCountry: any
  }
  vulnerabilityAssessment: {
    total: number
    bySeverity: any
    byComponent: any
    critical: number
    high: number
    medium: number
    low: number
    averageCVSS: number
  }
  ipReputation: any
  recommendations: any[]
}

export default function SecurityAnalysisPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [systemMetrics, setSystemMetrics] = useState<SecurityMetrics | null>(null)
  const [riskAnalysis, setRiskAnalysis] = useState<SecurityRiskAnalysis | null>(null)
  const [securityLogs, setSecurityLogs] = useState<any[]>([])

  useEffect(() => {
    if (token) {
      loadSecurityData()
    }
  }, [token])

  const loadSecurityData = async () => {
    setLoading(true)
    try {
      // Simulation de données de sécurité pour l'instant
      const mockSystemMetrics = {
        totalLogs: 1247,
        criticalEvents: 3,
        intrusionAttempts: 12,
        ddosAttacks: 0,
        authFailures: 45,
        uniqueIPs: 89,
        blockedIPs: 5,
        averageRiskScore: 7.2
      }

      const mockRiskAnalysis = {
        overallRisk: 'medium',
        attackTrends: {
          hourly: Array.from({ length: 24 }, (_, i) => ({
            hour: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
            total: 'N/A'
          })),
          byType: {
            'Brute Force': 'N/A',
            'SQL Injection': 'N/A',
            'XSS': 'N/A',
            'DDoS': 'N/A'
          },
          byCountry: {
            'US': 'N/A',
            'CN': 'N/A',
            'RU': 'N/A',
            'FR': 'N/A'
          }
        },
        vulnerabilityAssessment: {
          total: 'N/A',
          bySeverity: {
            critical: 'N/A',
            high: 'N/A',
            medium: 'N/A',
            low: 'N/A'
          },
          byComponent: {
            'API Gateway': 'N/A',
            'Auth Service': 'N/A',
            'Database': 'N/A',
            'Frontend': 'N/A'
          },
          critical: 'N/A',
          high: 'N/A',
          medium: 'N/A',
          low: 'N/A',
          averageCVSS: 'N/A'
        },
        ipReputation: {
          '192.168.1.100': { score: 'N/A', risk: 'N/A' },
          '10.0.0.50': { score: 'N/A', risk: 'N/A' },
          '203.0.113.1': { score: 'N/A', risk: 'N/A' }
        },
        recommendations: [
          {
            title: 'Mettre à jour les certificats SSL',
            description: 'Certains certificats expirent dans moins de 30 jours',
            priority: 'high'
          },
          {
            title: 'Renforcer l\'authentification',
            description: 'Implémenter l\'authentification à deux facteurs',
            priority: 'medium'
          },
          {
            title: 'Audit des permissions',
            description: 'Vérifier les permissions utilisateur sur les endpoints sensibles',
            priority: 'medium'
          }
        ]
      }

      const mockLogs = Array.from({ length: 15 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        level: 'N/A',
        message: 'Données de sécurité non disponibles pour le moment',
        category: 'N/A',
        sourceIP: 'N/A',
        country: 'N/A'
      }))

      setSystemMetrics(mockSystemMetrics)
      setRiskAnalysis(mockRiskAnalysis)
      setSecurityLogs(mockLogs)
    } catch (error) {
      console.error('Erreur lors du chargement des données de sécurité:', error)
    } finally {
      setLoading(false)
    }
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
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
            🛡️ Analyse de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Surveillance et analyse des menaces de sécurité en temps réel
          </p>
        </div>

        {systemMetrics && riskAnalysis && (
          <div className="space-y-6">
            {/* Métriques principales de sécurité */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score de Sécurité</p>
                    <p className={`text-3xl font-bold ${riskAnalysis.overallRisk === 'critical' || riskAnalysis.overallRisk === 'high' ? 'text-red-600 dark:text-red-400' : riskAnalysis.overallRisk === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                      {systemMetrics.averageRiskScore.toFixed(1)}
                    </p>
                  </div>
                  <div className={`${riskAnalysis.overallRisk === 'critical' || riskAnalysis.overallRisk === 'high' ? 'text-red-500' : riskAnalysis.overallRisk === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Risque global: <span className={`font-medium ${getRiskColor(riskAnalysis.overallRisk)}`}>
                    {riskAnalysis.overallRisk.toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tentatives d'intrusion</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{systemMetrics.intrusionAttempts}</p>
                  </div>
                  <div className="text-red-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Dernières 24h</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attaques DDoS</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{systemMetrics.ddosAttacks}</p>
                  </div>
                  <div className="text-orange-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 13H9a1 1 0 010 2H7a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 010-2h2.414l1.293 1.293a1 1 0 001.414-1.414L12.414 11H15a2 2 0 002-2V5a2 2 0 00-2-2H5z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Détectées récemment</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vulnérabilités</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{riskAnalysis.vulnerabilityAssessment.total}</p>
                  </div>
                  <div className="text-yellow-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {riskAnalysis.vulnerabilityAssessment.critical} critiques, {riskAnalysis.vulnerabilityAssessment.high} élevées
                </p>
              </div>
            </div>

            {/* Analyse de risques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  📊 Analyse de Risques
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risque Global</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRiskColor(riskAnalysis.overallRisk)}`}>
                      {riskAnalysis.overallRisk.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">IPs Bloquées</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{systemMetrics.blockedIPs}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">IPs Uniques</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemMetrics.uniqueIPs}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Recommandations Prioritaires</h4>
                    {riskAnalysis.recommendations.slice(0, 3).map((rec: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-blue-500 mt-0.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  📈 Tendances d'Attaques (24h)
                </h3>
                <div className="h-48 flex items-end justify-between gap-1">
                  {riskAnalysis.attackTrends.hourly.slice(-24).map((trend: any, index: number) => {
                    const maxTotal = Math.max(...riskAnalysis.attackTrends.hourly.map((t: any) => t.total))
                    const height = maxTotal > 0 ? (trend.total / maxTotal) * 100 : 0
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg relative">
                          <div
                            className="bg-red-500 rounded-t-lg transition-all duration-300"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {new Date(trend.hour).getHours()}:00
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Analyse des vulnérabilités */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                ⚠️ Évaluation des Vulnérabilités
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{riskAnalysis.vulnerabilityAssessment.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Critiques</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{riskAnalysis.vulnerabilityAssessment.critical}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Élevées</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{riskAnalysis.vulnerabilityAssessment.high}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CVSS Moyen</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {typeof riskAnalysis.vulnerabilityAssessment.averageCVSS === 'number'
                      ? riskAnalysis.vulnerabilityAssessment.averageCVSS.toFixed(1)
                      : riskAnalysis.vulnerabilityAssessment.averageCVSS}
                  </p>
                </div>
              </div>
            </div>

            {/* Logs de sécurité récents */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                📋 Logs de Sécurité Récents
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {securityLogs.length > 0 ? securityLogs.slice(0, 10).map((log, index) => {
                  const time = formatDate(log.timestamp)
                  return (
                    <div key={index} className={`p-3 rounded-lg border ${
                      log.level === 'critical' || log.level === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      log.level === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{time}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.level === 'critical' || log.level === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {log.level === 'critical' ? 'Critique' : log.level === 'error' ? 'Erreur' : log.level === 'warning' ? 'Avertissement' : 'Info'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{log.message}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {log.category} • {log.sourceIP ? `IP: ${log.sourceIP}` : ''} {log.country ? `(${log.country})` : ''}
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Aucun log de sécurité récent</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton d'actualisation */}
            <div className="flex justify-center">
              <button
                onClick={loadSecurityData}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualiser l'Analyse
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

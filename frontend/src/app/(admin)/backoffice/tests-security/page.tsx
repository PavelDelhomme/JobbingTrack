'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import {
  Play, Square, Loader2, Shield, RefreshCw, CheckCircle2, ExternalLink, FileText
} from '@/lib/icons'

interface TestItem {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
}

export default function SecurityTestsPage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [reportId, setReportId] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const [availableTests] = useState<TestItem[]>([
    { id: 'waf', name: 'WAF / Firewall', description: 'Règles WAF et blocage des requêtes malveillantes', category: 'Infrastructure', enabled: true },
    { id: 'auth', name: 'Authentification', description: 'Tokens, sessions, permissions', category: 'Auth', enabled: true },
    { id: 'injection', name: 'Injection', description: 'SQL, XSS, commandes', category: 'Vulnérabilités', enabled: true },
    { id: 'headers', name: 'En-têtes sécurité', description: 'CSP, HSTS, X-Frame-Options', category: 'Headers', enabled: true },
  ])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('fr-FR')
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const runSecurityTests = async () => {
    if (isRunning) {
      setIsRunning(false)
      addLog('⏹️ Tests arrêtés')
      return
    }

    setIsRunning(true)
    setLogs([])
    setReportId(null)
    addLog('🚀 Démarrage des tests sécurité...')

    try {
      const response = await fetch('/api/test/run-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ testName: 'Tests Sécurité' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Erreur API: ${response.status}`)
      }

      addLog(`✅ ${data.message || 'Rapport généré'}`)
      if (data.reportId) {
        setReportId(data.reportId)
        addLog(`📊 Rapport: ${data.reportId}`)
      }
      addLog('🎉 Tests sécurité terminés. Consultez les rapports ci-dessous.')
    } catch (error: unknown) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsRunning(false)
    }
  }

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">Vous devez être connecté.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-8 h-8 text-amber-600" />
              Tests Sécurité
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Exécuter les tests de sécurité et consulter les rapports
            </p>
          </div>
          <button
            onClick={runSecurityTests}
            disabled={!token}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isRunning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Lancer les tests Sécurité
              </>
            )}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Couverture des tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTests.map(test => (
              <div
                key={test.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">{test.name}</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{test.description}</p>
              </div>
            ))}
          </div>
        </div>

        {reportId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Link
              href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(reportId)}`}
              className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:underline font-medium"
            >
              <FileText className="w-4 h-4" />
              Voir le rapport
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Rapport : <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{reportId}</code>
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Terminal</span>
              <button
                onClick={() => { setLogs([]); setReportId(null) }}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
            {reportId && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <Link
                  href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(reportId)}`}
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Voir le rapport
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

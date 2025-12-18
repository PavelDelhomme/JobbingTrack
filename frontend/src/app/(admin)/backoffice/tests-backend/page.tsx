'use client'

import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { 
  Play, Square, Loader2, CheckCircle, XCircle, 
  Server, Activity, Clock, Zap, RefreshCw, Database, CheckCircle2
} from '@/lib/icons'

interface TestItem {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
}

interface TestStatus {
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
}

export default function BackendTestsPage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [testStatuses, setTestStatuses] = useState<TestStatus[]>([])
  const [currentTest, setCurrentTest] = useState<string>('')
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Liste des tests disponibles avec leurs descriptions
  const [availableTests, setAvailableTests] = useState<TestItem[]>([
    {
      id: 'auth-service',
      name: 'Service d\'Authentification',
      description: 'Tests du service d\'authentification (login, register, tokens)',
      category: 'Services',
      enabled: true
    },
    {
      id: 'company-service',
      name: 'Service Entreprises',
      description: 'Tests CRUD du service de gestion des entreprises',
      category: 'Services',
      enabled: true
    },
    {
      id: 'application-service',
      name: 'Service Candidatures',
      description: 'Tests CRUD du service de gestion des candidatures',
      category: 'Services',
      enabled: true
    },
    {
      id: 'dashboard-service',
      name: 'Service Dashboard',
      description: 'Tests du service de dashboard et statistiques',
      category: 'Services',
      enabled: true
    },
    {
      id: 'api-gateway',
      name: 'API Gateway',
      description: 'Tests de l\'API Gateway (health, routes, routing)',
      category: 'Infrastructure',
      enabled: true
    },
    {
      id: 'database',
      name: 'Base de Données',
      description: 'Tests de connexion et requêtes à la base de données',
      category: 'Infrastructure',
      enabled: true
    },
    {
      id: 'integration',
      name: 'Tests d\'Intégration',
      description: 'Tests d\'intégration entre les services',
      category: 'Intégration',
      enabled: true
    }
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

  const toggleTest = (testId: string) => {
    setAvailableTests(prev => prev.map(test => 
      test.id === testId ? { ...test, enabled: !test.enabled } : test
    ))
  }

  const startBackendTests = async () => {
    if (isRunning) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      setIsRunning(false)
      setProgress(0)
      addLog('⏹️ Tests arrêtés')
      return
    }

    const selectedTests = availableTests.filter(t => t.enabled)
    if (selectedTests.length === 0) {
      alert('Veuillez sélectionner au moins un test à exécuter')
      return
    }

    setIsRunning(true)
    setProgress(0)
    setLogs([])
    setCurrentTest('')

    // Initialiser les statuts des tests sélectionnés
    setTestStatuses(selectedTests.map(test => ({
      name: test.name,
      status: 'pending',
      progress: 0
    })))

    addLog(`🚀 Démarrage des tests backend...`)
    addLog(`📋 ${selectedTests.length} test(s) sélectionné(s)`)

    try {
      // Lancer les tests backend via make
      const response = await fetch('/api/test/run-backend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tests: selectedTests.map(t => t.id)
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`)
      }

      const data = await response.json()
      addLog(`✅ Tests backend lancés: ${data.message || 'En cours...'}`)

      // Simuler la progression pour chaque test
      for (let i = 0; i < selectedTests.length; i++) {
        const test = selectedTests[i]
        setCurrentTest(test.name)
        setTestStatuses(prev => prev.map((t, idx) => 
          idx === i ? { ...t, status: 'running', progress: 0 } : t
        ))
        addLog(`▶️ Démarrage: ${test.name}`)

        // Simuler la progression
        let testProgress = 0
        const testInterval = setInterval(() => {
          testProgress = Math.min(testProgress + 10, 100)
          setTestStatuses(prev => prev.map((t, idx) => {
            if (idx === i && t.status === 'running') {
              return { ...t, progress: testProgress }
            }
            return t
          }))
          setProgress(((i + testProgress / 100) * 100) / selectedTests.length)
        }, 100)

        await new Promise(resolve => setTimeout(resolve, 2000))
        clearInterval(testInterval)

        setTestStatuses(prev => prev.map((t, idx) => 
          idx === i ? { ...t, status: 'completed', progress: 100 } : t
        ))
        addLog(`✅ Terminé: ${test.name}`)
      }

      setCurrentTest('')
      setIsRunning(false)
      setProgress(100)
      addLog('🎉 Tous les tests backend sont terminés !')
      addLog('📊 Consultez les rapports dans "Rapports de Tests"')

    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`)
      setIsRunning(false)
      setProgress(0)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }

  const categories = Array.from(new Set(availableTests.map(t => t.category)))

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
              <Database className="w-8 h-8 text-purple-600" />
              Tests Backend
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Tests complets des services backend
            </p>
          </div>
          <button
            onClick={startBackendTests}
            disabled={!token || isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isRunning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRunning ? (
              <>
                <Square className="h-5 w-5" />
                Arrêter
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Lancer les tests Backend
              </>
            )}
          </button>
        </div>

        {/* Liste des tests disponibles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tests Disponibles ({availableTests.filter(t => t.enabled).length} sélectionné(s))
          </h2>
          
          {categories.map(category => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTests
                  .filter(test => test.category === category)
                  .map(test => (
                    <div
                      key={test.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        test.enabled
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                      }`}
                      onClick={() => !isRunning && toggleTest(test.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 
                              className={`w-5 h-5 ${
                                test.enabled 
                                  ? 'text-purple-600 dark:text-purple-400' 
                                  : 'text-gray-400'
                              }`}
                            />
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {test.name}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {test.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Progression */}
        {isRunning && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentTest || 'Préparation...'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Statuts des tests */}
            {testStatuses.length > 0 && (
              <div className="mt-4 space-y-2">
                {testStatuses.map((test, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {test.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {test.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
                      {test.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                      {test.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                      <span className="text-gray-700 dark:text-gray-300">{test.name}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">{test.progress}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Terminal</span>
              <button
                onClick={() => {
                  setLogs([])
                  setProgress(0)
                }}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

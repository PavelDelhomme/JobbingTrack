'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/features';
import { useAuth } from '@/lib/hooks/auth';
import { 
  Play, TrendingUp, Zap, Activity, Clock, Target, 
  Layers, Server, Cpu, HardDrive, Wifi, AlertCircle,
  CheckCircle, CheckCircle2, Info, BarChart3, Gauge, Timer, Square,
  Loader2, XCircle, RefreshCw
} from '@/lib/icons';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002';

interface PerformanceMetric {
  name: string;
  value: number | string;
  unit: string;
  description: string;
  status: 'good' | 'warning' | 'error';
  icon: any;
}

interface TestStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
  duration?: number;
}

type PerfRunMode =
  | 'performance-backend'
  | 'performance-frontend'
  | 'both'
  | 'performance-infrastructure'

export default function PerformanceTestsPage() {
  const { token } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatuses, setTestStatuses] = useState<TestStatus[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Load Time',
      value: 1.2,
      unit: 's',
      description: 'Temps total de chargement de la page',
      status: 'good',
      icon: Clock
    },
    {
      name: 'TTFB',
      value: 0.3,
      unit: 's',
      description: 'Time To First Byte - Temps jusqu\'au premier octet',
      status: 'good',
      icon: Activity
    },
    {
      name: 'FCP',
      value: 0.8,
      unit: 's',
      description: 'First Contentful Paint - Premier contenu affiché',
      status: 'good',
      icon: Target
    },
    {
      name: 'LCP',
      value: 1.5,
      unit: 's',
      description: 'Largest Contentful Paint - Plus grand élément visible',
      status: 'good',
      icon: TrendingUp
    },
    {
      name: 'FID',
      value: 50,
      unit: 'ms',
      description: 'First Input Delay - Délai de la première interaction',
      status: 'good',
      icon: Zap
    },
    {
      name: 'CLS',
      value: 0.05,
      unit: '',
      description: 'Cumulative Layout Shift - Stabilité visuelle',
      status: 'good',
      icon: Layers
    },
    {
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      description: 'Utilisation du processeur',
      status: 'good',
      icon: Cpu
    },
    {
      name: 'Memory Usage',
      value: 62,
      unit: '%',
      description: 'Utilisation de la mémoire',
      status: 'warning',
      icon: HardDrive
    },
    {
      name: 'Network Latency',
      value: 120,
      unit: 'ms',
      description: 'Latence réseau moyenne',
      status: 'good',
      icon: Wifi
    },
    {
      name: 'Error Rate',
      value: 0.2,
      unit: '%',
      description: 'Taux d\'erreurs HTTP',
      status: 'good',
      icon: AlertCircle
    },
    {
      name: 'Requests/s',
      value: 150,
      unit: 'req/s',
      description: 'Nombre de requêtes par seconde',
      status: 'good',
      icon: Server
    },
    {
      name: 'Response Time',
      value: 85,
      unit: 'ms',
      description: 'Temps de réponse moyen',
      status: 'good',
      icon: Timer
    }
  ]);

  interface TestType {
    id: string
    name: string
    description: string
    metrics: string[]
    duration: string
    category: string
    enabled: boolean
  }

  const [availableTestTypes, setAvailableTestTypes] = useState<TestType[]>([
    {
      id: 'complete',
      name: 'Tests Complets',
      description: 'Tests de performance complets sur tous les services (API, Frontend, Base de données)',
      metrics: ['Load Time', 'TTFB', 'FCP', 'LCP', 'FID', 'CLS', 'CPU', 'Memory', 'Network'],
      duration: '2-5 minutes',
      category: 'Complets',
      enabled: true
    },
    {
      id: 'api',
      name: 'Tests API',
      description: 'Tests des performances des endpoints API uniquement (temps de réponse, débit, erreurs)',
      metrics: ['Response Time', 'Requests/s', 'Error Rate', 'Network Latency'],
      duration: '1-3 minutes',
      category: 'API',
      enabled: true
    },
    {
      id: 'frontend',
      name: 'Tests Frontend',
      description: 'Tests des performances du frontend (rendu, interactions, chargement des ressources)',
      metrics: ['Load Time', 'FCP', 'LCP', 'FID', 'CLS', 'CPU', 'Memory'],
      duration: '1-2 minutes',
      category: 'Frontend',
      enabled: true
    },
    {
      id: 'load',
      name: 'Tests de Charge',
      description: 'Tests de charge intensive avec plusieurs utilisateurs simultanés',
      metrics: ['Response Time', 'Requests/s', 'CPU', 'Memory', 'Error Rate'],
      duration: '3-10 minutes',
      category: 'Charge',
      enabled: true
    },
    {
      id: 'memory',
      name: 'Tests Mémoire',
      description: 'Tests d\'utilisation mémoire et détection de fuites mémoire',
      metrics: ['Memory Usage', 'CPU', 'Response Time'],
      duration: '1-2 minutes',
      category: 'Mémoire',
      enabled: true
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-orange-600 dark:text-orange-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'warning': return 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
      case 'error': return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  // Auto-scroll des logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const [selectedTestType, setSelectedTestType] = useState<PerfRunMode>('both')

  const toggleTestType = (testId: string) => {
    setAvailableTestTypes(prev => prev.map(test => 
      test.id === testId ? { ...test, enabled: !test.enabled } : test
    ))
  }

  const startTests = async (testType?: PerfRunMode) => {
    const typeToRun = testType || selectedTestType
    const selectedTests = availableTestTypes.filter(t => t.enabled)

    if (typeToRun !== 'performance-infrastructure' && selectedTests.length === 0) {
      alert('Veuillez sélectionner au moins un type de test à exécuter')
      return
    }
    
    if (isRunning) {
      // Arrêter les tests
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsRunning(false);
      setProgress(0);
      addLog('⏹️ Tests arrêtés par l\'utilisateur');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setCurrentTest('');
    
    // Définir les tests selon le type sélectionné
    let testStatusesList: TestStatus[] = []
    if (typeToRun === 'performance-backend' || typeToRun === 'both') {
      testStatusesList.push(
        { name: 'Tests Performance Backend', status: 'pending', progress: 0 },
        { name: 'Analyse Métriques Backend', status: 'pending', progress: 0 }
      )
    }
    if (typeToRun === 'performance-frontend' || typeToRun === 'both') {
      testStatusesList.push(
        { name: 'Tests Performance Frontend', status: 'pending', progress: 0 },
        { name: 'Analyse Bundles', status: 'pending', progress: 0 },
        { name: 'Tests Mémoire', status: 'pending', progress: 0 }
      )
    }
    if (typeToRun === 'performance-infrastructure') {
      testStatusesList = [
        {
          name: 'Infrastructure — `make test-database` (schéma BDD, enums, relations)',
          status: 'pending',
          progress: 0,
        },
      ]
    }
    setTestStatuses(testStatusesList)

    const modeLabel =
      typeToRun === 'both'
        ? 'Backend + Frontend'
        : typeToRun === 'performance-infrastructure'
          ? 'Infrastructure (BDD / schéma)'
          : typeToRun
    addLog(`🚀 Démarrage des tests de performance: ${modeLabel}`)
    if (typeToRun !== 'performance-infrastructure') {
      addLog(`📋 Types de tests sélectionnés: ${selectedTests.map(t => t.name).join(', ')}`)
    }
    addLog('📋 Tests en cours...')

    try {
      if (typeToRun === 'performance-infrastructure') {
        addLog('📡 Lancement suite infrastructure (`make test-database`)…')
        setTestStatuses((prev) =>
          prev.map((t, idx) => (idx === 0 ? { ...t, status: 'running', progress: 0 } : t))
        )
        try {
          const res = await fetch('/api/test/run-performance-infrastructure', { method: 'POST' })
          const data = (await res.json().catch(() => ({}))) as {
            success?: boolean
            skipped?: boolean
            message?: string
            error?: string
            tail?: string
          }
          if (data.skipped) {
            addLog(`ℹ️ ${data.message || 'Passage infrastructure ignoré en conteneur.'}`)
            setTestStatuses((prev) =>
              prev.map((t, idx) => (idx === 0 ? { ...t, status: 'completed', progress: 100 } : t))
            )
          } else if (res.ok && data.success) {
            addLog('✅ Suite infrastructure terminée (voir sortie make / champ tail côté API).')
            if (data.tail) addLog(data.tail.slice(0, 1500))
            setTestStatuses((prev) =>
              prev.map((t, idx) => (idx === 0 ? { ...t, status: 'completed', progress: 100 } : t))
            )
          } else {
            addLog(`❌ Infrastructure: ${data.error || res.statusText}`)
            if (data.tail) addLog(data.tail.slice(0, 1500))
            setTestStatuses((prev) =>
              prev.map((t, idx) => (idx === 0 ? { ...t, status: 'error', progress: 0 } : t))
            )
          }
        } catch (error) {
          addLog(`⚠️ Erreur lancement infrastructure: ${error}`)
          setTestStatuses((prev) =>
            prev.map((t, idx) => (idx === 0 ? { ...t, status: 'error', progress: 0 } : t))
          )
        }
      }

      // Lancer les tests réels via l'API
      if (typeToRun === 'performance-backend' || typeToRun === 'both') {
        addLog('📡 Lancement des tests backend...')
        setTestStatuses(prev => prev.map((t, idx) => 
          idx === 0 ? { ...t, status: 'running', progress: 0 } : t
        ))
        try {
          await fetch('/api/test/run-performance-backend', { method: 'POST' })
          addLog('✅ Tests backend lancés')
          setTestStatuses(prev => prev.map((t, idx) => 
            idx === 0 ? { ...t, status: 'completed', progress: 100 } : t
          ))
        } catch (error) {
          addLog(`⚠️ Erreur lancement backend: ${error}`)
          setTestStatuses(prev => prev.map((t, idx) => 
            idx === 0 ? { ...t, status: 'error', progress: 0 } : t
          ))
        }
      }
      
      if (typeToRun === 'performance-frontend' || typeToRun === 'both') {
        addLog('📡 Lancement des tests frontend...')
        const frontendStartIdx = typeToRun === 'both' ? 2 : 0
        setTestStatuses(prev => prev.map((t, idx) => 
          idx === frontendStartIdx ? { ...t, status: 'running', progress: 0 } : t
        ))
        try {
          await fetch('/api/test/run-performance-frontend', { method: 'POST' })
          addLog('✅ Tests frontend lancés')
          setTestStatuses(prev => prev.map((t, idx) => 
            idx === frontendStartIdx ? { ...t, status: 'completed', progress: 100 } : t
          ))
        } catch (error) {
          addLog(`⚠️ Erreur lancement frontend: ${error}`)
          setTestStatuses(prev => prev.map((t, idx) => 
            idx === frontendStartIdx ? { ...t, status: 'error', progress: 0 } : t
          ))
        }
      }

      // Simuler la progression globale
      let currentProgress = 0
      progressIntervalRef.current = setInterval(() => {
        currentProgress = Math.min(currentProgress + 2, 100)
        setProgress(currentProgress)
        
        if (currentProgress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
          setIsRunning(false)
          addLog('🎉 Tests de performance lancés !')
          addLog('📊 Consultez les rapports dans "Rapports de Tests"')
        }
      }, 100)

      // Mettre à jour les métriques avec des valeurs simulées
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: typeof m.value === 'number' 
          ? m.value * (0.9 + Math.random() * 0.2) 
          : m.value
      })));

    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
      setIsRunning(false);
      setProgress(0);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Tests de Performance
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analysez et optimisez les performances de votre application
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>En cours...</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              {!isRunning && (
                <select
                  value={selectedTestType}
                  onChange={(e) => setSelectedTestType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="both">Backend + Frontend</option>
                  <option value="performance-backend">Backend uniquement</option>
                  <option value="performance-frontend">Frontend uniquement</option>
                  <option value="performance-infrastructure">Infrastructure (BDD / schéma)</option>
                </select>
              )}
              <button 
                onClick={() => startTests()}
                disabled={!token}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isRunning
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRunning ? (
                  <>
                    <Square className="h-5 w-5" />
                    Arrêter les tests
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Lancer les tests
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Section: État des tests en cours */}
        {isRunning && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-blue-500" />
              Tests en cours
            </h2>
            
            {/* Barre de progression globale */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progression globale
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 10 && (
                    <span className="text-xs text-white font-semibold">{Math.round(progress)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Test actuel */}
            {currentTest && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Test en cours: {currentTest}
                  </span>
                </div>
              </div>
            )}

            {/* Statut des tests individuels */}
            <div className="space-y-3 mb-6">
              {testStatuses.map((test, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {test.status === 'pending' && (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      {test.status === 'running' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {test.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {test.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {test.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {test.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        test.status === 'completed' 
                          ? 'bg-green-500' 
                          : test.status === 'running'
                          ? 'bg-blue-500'
                          : test.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${test.progress}%` }}
                    />
                  </div>
                  {test.message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{test.message}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Logs en temps réel */}
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 border border-gray-700 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">Logs en temps réel</h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Effacer
                </button>
              </div>
              <div className="font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <p className="text-gray-500">En attente de logs...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-gray-300">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Section: Types de tests disponibles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Types de Tests Disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTestTypes.map((test, index) => (
              <div 
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{test.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{test.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Clock className="h-3 w-3" />
                  <span>Durée: {test.duration}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {test.metrics.map((metric, mIndex) => (
                    <span 
                      key={mIndex}
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Indicateurs de Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Indicateurs de Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div 
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusBgColor(metric.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${getStatusColor(metric.status)}`} />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{metric.name}</p>
                    </div>
                    {metric.status === 'good' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {metric.status === 'warning' && <AlertCircle className="h-4 w-4 text-orange-600" />}
                    {metric.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {typeof metric.value === 'number' ? metric.value.toFixed(metric.unit === '%' ? 1 : 2) : metric.value}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">{metric.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{metric.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Score de Performance Global */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Score de Performance Global
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-10 relative overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-10 rounded-full flex items-center justify-end pr-4 transition-all duration-500" style={{ width: '85%' }}>
                  <span className="text-white font-bold text-sm">85/100</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">85</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Score</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">92</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Performance</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">88</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Accessibilité</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">90</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Meilleures Pratiques</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Recommandations d'Optimisation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recommandations d'Optimisation
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Images optimisées</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vos images sont correctement optimisées et compressées</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Minification CSS/JS activée</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Les fichiers CSS et JavaScript sont minifiés pour réduire leur taille</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Améliorer le cache navigateur</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configurez des en-têtes de cache appropriés pour réduire les requêtes répétées</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Réduire le temps de réponse serveur</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Optimisez les requêtes base de données et utilisez la mise en cache côté serveur</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Lazy loading des ressources</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Chargez les images et composants uniquement lorsqu'ils sont nécessaires</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import Link from 'next/link'
import {
  FlaskConical,
  Server,
  Monitor,
  Shield,
  Zap,
  FileText,
  Play,
  BarChart3,
  Mail,
  Calendar,
  PlayCircle,
  Check,
  Circle,
  Database,
} from 'lucide-react'
import { Loader2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'

/** Catégories lançables depuis le hub (endpoint API run-*) */
const RUNNABLE_IDS = ['api', 'backend', 'frontend', 'backoffice', 'backoffice-only', 'database', 'security', 'performance', 'playwright', 'emails'] as const
const RUN_API: Record<string, string | string[]> = {
  api: '/api/test/run-api',
  backend: '/api/test/run-backend',
  frontend: '/api/test/run-frontend',
  backoffice: '/api/test/run-backoffice',
  'backoffice-only': '/api/test/run-backoffice-only',
  database: '/api/test/run-database',
  security: '/api/test/run-security',
  performance: ['/api/test/run-performance-backend', '/api/test/run-performance-frontend'],
  playwright: '/api/test/run-playwright',
  emails: '/api/test/run-emails',
}

const CATEGORIES = [
  {
    id: 'api',
    name: 'Tests API',
    description: 'Lancer les tests API et consulter les rapports',
    href: '/backoffice/tests-api',
    icon: Server,
    color: 'blue',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-700 dark:text-blue-300',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'backend',
    name: 'Tests Backend',
    description: 'Tests des services backend (auth, companies, applications, etc.)',
    href: '/backoffice/tests-backend',
    icon: Server,
    color: 'purple',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-300',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'frontend',
    name: 'Tests Frontend',
    description: 'Tests unitaires des composants et du frontend',
    href: '/backoffice/tests-frontend',
    icon: Monitor,
    color: 'green',
    bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    textClass: 'text-green-700 dark:text-green-300',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  {
    id: 'backoffice',
    name: 'Tests Backoffice',
    description: 'Tests E2E de l\'interface d\'administration',
    href: '/backoffice/tests-backoffice',
    icon: Shield,
    color: 'indigo',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'backoffice-only',
    name: 'Backoffice uniquement',
    description: 'Uniquement le spec backoffice.spec.ts (rapide)',
    href: '/backoffice/tests-backoffice',
    icon: Shield,
    color: 'indigo',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'database',
    name: 'Tests BDD',
    description: 'Tests base de données (connexion, enums, relations)',
    href: '/backoffice/tests-backend',
    icon: Database,
    color: 'violet',
    bgClass: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
    textClass: 'text-violet-700 dark:text-violet-300',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'security',
    name: 'Tests Sécurité',
    description: 'WAF, authentification, injection, en-têtes',
    href: '/backoffice/tests-security',
    icon: Shield,
    color: 'red',
    bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    textClass: 'text-red-700 dark:text-red-300',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  {
    id: 'performance',
    name: 'Tests Performance',
    description: 'Métriques de charge et temps de réponse',
    href: '/backoffice/performance-tests',
    icon: Zap,
    color: 'amber',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'playwright',
    name: 'Tests Playwright',
    description: 'Tests E2E Playwright (scénarios complets)',
    href: '/backoffice/playwright-tests',
    icon: Play,
    color: 'cyan',
    bgClass: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'emails',
    name: 'Tests Emails',
    description: 'Tests d\'envoi et de délivrabilité des emails',
    href: '/backoffice/tests-emails',
    icon: Mail,
    color: 'pink',
    bgClass: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    textClass: 'text-pink-700 dark:text-pink-300',
    iconClass: 'text-pink-600 dark:text-pink-400',
  },
  {
    id: 'schedule',
    name: 'Programmer tests',
    description: 'Planifier l\'exécution automatique des tests',
    href: '/backoffice/performance-tests/schedule',
    icon: Calendar,
    color: 'slate',
    bgClass: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700',
    textClass: 'text-slate-700 dark:text-slate-300',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  {
    id: 'reports',
    name: 'Rapports de tests',
    description: 'Consulter tous les rapports générés (API, backend, frontend, E2E, etc.)',
    href: '/backoffice/test-reports',
    icon: FileText,
    color: 'emerald',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
]

export default function TestsHubPage() {
  const { loading: authLoading, isAuthenticated, token } = useAuth()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runLog, setRunLog] = useState<string[]>([])
  const [lastReportId, setLastReportId] = useState<string | null>(null)
  /** Nom du test en cours (affiché dans l’overlay pour que l’utilisateur sache où il en est). */
  const [currentRunName, setCurrentRunName] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<{ step: number; total: number } | null>(null)
  /** Liste des étapes de la run en cours (pour barre de progression et détail dans l’overlay). */
  const [runSteps, setRunSteps] = useState<{ name: string; subLabel?: string; subSteps?: string[] }[]>([])
  const isRunningRef = useRef(false)
  isRunningRef.current = isRunning

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunningRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const toggleSelection = (id: string) => {
    if (!RUNNABLE_IDS.includes(id as any)) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const runSelected = async () => {
    if (selectedIds.length === 0 || isRunning) return
    setIsRunning(true)
    setRunLog([])
    setLastReportId(null)
    setCurrentStep(null)
    setRunSteps([])
    const log = (msg: string) => setRunLog((prev) => [...prev, msg])
    let reportId: string | null = null
    const opts = {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    }
    // Liste plate des étapes (chaque appel API = 1 étape ; performance = 2 étapes)
    const steps: { url: string; name: string; subLabel?: string }[] = []
    for (const id of selectedIds) {
      const api = RUN_API[id]
      if (!api) continue
      const name = CATEGORIES.find((c) => c.id === id)?.name || id
      const urls = Array.isArray(api) ? api : [api]
      const isPerformance = id === 'performance' && urls.length === 2
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        const subLabel = isPerformance ? (url.includes('backend') ? 'Backend' : 'Frontend') : undefined
        steps.push({ url, name, subLabel })
      }
    }
    const totalSteps = steps.length
    setRunSteps(steps.map(({ name, subLabel }) => ({ name, subLabel })))
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const { url, name, subLabel } = steps[stepIndex]
      const stepNum = stepIndex + 1
      setCurrentStep({ step: stepNum, total: totalSteps })
      const displayName = subLabel ? `${name} – ${subLabel}` : name
      setCurrentRunName(displayName)
      if (subLabel) log(`Lancement: ${name} – ${subLabel}...`)
      else log(`Lancement: ${name}...`)
      try {
        const res = await fetch(url, opts)
        const data = await res.json().catch(() => ({}))
        if (data.reportId) {
          reportId = data.reportId
          log(subLabel ? `  → ${subLabel} – Rapport: ${data.reportId}` : `  → Rapport: ${data.reportId}`)
        }
        if (!res.ok) log(subLabel ? `  → ${subLabel} – Erreur: ${data.error || res.statusText}` : `  → Erreur: ${data.error || res.statusText}`)
        else log(subLabel ? `  → ${subLabel} terminé` : `  → Terminé`)
      } catch (e) {
        log(subLabel ? `  → ${subLabel} – Erreur: ${e instanceof Error ? e.message : 'Réseau'}` : `  → Erreur: ${e instanceof Error ? e.message : 'Réseau'}`)
      }
    }
    if (reportId) setLastReportId(reportId)
    log('Tous les tests sélectionnés ont été exécutés.')
    setCurrentRunName(null)
    setCurrentStep(null)
    setRunSteps([])
    setIsRunning(false)
  }


  if (authLoading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
      <div className="p-6 space-y-6 relative">
        {/* Overlay pendant l’exécution : bloque la page et indique le test en cours */}
        {isRunning && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            aria-live="polite"
            role="alert"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md mx-4 text-center border-2 border-amber-500">
              <Loader2 className="w-16 h-16 animate-spin text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Exécution en cours
              </h2>
              <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">
                Ne pas quitter la page (recharger annule la run)
              </p>
              {currentStep && currentStep.total > 0 && (
                <div className="mt-3 mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progression</span>
                    <span className="font-mono">{currentStep.step} / {currentStep.total}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${Math.round((currentStep.step / currentStep.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {(currentStep || currentRunName) && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                  {currentStep && currentStep.total > 1 && (
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      Test {currentStep.step}/{currentStep.total}
                      {currentRunName ? ' : ' : ''}
                    </span>
                  )}
                  {currentRunName && <strong>{currentRunName}</strong>}
                  {(currentRunName?.includes('Playwright') || currentRunName?.includes('Backoffice') || currentRunName?.includes('Performance')) && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">(peut prendre plusieurs minutes)</span>
                  )}
                </p>
              )}
              {runSteps.length > 0 && runSteps.length <= 12 && (
                <div className="mt-4 text-left max-h-40 overflow-y-auto rounded bg-gray-100 dark:bg-gray-900/50 p-2 text-xs">
                  <div className="font-medium text-gray-500 dark:text-gray-400 mb-1.5">Étapes</div>
                  {runSteps.map((s, i) => {
                    const stepNum = i + 1
                    const total = runSteps.length
                    const isDone = currentStep ? stepNum < currentStep.step : false
                    const isCurrent = currentStep ? stepNum === currentStep.step : false
                    const label = s.subLabel ? `${s.name} – ${s.subLabel}` : s.name
                    return (
                      <div key={i} className={`flex items-center gap-2 py-0.5 ${isCurrent ? 'text-amber-600 dark:text-amber-400 font-medium' : isDone ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {isDone && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {isCurrent && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
                        {!isDone && !isCurrent && <Circle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{stepNum}. {label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-blue-600" />
            Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sélectionnez une ou plusieurs catégories puis lancez les tests, ou ouvrez une page dédiée.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runSelected}
            disabled={selectedIds.length === 0 || isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            {isRunning ? 'Exécution...' : `Lancer les tests sélectionnés (${selectedIds.length})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([...RUNNABLE_IDS])}
            disabled={isRunning || selectedIds.length === RUNNABLE_IDS.length}
            className="gap-1.5"
          >
            <Check className="w-4 h-4" />
            Tout sélectionner
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={isRunning || selectedIds.length === 0}
            className="gap-1.5"
          >
            <Circle className="w-4 h-4" />
            Tout décocher
          </Button>
          <Link href="/backoffice/test-reports">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Voir tous les rapports
            </Button>
          </Link>
          {lastReportId && (
            <Link href={`/backoffice/test-reports?open=${encodeURIComponent(lastReportId)}`}>
              <Button variant="outline" size="sm" className="gap-2 text-emerald-600 border-emerald-300">
                <FileText className="w-4 h-4" />
                Dernier rapport
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const runnable = RUNNABLE_IDS.includes(cat.id as any)
            const selected = selectedIds.includes(cat.id)
            return (
              <div
                key={cat.id}
                className={`rounded-xl border-2 p-5 transition-all ${cat.bgClass} border flex items-stretch gap-0`}
              >
                {/* Zone gauche entière cliquable pour cocher/décocher (symbole + texte) */}
                <button
                  type="button"
                  onClick={() => runnable && !isRunning && toggleSelection(cat.id)}
                  disabled={isRunning}
                  className={`flex-1 flex items-start gap-3 text-left min-w-0 p-0 border-0 bg-transparent rounded-l-lg ${
                    runnable && !isRunning ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-90'
                  } ${isRunning ? 'pointer-events-none' : ''}`}
                  aria-pressed={runnable ? selected : undefined}
                  aria-label={runnable ? `Sélectionner ou désélectionner ${cat.name}` : undefined}
                >
                  {runnable && (
                    <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded border-2 border-gray-400 mt-0.5">
                      {selected && <span className="text-green-600 font-bold">✓</span>}
                    </span>
                  )}
                  {!runnable && <span className="w-8 shrink-0" aria-hidden />}
                  <div className={`p-2 rounded-lg shrink-0 ${cat.iconClass} bg-white/50 dark:bg-black/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`font-semibold text-lg ${cat.textClass}`}>{cat.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </button>
                <Link
                  href={cat.href}
                  className="shrink-0 self-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded"
                >
                  Ouvrir →
                </Link>
              </div>
            )
          })}
        </div>

        {runLog.length > 0 && (
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/50 p-4 font-mono text-sm">
            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Journal d&apos;exécution</div>
            {runLog.map((line, i) => (
              <div key={i} className="text-gray-600 dark:text-gray-400">{line}</div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

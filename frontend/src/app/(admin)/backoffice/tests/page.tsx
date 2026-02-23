'use client'

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
} from 'lucide-react'
import { Loader2 } from '@/lib/icons'

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
  const { loading: authLoading, isAuthenticated } = useAuth()

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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-blue-600" />
            Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choisissez une catégorie pour exécuter des tests ou consulter les rapports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className={`block rounded-xl border-2 p-5 transition-all hover:shadow-lg ${cat.bgClass} border`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${cat.iconClass} bg-white/50 dark:bg-black/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`font-semibold text-lg ${cat.textClass}`}>{cat.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Link
            href="/backoffice/test-reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <BarChart3 className="w-5 h-5" />
            Voir tous les rapports
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

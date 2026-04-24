'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { StatisticsSubNav } from '../StatisticsSubNav'
import { analyticsService } from '@/lib/api/analytics.service'

type SecuritySummary = Record<string, unknown> | null

export default function StatisticsSecurityPage() {
  const [summary, setSummary] = useState<SecuritySummary>(null)
  const [metrics, setMetrics] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const hours = 7 * 24
      const [s, m] = await Promise.all([
        analyticsService.getSecuritySummary(hours),
        analyticsService.getSecurityMetrics(hours),
      ])
      setSummary(s && typeof s === 'object' ? (s as Record<string, unknown>) : null)
      setMetrics(Array.isArray(m) ? (m as Record<string, unknown>[]) : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const overview = summary && typeof summary === 'object' ? (summary as Record<string, unknown>) : null

  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-5xl space-y-6">
        <StatisticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Statistiques — Sécurité</h1>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Rafraîchir
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Agrégats via <code className="text-xs">GET /api/v1/security/stats</code> (gateway) et série persistée{' '}
          <code className="text-xs">/api/v1/persistence/security/metrics</code> (metrics-aggregator).
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <>
            {overview && Object.keys(overview).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(overview)
                  .filter(([, v]) => v != null && typeof v !== 'object')
                  .slice(0, 12)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">{k}</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{String(v)}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pas de résumé sécurité (droits, service security ou données vides).
              </p>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                Points persistés (metrics-aggregator)
              </h2>
              {metrics.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune entrée sur la période.</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-auto text-xs text-gray-700 dark:text-gray-300">
                  {metrics.slice(0, 40).map((row, i) => (
                    <li key={i} className="font-mono">
                      {JSON.stringify(row).slice(0, 200)}
                      {JSON.stringify(row).length > 200 ? '…' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/backoffice/statistics"
                className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                ← Vue d’ensemble
              </Link>
              <Link
                href="/backoffice/security"
                className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                Vue opérationnelle Sécurité →
              </Link>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

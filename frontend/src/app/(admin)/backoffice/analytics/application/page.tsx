'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import { statisticsService } from '@/lib/services/statisticsService';

export default function ApplicationPerformancePage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [appStats, setAppStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [metricsRes, statsRes] = await Promise.all([
          centralMetricsService.fetchMetrics().catch(() => null),
          statisticsService.getCurrentStatistics().catch(() => null),
        ]);
        if (!cancelled) {
          setMetrics(metricsRes ?? null);
          setAppStats(statsRes ? (statsRes as Record<string, unknown>) : null);
        }
      } catch (e) {
        if (!cancelled) setMetrics(null);
        setAppStats(null);
      } finally {
        if (!cancelled) setLoading(false);
        cancelled = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const perf = metrics?.performance as Record<string, unknown> | undefined;
  const system = metrics?.system as Record<string, unknown> | undefined;
  const health = metrics?.health as Record<string, unknown> | undefined;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performances applicatives
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Indicateurs issus de l&apos;application utilisateur et des services (temps de réponse, disponibilité, statistiques).
          </p>
        </div>
        <Link href="/backoffice/analytics" className="text-primary-600 hover:underline dark:text-primary-400 text-sm">
          ← Retour à la vue d&apos;ensemble Analytics
        </Link>
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">Chargement…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perf?.averageResponseTime != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Temps de réponse moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Number(perf.averageResponseTime).toFixed(0)} ms</p>
              </div>
            )}
            {health?.availability_percent != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Disponibilité</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Number(health.availability_percent).toFixed(1)} %</p>
              </div>
            )}
            {system?.cpu != null && typeof system.cpu === 'object' && (system.cpu as Record<string, unknown>).usage != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">CPU (système projet)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Number((system.cpu as Record<string, unknown>).usage).toFixed(1)} %</p>
              </div>
            )}
            {appStats?.users != null && typeof appStats.users === 'object' && (appStats.users as Record<string, unknown>).total != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Utilisateurs total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(appStats.users as Record<string, unknown>).total as number}</p>
              </div>
            )}
            {appStats?.applications != null && typeof appStats.applications === 'object' && (appStats.applications as Record<string, unknown>).total != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(appStats.applications as Record<string, unknown>).total as number}</p>
              </div>
            )}
          </div>
        )}
        {!loading && !metrics && !appStats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée de performances applicatives disponible. Vérifiez que le dashboard et les statistiques sont accessibles.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

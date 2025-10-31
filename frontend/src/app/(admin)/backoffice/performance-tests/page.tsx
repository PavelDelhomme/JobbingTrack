'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Play, TrendingUp, Zap, Activity } from 'lucide-react';

export default function PerformanceTestsPage() {
  const [metrics, setMetrics] = useState({
    loadTime: 1.2,
    ttfb: 0.3,
    fcp: 0.8,
    lcp: 1.5,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Tests de Performance
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analysez les performances de votre application
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Play className="h-5 w-5" />
            Lancer les tests
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Load Time</p>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.loadTime}s</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">TTFB</p>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.ttfb}s</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">FCP</p>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.fcp}s</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">LCP</p>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.lcp}s</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4">Score de Performance</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className="bg-green-600 h-8 rounded-full flex items-center justify-end pr-4" style={{ width: '85%' }}>
                <span className="text-white font-bold">85/100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recommandations</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Images optimisées</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Minification CSS/JS activée</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600">⚠</span>
              <span className="text-gray-700 dark:text-gray-300">Améliorer le cache navigateur</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600">⚠</span>
              <span className="text-gray-700 dark:text-gray-300">Réduire le temps de réponse serveur</span>
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}


'use client'

import { TestTube } from '@/lib/icons'
import Link from 'next/link'

export default function TestDataTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TestTube className="h-8 w-8 text-amber-600" />
          Données test
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Visualiser et gérer les données de test (filtre isTestData ou utilisateur de test)
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Affichage des enregistrements marqués comme « données de test » (flag <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">isTestData</code> ou compte de test) — à brancher côté API (filtre par type ou utilisateur test).
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/backoffice/test-data"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <TestTube className="h-4 w-4" />
            Générer des données de test
          </Link>
          <Link
            href="/backoffice/datas?tab=applications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Voir toutes les candidatures
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          Une fois le filtre « données test » implémenté en API, cet onglet affichera une table comme Candidatures / Entreprises, limitée aux données de test.
        </p>
      </div>
    </div>
  )
}

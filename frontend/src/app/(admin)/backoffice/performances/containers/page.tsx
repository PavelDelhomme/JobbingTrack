import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { PerformancesSubNav } from '../PerformancesSubNav'

export default function PerformancesContainersBridgePage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-4">
        <PerformancesSubNav />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conteneurs (pont)</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          L’analyse détaillée par conteneur (graphes, historique, listes) reste sur la vue Analytics dédiée,
          alignée avec le reste des métriques Docker.
        </p>
        <Link
          href="/backoffice/analytics/containers"
          className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Ouvrir Analytics — Conteneurs
        </Link>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Cette route « Performances → Conteneurs » sert de point d’entrée cohérent dans le drawer ; le socle
          graphes et les séries par conteneur y sont centralisés pour l’instant.
        </p>
      </div>
    </AdminLayout>
  )
}

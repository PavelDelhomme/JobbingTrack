import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { StatisticsSubNav } from '../StatisticsSubNav'

export default function StatisticsAppDataPage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-4">
        <StatisticsSubNav />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Statistiques — App data</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Emplacement réservé pour des agrégats orientés « données applicatives » (candidatures, agences,
          volumes par entité) en complément de la vue d’ensemble. Les indicateurs déjà visibles en synthèse
          restent sur la page principale pour l’instant.
        </p>
        <Link
          href="/backoffice/statistics"
          className="inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500"
        >
          Vue d’ensemble Statistiques
        </Link>
      </div>
    </AdminLayout>
  )
}

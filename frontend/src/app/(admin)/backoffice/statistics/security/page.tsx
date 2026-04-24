import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { StatisticsSubNav } from '../StatisticsSubNav'

export default function StatisticsSecurityPage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-4">
        <StatisticsSubNav />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Statistiques — Sécurité</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Agrégats « stats » croisant charge, incidents et indicateurs sécurité (à brancher sur les APIs
          security-service / gateway). La navigation opérationnelle reste sous{' '}
          <span className="font-medium text-gray-800 dark:text-gray-200">Sécurité</span> dans le drawer.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/backoffice/statistics"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Vue d’ensemble
          </Link>
          <Link
            href="/backoffice/security"
            className="inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500"
          >
            Vue Sécurité
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { PerformancesSubNav } from '../PerformancesSubNav'

export default function PerformancesDiskStubPage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-4">
        <PerformancesSubNav />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Disque (système)</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Les séries disque hôte / volumes utiles au diagnostic sont en cours d’alignement avec la persistance
          agrégateur et le détail service (Block I/O, snapshots). En attendant, la vue la plus riche reste le
          détail d’un service.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/backoffice/performances"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Retour synthèse Performances
          </Link>
          <Link
            href="/backoffice/services/backoffice"
            className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500"
          >
            Détail service (ex. backoffice)
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

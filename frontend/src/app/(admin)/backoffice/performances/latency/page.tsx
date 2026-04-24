'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/features'
import { PerformancesSubNav } from '../PerformancesSubNav'

/**
 * Alias drawer : même contenu que la section « Temps de réponse » sur /performances (ancre #latence).
 * Next ne conserve pas le fragment dans redirect() serveur ; navigation client ici.
 */
export default function PerformancesLatencyAliasPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/backoffice/performances#latence')
  }, [router])
  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <PerformancesSubNav />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Redirection vers le graphique temps de réponse…
        </p>
      </div>
    </AdminLayout>
  )
}

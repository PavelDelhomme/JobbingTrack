'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/backoffice/statistics', label: 'Vue d’ensemble' },
  { href: '/backoffice/statistics/app-data', label: 'App data' },
  { href: '/backoffice/statistics/security', label: 'Sécurité' },
  { href: '/backoffice/statistics/logs', label: 'Logs (stats)' },
] as const

export function StatisticsSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Statistiques"
    >
      {TABS.map(({ href, label }) => {
        const isActive =
          href === '/backoffice/statistics'
            ? pathname === '/backoffice/statistics'
            : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-violet-600 text-white shadow dark:bg-violet-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

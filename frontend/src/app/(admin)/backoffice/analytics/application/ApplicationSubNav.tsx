'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/backoffice/analytics/application/performance', label: 'Performances live' },
  { href: '/backoffice/analytics/application/activity', label: 'Activité & traces' },
  { href: '/backoffice/analytics/application/feedback', label: 'Retours & signalements' },
] as const

export function ApplicationSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Application"
    >
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow dark:bg-blue-500'
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

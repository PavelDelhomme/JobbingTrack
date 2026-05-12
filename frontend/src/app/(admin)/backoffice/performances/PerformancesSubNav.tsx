'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const TABS = [
  { href: '/b4ck0ff1ce/performances', label: 'Synthèse', hash: null as string | null },
  {
    href: '/b4ck0ff1ce/performances#latence',
    label: 'Temps de réponse',
    hash: '#latence' as string | null,
  },
  { href: '/b4ck0ff1ce/performances/containers', label: 'Conteneurs', hash: null },
  { href: '/b4ck0ff1ce/performances/disk', label: 'Disque', hash: null },
  { href: '/b4ck0ff1ce/performances/network', label: 'Réseau (détail)', hash: null },
  { href: '/b4ck0ff1ce/performances/correlation', label: 'Corrélation', hash: null },
] as const

function useLocationHash(): string {
  const [hash, setHash] = useState('')
  useEffect(() => {
    const read = () => setHash(typeof window !== 'undefined' ? window.location.hash : '')
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return hash
}

export function PerformancesSubNav() {
  const pathname = usePathname()
  const hash = useLocationHash()

  const isActive = (tab: (typeof TABS)[number]) => {
    if (tab.hash === '#latence') {
      return (
        pathname === '/b4ck0ff1ce/performances/latency' ||
        (pathname === '/b4ck0ff1ce/performances' && hash === '#latence')
      )
    }
    if (tab.href === '/b4ck0ff1ce/performances') {
      return (
        pathname === '/b4ck0ff1ce/performances' &&
        hash !== '#latence' &&
        !pathname.startsWith('/b4ck0ff1ce/performances/')
      )
    }
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  }

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Performances"
    >
      {TABS.map((tab) => {
        const active = isActive(tab)
        return (
          <Link
            key={tab.href + tab.label}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow dark:bg-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

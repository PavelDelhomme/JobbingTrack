'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navigation = [
    { name: 'Vue d\'ensemble', href: '/backoffice', icon: '📊' },
    { name: 'Statistiques', href: '/backoffice/statistics', icon: '📈' },
    { name: 'Utilisateurs', href: '/backoffice/users', icon: '👥' },
    { name: 'Candidatures', href: '/backoffice/applications', icon: '📝' },
    { name: 'Entreprises', href: '/backoffice/companies', icon: '🏢' },
    { name: 'Contacts', href: '/backoffice/contacts', icon: '👤' },
    { name: 'Entretiens', href: '/backoffice/interviews', icon: '📅' },
    { name: 'Services & Tests', href: '/backoffice/services', icon: '🔧' },
    { name: 'Testeur API', href: '/backoffice/api-tester', icon: '🧪' },
    { name: 'Gestion Données', href: '/backoffice/data-management', icon: '💾' },
    { name: 'Logs & Activités', href: '/backoffice/logs', icon: '📋' },
    { name: 'Configuration', href: '/backoffice/settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center bg-gray-800">
          <Link href="/backoffice" className="text-2xl font-bold text-white">
            🎯 JobbingTrack
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 mb-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white"
              title="Déconnexion"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-xl font-semibold text-gray-900">
              Backoffice Administrateur
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}


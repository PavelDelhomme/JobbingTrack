'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface AdminLayoutProps {
  children: ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: string
}

interface NavSection {
  id: string
  label: string
  icon: string
  items: NavItem[]
  isCollapsible?: boolean
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [darkMode, setDarkMode] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    data: true,
    admin: true,
    dev: true,
    cleanup: false,
  })

  // Charger le mode sombre depuis localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Sauvegarder et appliquer le mode sombre
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const sections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: '📊',
      isCollapsible: true,
      items: [
        { name: 'Vue d\'ensemble', href: '/backoffice', icon: '📊' },
        { name: 'Statistiques', href: '/backoffice/statistics', icon: '📈' },
      ]
    },
    {
      id: 'data',
      label: 'Gestion des Données',
      icon: '📝',
      isCollapsible: true,
      items: [
        { name: 'Candidatures', href: '/backoffice/applications', icon: '📝' },
        { name: 'Entreprises', href: '/backoffice/companies', icon: '🏢' },
        { name: 'Contacts', href: '/backoffice/contacts', icon: '👤' },
        { name: 'Entretiens', href: '/backoffice/interviews', icon: '📅' },
        { name: 'Appels', href: '/backoffice/calls', icon: '📞' },
        { name: 'Relances', href: '/backoffice/followups', icon: '📧' },
        { name: 'Événements', href: '/backoffice/events', icon: '🗓️' },
        { name: 'Notifications', href: '/backoffice/notifications', icon: '🔔' },
      ]
    },
    {
      id: 'cleanup',
      label: 'Archives & Corbeille',
      icon: '📦',
      isCollapsible: true,
      items: [
        { name: 'Archives', href: '/backoffice/archives', icon: '📦' },
        { name: 'Corbeille', href: '/backoffice/trash', icon: '🗑️' },
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: '⚙️',
      isCollapsible: true,
      items: [
        { name: 'Services & Tests', href: '/backoffice/services', icon: '🔧' },
        { name: 'Utilisateurs', href: '/backoffice/users', icon: '👥' },
        { name: 'Gestion Données', href: '/backoffice/data-management', icon: '💾' },
        { name: 'Configuration', href: '/backoffice/settings', icon: '⚙️' },
      ]
    },
    {
      id: 'dev',
      label: 'Développement',
      icon: '🛠️',
      isCollapsible: true,
      items: [
        { name: 'Testeur API', href: '/backoffice/api-tester', icon: '🧪' },
        { name: 'Données de Test', href: '/backoffice/test-data', icon: '🎲' },
        { name: 'Émulateur Mobile', href: '/backoffice/mobile-emulator', icon: '📱' },
      ]
    },
  ]

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 dark:bg-gray-950 flex flex-col shadow-xl border-r border-gray-800 dark:border-gray-900">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center bg-gray-800 dark:bg-gray-900 flex-shrink-0 border-b border-gray-700 dark:border-gray-800">
            <Link href="/backoffice" className="text-2xl font-bold text-white">
              🎯 JobbingTrack
            </Link>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {sections.map((section) => (
              <div key={section.id} className="mb-4">
                {/* Section Header - Cliquable */}
                <button
                  onClick={() => section.isCollapsible && toggleSection(section.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-1
                    ${section.isCollapsible 
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 dark:hover:bg-gray-900 cursor-pointer transition-all' 
                      : 'text-gray-500 cursor-default'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{section.icon}</span>
                    <span>{section.label}</span>
                  </div>
                  {section.isCollapsible && (
                    <span className={`transform transition-transform ${expandedSections[section.id] ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  )}
                </button>

                {/* Section Items - Collapsible */}
                {(!section.isCollapsible || expandedSections[section.id]) && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${isActive 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50' 
                              : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 hover:text-white'
                            }
                          `}
                        >
                          <span className="mr-3 text-base">{item.icon}</span>
                          <span className="truncate">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* User info - Toujours en bas */}
          <div className="border-t border-gray-800 dark:border-gray-900 bg-gray-900 dark:bg-gray-950 flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
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
                className="text-gray-400 hover:text-white transition-colors"
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
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900/50 border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Backoffice Administrateur
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-gray-800 dark:bg-gray-800 text-gray-100 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <span className="text-lg">{darkMode ? '🌙' : '☀️'}</span>
                <span className="text-xs font-medium">
                  {darkMode ? 'Sombre' : 'Clair'}
                </span>
              </button>
            </div>
          </div>
        </div>

          {/* Page content */}
          <main className="p-8 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)] transition-colors">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

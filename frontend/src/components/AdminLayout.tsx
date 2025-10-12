'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import Breadcrumb from './Breadcrumb'

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
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    data: true,
    admin: true,
    dev: true,
    cleanup: false,
  })

  // Charger l'état des sections depuis localStorage
  useEffect(() => {
    const savedSections = localStorage.getItem('expandedSections')
    if (savedSections) {
      try {
        setExpandedSections(JSON.parse(savedSections))
      } catch (error) {
        console.error('Erreur chargement état sections:', error)
      }
    }
  }, [])

  // Auto-expand sections qui contiennent l'élément actif
  useEffect(() => {
    const newExpandedSections = { ...expandedSections }

    sections.forEach(section => {
      if (isSectionActive(section) && section.isCollapsible) {
        newExpandedSections[section.id] = true
      }
    })

    if (JSON.stringify(newExpandedSections) !== JSON.stringify(expandedSections)) {
      setExpandedSections(newExpandedSections)
      localStorage.setItem('expandedSections', JSON.stringify(newExpandedSections))
    }
  }, [pathname, expandedSections])

  // Sauvegarder l'état des sections dans localStorage
  const toggleSection = (sectionId: string) => {
    const newExpandedSections = {
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId]
    }
    setExpandedSections(newExpandedSections)
    localStorage.setItem('expandedSections', JSON.stringify(newExpandedSections))
  }


  // Fonction pour vérifier si une section contient l'élément actif
  const isSectionActive = (section: NavSection) => {
    return section.items.some(item => pathname === item.href)
  }

  // Fonction pour obtenir l'élément actif dans une section
  const getActiveItemInSection = (section: NavSection) => {
    return section.items.find(item => pathname === item.href)
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
    <div className="min-h-screen">
      <style jsx>{`
        /* Animation personnalisée pour les éléments actifs */
        @keyframes activePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .nav-item-active {
          animation: activePulse 2s ease-in-out infinite;
        }

        /* Effet de survol amélioré */
        .nav-item-hover {
          transition: all 0.2s ease;
        }

        .nav-item-hover:hover {
          transform: translateX(4px);
        }

        /* Indicateur de section active */
        .section-active {
          position: relative;
        }

        .section-active::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: linear-gradient(180deg, #3B82F6, #1D4ED8);
          border-radius: 2px;
        }
      `}</style>
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
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-1 relative transition-all
                    ${isSectionActive(section)
                      ? 'text-blue-400 bg-blue-600/20 shadow-lg shadow-blue-600/30 border-l-4 border-blue-400 section-active nav-item-active'
                      : section.isCollapsible
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 dark:hover:bg-gray-900 cursor-pointer nav-item-hover'
                        : 'text-gray-500 cursor-default'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-base transition-all ${isSectionActive(section) ? 'animate-pulse' : ''}`}>
                      {section.icon}
                    </span>
                    <span className={`transition-all ${isSectionActive(section) ? 'font-bold' : ''}`}>
                      {section.label}
                    </span>
                    {isSectionActive(section) && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
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
                      const activeItem = getActiveItemInSection(section)

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group
                            ${isActive
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-600/60 border-l-4 border-blue-300 transform scale-[1.02] nav-item-active'
                              : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 hover:text-white hover:translate-x-1 nav-item-hover'
                            }
                          `}
                        >
                          {/* Indicateur visuel pour l'élément actif */}
                          {isActive && (
                            <>
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-300 rounded-r-full animate-pulse"></div>
                              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                            </>
                          )}

                          {/* Indicateur pour l'élément actif dans la section */}
                          {activeItem && item.name === activeItem.name && !isActive && (
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full opacity-50"></div>
                          )}

                          <span className={`mr-3 text-base transition-all ${isActive ? 'animate-bounce' : 'group-hover:scale-110'}`}>
                            {item.icon}
                          </span>
                          <span className={`truncate transition-all ${isActive ? 'font-bold' : ''}`}>
                            {item.name}
                          </span>

                          {/* Badge pour l'élément actif */}
                          {isActive && (
                            <div className="ml-auto">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
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
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Backoffice Administrateur
              </h1>

              {/* Fil d'Ariane pour la navigation */}
              <Breadcrumb />
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  actualTheme === 'dark'
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={actualTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <span className="text-lg">{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="text-xs font-medium">
                  {actualTheme === 'dark' ? 'Sombre' : 'Clair'}
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

'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/auth'
import { useTheme } from '@/lib/hooks/theme'
import Breadcrumb from './Breadcrumb'
import { GlobalSearch } from './GlobalSearch'
import { OfflineActions } from './OfflineActions'
import { SettingsPopup } from './SettingsPopup'
import { ProfilePopup } from './ProfilePopup'
import { QuickMenuPopup } from './QuickMenuPopup'

interface AdminLayoutProps {
  children: ReactNode
}

interface NavItem {
  name: string
  href?: string
  icon: string
  onClick?: () => void
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // ✅ État pour la sidebar mobile
  const [isSettingsOpen, setIsSettingsOpen] = useState(false) // ✅ État pour le popup des paramètres
  const [isProfileOpen, setIsProfileOpen] = useState(false) // ✅ État pour la popup du profil
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false) // ✅ État pour le menu rapide utilisateur
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    security: true,
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

  // ✅ Fermer la sidebar sur mobile quand on change de page
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // Auto-expand sections qui contiennent l'élément actif (seulement si pas explicitement fermé)
  useEffect(() => {
    // Ne pas auto-expand si l'utilisateur a fermé des sections
    const hasUserInteracted = Object.values(expandedSections).some(expanded => expanded === false)

    if (!hasUserInteracted) {
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
        { name: '🔍 Recherche Optimisée', href: '/backoffice/search', icon: '⚡' },
        { name: 'Statistiques', href: '/backoffice/statistics', icon: '📈' },
        { name: 'Performances & Analytics', href: '/backoffice/analytics', icon: '⚡' },
      ]
    },
    {
      id: 'security',
      label: 'Sécurité & Logs',
      icon: '🔒',
      isCollapsible: true,
      items: [
        { name: 'Logs de Sécurité', href: '/backoffice/logs', icon: '📋' },
        { name: 'Analyse de Sécurité', href: '/backoffice/security-analysis', icon: '🛡️' },
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
        { name: 'Gestion des Services', href: '/backoffice/services', icon: '🔧' },
        { name: 'Utilisateurs', href: '/backoffice/users', icon: '👥' },
        { name: 'Mon Profil', icon: '👤', onClick: () => setIsProfileOpen(true) },
        { name: 'Gestion Données', href: '/backoffice/data-management', icon: '💾' },
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
        {/* ✅ Overlay mobile - Ferme la sidebar quand on clique dessus */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar - Cachée sur mobile, visible sur desktop */}
        <div className={`
          fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 flex flex-col shadow-xl border-r border-gray-200 dark:border-gray-800 z-50 transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo avec bouton de fermeture sur mobile */}
          <div className="flex h-16 items-center justify-between px-4 lg:justify-center bg-gray-100 dark:bg-gray-800 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <Link href="/backoffice" className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              🎯 JobbingTrack
            </Link>
            {/* Bouton fermer visible uniquement sur mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2"
              aria-label="Fermer le menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
            {sections.map((section) => (
              <div key={section.id} className="mb-4">
                {/* Section Header - Cliquable */}
                <button
                  onClick={() => section.isCollapsible && toggleSection(section.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-1 relative transition-all
                    ${isSectionActive(section)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/30 dark:shadow-blue-400/30 border-l-4 border-blue-600 dark:border-blue-400 section-active nav-item-active'
                      : section.isCollapsible
                        ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer nav-item-hover'
                        : 'text-gray-500 dark:text-gray-600 cursor-default'
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

                      const content = (
                        <>
                          {/* Indicateur visuel pour l'élément actif */}
                          {isActive && (
                            <>
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 dark:bg-blue-400 rounded-r-full animate-pulse"></div>
                              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-600 dark:bg-blue-300 rounded-full animate-ping opacity-75"></div>
                            </>
                          )}

                          {/* Indicateur pour l'élément actif dans la section */}
                          {activeItem && item.name === activeItem.name && !isActive && (
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 dark:bg-blue-400 rounded-r-full opacity-50"></div>
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
                        </>
                      )

                      return (
                        item.onClick ? (
                          <button
                            key={item.name}
                            onClick={item.onClick}
                            className={`
                              flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group w-full text-left
                              ${isActive
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white shadow-xl shadow-blue-600/60 dark:shadow-blue-500/60 border-l-4 border-blue-300 dark:border-blue-200 transform scale-[1.02] nav-item-active'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:translate-x-1 nav-item-hover'
                              }
                            `}
                          >
                            {content}
                          </button>
                        ) : item.href ? (
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
                            {content}
                          </Link>
                        ) : null
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
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center hover:bg-gray-800 rounded-lg p-2 transition-colors"
                  title="Ouvrir le profil"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{user?.role}</p>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                  title="Déconnexion"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Pas de marge sur mobile, marge sur desktop */}
        <div className="lg:ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900/50 border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            {/* Section gauche - Navigation et titre */}
            <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
              {/* ✅ Bouton hamburger pour mobile */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isSidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Titre - Responsive */}
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                <span className="hidden sm:inline">Backoffice Administrateur</span>
                <span className="sm:hidden">Admin</span>
              </h1>

              {/* Fil d'Ariane pour la navigation - Caché sur très petits écrans */}
              <div className="hidden lg:block flex-shrink-0">
                <Breadcrumb />
              </div>
            </div>

            {/* Section droite - Actions et contrôles */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
              {/* Recherche globale - Masquée sur très petits écrans */}
              <div className="hidden sm:block max-w-xs lg:max-w-md flex-1">
                <GlobalSearch className="w-full" />
              </div>



              {/* Email - Cliquable pour ouvrir le menu rapide - Caché sur petits écrans moyens */}
              <button
                onClick={() => setIsQuickMenuOpen(true)}
                className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Menu rapide utilisateur"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="max-w-32 truncate">
                  {user?.email}
                </span>
              </button>

              {/* Settings Button - Compact */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Paramètres"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Theme Toggle - Toujours visible mais compact sur mobile */}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1 sm:gap-2 px-2 lg:px-3 py-1.5 rounded-lg transition-all ${
                  actualTheme === 'dark'
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={actualTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <span className="text-lg">{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="hidden sm:inline text-xs font-medium">
                  {actualTheme === 'dark' ? 'Sombre' : 'Clair'}
                </span>
              </button>
            </div>
          </div>

          {/* Barre de recherche mobile - Seulement sur très petits écrans */}
          <div className="sm:hidden px-4 pb-3">
            <GlobalSearch className="w-full" />
          </div>
        </div>

          {/* Page content - Padding adapté pour mobile */}
          <main className="p-4 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)] transition-colors">
            {children}
          </main>
        </div>
      </div>

      {/* Popup des paramètres */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Popup du profil utilisateur */}
      <ProfilePopup
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Menu rapide utilisateur */}
      <QuickMenuPopup
        isOpen={isQuickMenuOpen}
        onClose={() => setIsQuickMenuOpen(false)}
        onSelectProfile={() => setIsProfileOpen(true)}
        onSelectSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  )
}

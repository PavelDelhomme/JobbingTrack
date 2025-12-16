'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/auth'
import { useTheme } from '@/lib/hooks/theme'
import Breadcrumb from './Breadcrumb'
import { GlobalSearch } from './GlobalSearch'
import { OfflineActions } from './OfflineActions'
import { SettingsPopup } from './SettingsPopup'
import { QuickMenuPopup } from './QuickMenuPopup'
import { TrendingUp, Database, Activity, Server } from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

interface NavItem {
  name: string
  href?: string
  icon: string
  onClick?: () => void
  subItems?: NavItem[]
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
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // ✅ État pour la sidebar mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false) // ✅ État pour cacher le drawer sur desktop (visible par défaut)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false) // ✅ État pour le popup des paramètres
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false) // ✅ État pour le menu rapide utilisateur
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false) // ✅ État pour le dropdown du thème
  const [isQuickActionsDropdownOpen, setIsQuickActionsDropdownOpen] = useState(false) // ✅ État pour le dropdown des actions rapides
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    security: true,
    emails: true,
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

  // ✅ Charger l'état du drawer depuis localStorage au démarrage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed')
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === 'true')
      } else {
        // Par défaut, le drawer est visible sur desktop (false = visible)
        setIsSidebarCollapsed(false)
        localStorage.setItem('sidebarCollapsed', 'false')
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
    return section.items.some(item => {
      if (pathname === item.href) return true
      if (item.subItems) {
        return item.subItems.some(subItem => pathname === subItem.href)
      }
      return false
    })
  }

  // Fonction pour obtenir l'élément actif dans une section
  const getActiveItemInSection = (section: NavSection) => {
    return section.items.find(item => {
      if (pathname === item.href) return true
      if (item.subItems) {
        return item.subItems.some(subItem => pathname === subItem.href)
      }
      return false
    })
  }

  const sections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: '📊',
      isCollapsible: true,
      items: [
        { name: 'Vue d\'ensemble', href: '/backoffice', icon: '📊' },
        /*{ name: '🔍 Recherche Optimisée', href: '/backoffice/search', icon: '⚡' },*/
        { name: 'Statistiques', href: '/backoffice/statistique', icon: '📈' },
        { name: 'Performances & Analytics', href: '/backoffice/analytics', icon: '⚡' },
      ]
    },
    {
      id: 'security',
      label: 'Sécurité',
      icon: '🔒',
      isCollapsible: true,
      items: [
        { name: 'Logs de Sécurité&apos;, href: '/backoffice/security/logs', icon: &apos;📋' },
        { name: 'Politiques de Sécurité&apos;, href: '/backoffice/security/policies', icon: &apos;⚙️' },
        { name: 'Analyse de Sécurité&apos;, href: '/backoffice/security/analysis', icon: &apos;🛡️' },
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: '⚙️',
      isCollapsible: true,
      items: [
        { name: 'Gestion des Services&apos;, href: '/backoffice/services', icon: &apos;🔧' },
        { 
          name: 'Gestion des Données', 
          href: '/backoffice/data', 
          icon: '💾',
          subItems: [
            { name: 'Archives&apos;, href: '/backoffice/archives', icon: &apos;📦' },
            { name: 'Corbeille&apos;, href: '/backoffice/trash', icon: &apos;🗑️' },
          ]
        },
        { name: 'Utilisateurs&apos;, href: '/backoffice/users', icon: &apos;👥' },
        { name: 'Analytics Utilisateur&apos;, href: '/backoffice/user-analytics', icon: &apos;📊' },
      ]
    },
    {
      id: 'dev',
      label: 'Développement',
      icon: '🛠️',
      isCollapsible: true,
      items: [
        { name: 'Testeur API&apos;, href: '/backoffice/api-tester', icon: &apos;🧪' },
        { name: 'Données de Test&apos;, href: '/backoffice/test-data', icon: &apos;🎲' },
        { name: 'Émulateur Mobile&apos;, href: '/backoffice/mobile-emulator', icon: &apos;📱' },
        { 
          name: 'Tests', 
          href: '/backoffice/playwright-tests', 
          icon: '🧪',
          subItems: [
            { name: 'Tests Playwright&apos;, href: '/backoffice/playwright-tests', icon: &apos;🎭' },
            { name: 'Tests Performance&apos;, href: '/backoffice/performance-tests', icon: &apos;⚡' },
          ]
        },
        { 
          name: 'Parcours Utilisateur', 
          href: '/backoffice/user-journey', 
          icon: '🚶',
          subItems: [
            { name: 'Parcours Prédéfinis&apos;, href: '/backoffice/user-journey', icon: &apos;📋' },
            { name: 'Parcours Personnalisé&apos;, href: '/backoffice/user-journey/custom', icon: &apos;🎯' },
          ]
        },
        { name: 'Rapports de Tests&apos;, href: '/backoffice/test-reports', icon: &apos;📊' },
      ]
    },
    {
      id: 'emails',
      label: 'Gestion des Emails',
      icon: '📧',
      isCollapsible: true,
      items: [
        { name: 'Dashboard&apos;, href: '/backoffice/emails', icon: &apos;📊' },
        { name: 'Email Monitor&apos;, href: '/backoffice/email-monitor', icon: &apos;📈' },
        { name: 'Historique&apos;, href: '/backoffice/emails/logs', icon: &apos;📋' },
        { name: 'Templates&apos;, href: '/backoffice/emails/templates', icon: &apos;📝' },
        { name: 'Configuration&apos;, href: '/backoffice/emails/settings', icon: &apos;⚙️' },
        { name: 'Déliverabilité&apos;, href: '/backoffice/emails/deliverability', icon: &apos;✅' },
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

        {/* Sidebar - Cachée sur mobile, peut être cachée sur desktop */}
        <div className={`
          fixed inset-y-0 left-0 w-72 md:w-80 bg-white dark:bg-gray-900 flex flex-col shadow-xl border-r border-gray-200 dark:border-gray-800 z-50 transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0&apos; : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:-translate-x-full lg:pointer-events-none lg:opacity-0&apos; : 'lg:pointer-events-auto lg:opacity-100'}
        `}>
          {/* Logo avec bouton de fermeture sur mobile */}
          <div className="flex h-16 items-center justify-between px-4 bg-gray-100 dark:bg-gray-800 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
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
                    <span className={`text-base transition-all ${isSectionActive(section) ? 'animate-pulse&apos; : ''}`}>
                      {section.icon}
                    </span>
                    <span className={`transition-all ${isSectionActive(section) ? 'font-bold&apos; : ''}`}>
                      {section.label}
                    </span>
                  </div>
                  {section.isCollapsible && (
                    <span className={`transform transition-transform ${expandedSections[section.id] ? 'rotate-90&apos; : ''}`}>
                      ▶
                    </span>
                  )}
                </button>

                {/* Section Items - Collapsible */}
                {(!section.isCollapsible || expandedSections[section.id]) && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href
                      const hasSubItems = item.subItems && item.subItems.length > 0
                      const isSubItemActive = hasSubItems && item.subItems?.some(subItem => pathname === subItem.href)
                      const itemKey = `item-${item.name}-${section.id}`
                      const isItemExpanded = expandedSections[itemKey] ?? false
                      const activeItem = getActiveItemInSection(section)

                      const content = (
                        <>
                          {/* Indicateur visuel pour l'élément actif */}
                          {(isActive || isSubItemActive) && (
                            <>
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 dark:bg-blue-400 rounded-r-full animate-pulse"></div>
                              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-600 dark:bg-blue-300 rounded-full animate-ping opacity-75"></div>
                            </>
                          )}

                          {/* Indicateur pour l'élément actif dans la section */}
                          {activeItem && item.name === activeItem.name && !isActive && !isSubItemActive && (
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 dark:bg-blue-400 rounded-r-full opacity-50"></div>
                          )}

                          <span className={`mr-3 text-base transition-all ${isActive ? 'animate-bounce&apos; : 'group-hover:scale-110'}`}>
                            {item.icon}
                          </span>
                          <span className={`truncate transition-all ${isActive || isSubItemActive ? 'font-bold&apos; : ''}`}>
                            {item.name}
                          </span>


                          {/* Badge pour l'élément actif */}
                          {(isActive || isSubItemActive) && (
                            <div className="ml-auto">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </>
                      )

                      return (
                        <div key={item.name} className="space-y-1">
                          {item.onClick ? (
                            <button
                              onClick={item.onClick}
                              className={`
                                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group w-full text-left
                                ${isActive || isSubItemActive
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white shadow-xl shadow-blue-600/60 dark:shadow-blue-500/60 border-l-4 border-blue-300 dark:border-blue-200 transform scale-[1.02] nav-item-active'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:translate-x-1 nav-item-hover'
                                }
                              `}
                            >
                              {content}
                            </button>
                          ) : item.href ? (
                            <div>
                              <div className="flex items-center">
                                <Link
                                  href={item.href}
                                  className={`
                                    flex-1 flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group
                                    ${isActive || isSubItemActive
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-600/60 border-l-4 border-blue-300 transform scale-[1.02] nav-item-active'
                                      : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 hover:text-white hover:translate-x-1 nav-item-hover'
                                    }
                                  `}
                                >
                                  {content}
                                </Link>
                                {hasSubItems && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleSection(itemKey)
                                    }}
                                    className={`ml-1 px-2 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-all ${
                                      isItemExpanded ? 'text-white bg-gray-700&apos; : ''
                                    }`}
                                    aria-label="Expander les sous-items"
                                  >
                                    <span className={`transform transition-transform ${isItemExpanded ? 'rotate-90&apos; : ''}`}>
                                      ▶
                                    </span>
                                  </button>
                                )}
                              </div>
                              {/* Sous-items */}
                              {hasSubItems && isItemExpanded && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
                                  {item.subItems.map((subItem) => {
                                    const isSubActive = pathname === subItem.href
                                    return subItem.href ? (
                                      <Link
                                        key={subItem.name}
                                        href={subItem.href}
                                        className={`
                                          flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative group
                                          ${isSubActive
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 border-l-2 border-blue-300 transform scale-[1.01]'
                                            : 'text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white hover:translate-x-1'
                                          }
                                        `}
                                      >
                                        <span className="mr-2 text-sm">{subItem.icon}</span>
                                        <span>{subItem.name}</span>
                                        {isSubActive && (
                                          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        )}
                                      </Link>
                                    ) : null
                                  })}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
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
                  onClick={() => {
                    if (user?.id) {
                      router.push(`/backoffice/users/${user.id}`)
                    }
                  }}
                  className="flex items-center hover:bg-gray-800 rounded-lg p-2 transition-colors cursor-pointer"
                  title="Voir le profil"
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

        {/* Main content - Pas de marge sur mobile, marge sur desktop si drawer visible */}
        <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-0&apos; : 'lg:ml-72 md:ml-80'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900/50 border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className={`flex h-16 items-center justify-between px-4 lg:px-8 ${isSidebarCollapsed ? '&apos; : 'lg:pl-12 md:pl-12'}`}>
            {/* Section gauche - Navigation et titre */}
            <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
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
              
              {/* ✅ Bouton toggle pour afficher/masquer le drawer sur desktop - TOUJOURS VISIBLE */}
              <button
                onClick={() => {
                  const newState = !isSidebarCollapsed
                  setIsSidebarCollapsed(newState)
                  localStorage.setItem('sidebarCollapsed', String(newState))
                }}
                className="hidden lg:flex items-center justify-center w-10 h-10 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md"
                aria-label="Toggle sidebar"
                title={isSidebarCollapsed ? "Afficher le menu de navigation" : "Masquer le menu de navigation"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  {isSidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
              </button>

              {/* Titre retiré - Plus de texte "Backoffice Administrateur" ou "Backoffice" */}
            </div>

            {/* Section centrale - Recherche globale - Prend toute la place disponible */}
            <div className="hidden sm:flex flex-1 min-w-0 mx-4 lg:mx-6">
              <GlobalSearch className="w-full" />
            </div>

            {/* Section droite - Actions et contrôles */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0 min-w-0">



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

              {/* Settings Button - Plus d'espace */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Paramètres"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">Paramètres</span>
              </button>

              {/* Quick Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsQuickActionsDropdownOpen(!isQuickActionsDropdownOpen)}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 sm:gap-2 text-sm font-medium"
                  title="Actions rapides"
                >
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Actions</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isQuickActionsDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsQuickActionsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      <button
                        onClick={() => {
                          router.push('/backoffice/analytics')
                          setIsQuickActionsDropdownOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span>Analytics</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/backoffice/statistique')
                          setIsQuickActionsDropdownOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Database className="h-4 w-4 text-purple-600" />
                        <span>Statistiques</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/search')
                          setIsQuickActionsDropdownOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Activity className="h-4 w-4 text-orange-600" />
                        <span>Recherche</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/backoffice/services')
                          setIsQuickActionsDropdownOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Server className="h-4 w-4 text-green-600" />
                        <span>Services</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Theme Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-2 rounded-lg transition-all ${
                    actualTheme === 'dark'
                      ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={actualTheme === 'dark&apos; ? 'Passer en mode clair' : &apos;Passer en mode sombre'}
                >
                  <span className="text-lg sm:text-xl">{actualTheme === 'dark&apos; ? '🌙' : &apos;☀️&apos;}</span>
                  <span className="hidden sm:inline text-sm font-medium">
                    {actualTheme === 'dark&apos; ? 'Sombre' : &apos;Clair'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isThemeDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsThemeDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      <button
                        onClick={() => {
                          setThemeMode('light')
                          setIsThemeDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          theme === 'light&apos; ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : &apos;text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>☀️</span>
                        <span>Mode Clair</span>
                        {theme === 'light' && <span className="ml-auto">✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          setThemeMode('dark')
                          setIsThemeDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          theme === 'dark&apos; ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : &apos;text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>🌙</span>
                        <span>Mode Sombre</span>
                        {theme === 'dark' && <span className="ml-auto">✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          setThemeMode('system')
                          setIsThemeDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          theme === 'system&apos; ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : &apos;text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>💻</span>
                        <span>Mode Système</span>
                        {theme === 'system' && <span className="ml-auto">✓</span>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Barre de recherche mobile - Seulement sur très petits écrans */}
          <div className="sm:hidden px-4 pb-3">
            <GlobalSearch className="w-full" />
          </div>
        </div>

          {/* Page content - Padding adapté pour mobile avec espacement supplémentaire si drawer visible */}
          <main className={`p-4 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)] transition-colors ${isSidebarCollapsed ? '&apos; : 'lg:pl-12 md:pl-12'}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Popup des paramètres */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Menu rapide utilisateur */}
      <QuickMenuPopup
        isOpen={isQuickMenuOpen}
        onClose={() => setIsQuickMenuOpen(false)}
        onSelectProfile={() => {
          if (user?.id) {
            router.push(`/backoffice/users/${user.id}`)
          }
          setIsQuickMenuOpen(false)
        }}
        onSelectSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  )
}

'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { 
  Database, FileText, Building2, Users, Calendar, 
  Phone, Mail, Bell, Briefcase
} from '@/lib/icons'

// ✅ OPTIMISATION : Chargement lazy des composants d'onglets
const DataManagementTab = lazy(() => import('./components/DataManagementTab'))
const ApplicationsTab = lazy(() => import('./components/ApplicationsTab'))
const CompaniesTab = lazy(() => import('./components/CompaniesTab'))
const ContactsTab = lazy(() => import('./components/ContactsTab'))
const InterviewsTab = lazy(() => import('./components/InterviewsTab'))
const CallsTab = lazy(() => import('./components/CallsTab'))
const FollowupsTab = lazy(() => import('./components/FollowupsTab'))
const EventsTab = lazy(() => import('./components/EventsTab'))
const NotificationsTab = lazy(() => import('./components/NotificationsTab'))
const SuiviInterimContent = lazy(() => import('./components/SuiviInterimContent'))

const TABS = [
  { id: 'management', label: 'Données applicatives', icon: Database },
  { id: 'applications', label: 'Candidatures', icon: FileText },
  { id: 'companies', label: 'Entreprises', icon: Building2 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'interviews', label: 'Entretiens', icon: Calendar },
  { id: 'calls', label: 'Appels', icon: Phone },
  { id: 'followups', label: 'Relances', icon: Mail },
  { id: 'events', label: 'Événements', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'suivi-interim', label: 'Suivi intérim', icon: Briefcase },
]

export default function DataPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Récupérer l'onglet depuis l'URL ou utiliser 'management' par défaut
  const [activeTab, setActiveTab] = useState<string>('management')

  // Synchroniser avec l'URL au chargement ; redirections vers pages dédiées
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab')
    if (tabFromUrl === 'test-data') {
      router.replace('/b4ck0ff1ce/test-data')
      return
    }
    if (tabFromUrl === 'billing') {
      router.replace('/b4ck0ff1ce/billing')
      return
    }
    if (tabFromUrl === 'user-stats') {
      router.replace('/b4ck0ff1ce/user-stats')
      return
    }
    setActiveTab(tabFromUrl || 'management')
  }, [searchParams, router])

  // Mettre à jour l'URL quand l'onglet change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const newUrl = `/b4ck0ff1ce/datas${tabId !== 'management' ? `?tab=${tabId}` : ''}`
    router.push(newUrl, { scroll: false })
  }

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestion des Données
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez toutes vos données depuis un seul endroit
          </p>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenu des onglets - ✅ OPTIMISATION : Chargement lazy */}
        <div className="mt-6">
          {activeTab === 'management' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <DataManagementTab />
            </Suspense>
          )}
          {activeTab === 'applications' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <ApplicationsTab />
            </Suspense>
          )}
          {activeTab === 'companies' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <CompaniesTab />
            </Suspense>
          )}
          {activeTab === 'contacts' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <ContactsTab />
            </Suspense>
          )}
          {activeTab === 'interviews' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <InterviewsTab />
            </Suspense>
          )}
          {activeTab === 'calls' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <CallsTab />
            </Suspense>
          )}
          {activeTab === 'followups' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <FollowupsTab />
            </Suspense>
          )}
          {activeTab === 'events' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <EventsTab />
            </Suspense>
          )}
          {activeTab === 'notifications' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <NotificationsTab />
            </Suspense>
          )}
          {activeTab === 'suivi-interim' && (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>}>
              <SuiviInterimContent />
            </Suspense>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Database, FileText, Building2, Users, Calendar, 
  Phone, Mail, Bell, Download, Upload
} from 'lucide-react'

// Import des composants pour chaque type de données
import DataManagementTab from './components/DataManagementTab'
import ApplicationsTab from './components/ApplicationsTab'
import CompaniesTab from './components/CompaniesTab'
import ContactsTab from './components/ContactsTab'
import InterviewsTab from './components/InterviewsTab'
import CallsTab from './components/CallsTab'
import FollowupsTab from './components/FollowupsTab'
import EventsTab from './components/EventsTab'
import NotificationsTab from './components/NotificationsTab'

const TABS = [
  { id: 'management', label: 'Gestion Données', icon: Database },
  { id: 'applications', label: 'Candidatures', icon: FileText },
  { id: 'companies', label: 'Entreprises', icon: Building2 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'interviews', label: 'Entretiens', icon: Calendar },
  { id: 'calls', label: 'Appels', icon: Phone },
  { id: 'followups', label: 'Relances', icon: Mail },
  { id: 'events', label: 'Événements', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function DataPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Récupérer l'onglet depuis l'URL ou utiliser 'management' par défaut
  const [activeTab, setActiveTab] = useState<string>('management')

  // Synchroniser avec l'URL au chargement
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'management'
    setActiveTab(tabFromUrl)
  }, [searchParams])

  // Mettre à jour l'URL quand l'onglet change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const newUrl = `/backoffice/data${tabId !== 'management' ? `?tab=${tabId}` : ''}`
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

        {/* Contenu des onglets */}
        <div className="mt-6">
          {activeTab === 'management' && <DataManagementTab />}
          {activeTab === 'applications' && <ApplicationsTab />}
          {activeTab === 'companies' && <CompaniesTab />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'interviews' && <InterviewsTab />}
          {activeTab === 'calls' && <CallsTab />}
          {activeTab === 'followups' && <FollowupsTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </AdminLayout>
  )
}


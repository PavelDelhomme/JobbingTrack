'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { companyService, applicationService } from '@/lib/api'

interface Company {
  id: string
  name: string
  companyType?: 'EMPLOYER' | 'TEMP_AGENCY'
  website?: string
  industry?: string
  location?: string
}

interface Application {
  id: string
  position: string
  companyId: string
  agencyId?: string | null
  applicationDate?: string
  status?: { code: string; label?: string }
  company?: { name: string }
  agency?: { name: string } | null
}

/** Contenu réutilisable « Suivi intérim » (sans layout) pour la page dédiée et l’onglet Gestion des données */
export default function SuiviInterimContent() {
  const [agencies, setAgencies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [applicationsByAgency, setApplicationsByAgency] = useState<Record<string, Application[]>>({})
  const [loadingAgency, setLoadingAgency] = useState<Record<string, boolean>>({})
  const [expandedAgencies, setExpandedAgencies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchAgencies()
  }, [])

  const fetchAgencies = async () => {
    try {
      setLoading(true)
      const response = await companyService.getAll({ limit: 200, companyType: 'TEMP_AGENCY' })
      const list = response.data.companies || []
      setAgencies(list)
    } catch (e) {
      console.error('Erreur chargement agences:', e)
      setAgencies([])
    } finally {
      setLoading(false)
    }
  }

  const toggleAgency = async (agencyId: string) => {
    const next = !expandedAgencies[agencyId]
    setExpandedAgencies(prev => ({ ...prev, [agencyId]: next }))
    if (next && !applicationsByAgency[agencyId]?.length && !loadingAgency[agencyId]) {
      setLoadingAgency(prev => ({ ...prev, [agencyId]: true }))
      try {
        const res = await applicationService.getAll({ agencyId, limit: 100 })
        const apps = res.data.applications || []
        setApplicationsByAgency(prev => ({ ...prev, [agencyId]: apps }))
      } catch (e) {
        console.error('Erreur chargement candidatures agence:', e)
        setApplicationsByAgency(prev => ({ ...prev, [agencyId]: [] }))
      } finally {
        setLoadingAgency(prev => ({ ...prev, [agencyId]: false }))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Suivi intérim
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Boîtes d&apos;intérim et candidatures liées
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {agencies.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune boîte d&apos;intérim. Créez une entreprise avec le type &quot;Boîte d&apos;intérim&quot; depuis l&apos;onglet{' '}
            <Link href="/backoffice/datas?tab=companies" className="text-amber-600 dark:text-amber-400 hover:underline">
              Entreprises
            </Link>
            {' '}(filtre Boîtes d&apos;intérim).
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {agencies.map((agency) => {
              const isExpanded = expandedAgencies[agency.id]
              const apps = applicationsByAgency[agency.id] || []
              const loadingApps = loadingAgency[agency.id]
              return (
                <li key={agency.id}>
                  <button
                    type="button"
                    onClick={() => toggleAgency(agency.id)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-500 text-xl">👔</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{agency.name}</p>
                        {agency.industry && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{agency.industry}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">
                      {isExpanded ? '▼' : '▶'} Candidatures
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 px-6 pb-4">
                      {loadingApps ? (
                        <div className="py-4 flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                        </div>
                      ) : apps.length === 0 ? (
                        <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
                          Aucune candidature liée à cette agence.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {apps.map((app) => (
                            <li key={app.id}>
                              <Link
                                href={`/backoffice/applications/${app.id}`}
                                className="block px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">{app.position}</span>
                                {app.company?.name && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">— {app.company.name}</span>
                                )}
                                {app.status?.code && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                    {app.status.code}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

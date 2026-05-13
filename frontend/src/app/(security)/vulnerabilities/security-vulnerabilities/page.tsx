'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { FRONTEND_URLS } from '@/config/ports.config'
import axios from 'axios'

const API_URL = FRONTEND_URLS.api

interface Vulnerability {
  id: string
  title: string
  description: string
  severity: string
  cveId?: string
  cvssScore?: number
  affectedComponent: string
  status: string
  discoveredAt: string
  resolvedAt?: string
  assignedTo?: string
  remediation?: string
  tags: string[]
  metadata?: any
}

export default function SecurityVulnerabilitiesPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState<Vulnerability[]>([])
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    component: '',
    search: ''
  })

  useEffect(() => {
    if (token) {
      loadVulnerabilities()
    }
  }, [token])

  useEffect(() => {
    applyFilters()
  }, [vulnerabilities, filters])

  const loadVulnerabilities = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/vulnerabilities`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setVulnerabilities(response.data.data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des vulnérabilités:', error)

      // Fallback vers des données mockées
      const mockVulnerabilities = Array.from({ length: 30 }, (_, i) => ({
        id: `vuln-${i}`,
        title: `Vulnérabilité ${i + 1}`,
        description: `Description de la vulnérabilité ${i + 1}. Cette vulnérabilité présente un risque de sécurité qui nécessite une attention immédiate.`,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        cveId: Math.random() > 0.5 ? `CVE-2023-${10000 + Math.floor(Math.random() * 9000)}` : undefined,
        cvssScore: Math.random() * 10,
        affectedComponent: ['api-gateway', 'auth-service', 'database', 'frontend', 'application-service', 'company-service'][Math.floor(Math.random() * 6)],
        status: ['open', 'in_progress', 'resolved', 'accepted_risk'][Math.floor(Math.random() * 4)],
        discoveredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        assignedTo: Math.random() > 0.4 ? `admin${Math.floor(Math.random() * 5) + 1}` : undefined,
        remediation: Math.random() > 0.5 ? `Mettre à jour vers la version ${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}` : undefined,
        tags: [['web', 'server', 'database', 'authentication', 'authorization'][Math.floor(Math.random() * 5)]],
        metadata: {
          exploitability: Math.random(),
          impact: Math.random(),
          complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }
      }))

      setVulnerabilities(mockVulnerabilities)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...vulnerabilities]

    if (filters.severity) {
      filtered = filtered.filter(vuln => vuln.severity === filters.severity)
    }

    if (filters.status) {
      filtered = filtered.filter(vuln => vuln.status === filters.status)
    }

    if (filters.component) {
      filtered = filtered.filter(vuln => vuln.affectedComponent === filters.component)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(vuln =>
        vuln.title.toLowerCase().includes(searchTerm) ||
        vuln.description.toLowerCase().includes(searchTerm) ||
        vuln.affectedComponent.toLowerCase().includes(searchTerm) ||
        vuln.cveId?.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredVulnerabilities(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      severity: '',
      status: '',
      component: '',
      search: ''
    })
  }

  const updateVulnerabilityStatus = async (vulnerabilityId: string, newStatus: string) => {
    try {
      await axios.patch(`${API_URL}/api/v1/vulnerabilities/${vulnerabilityId}`, {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setVulnerabilities(prev => prev.map(vuln =>
        vuln.id === vulnerabilityId
          ? {
              ...vuln,
              status: newStatus,
              resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined
            }
          : vuln
      ))
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la vulnérabilité:', error)
      // Simulation pour les données mockées
      setVulnerabilities(prev => prev.map(vuln =>
        vuln.id === vulnerabilityId
          ? {
              ...vuln,
              status: newStatus,
              resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined
            }
          : vuln
      ))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'accepted_risk': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getComponentColor = (component: string) => {
    const colors = [
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    ]
    return colors[component.length % colors.length]
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ⚠️ Vulnérabilités de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion et suivi des vulnérabilités de sécurité découvertes dans le système
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sévérité
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Toutes les sévérités</option>
                <option value="critical">Critique</option>
                <option value="high">Élevée</option>
                <option value="medium">Moyenne</option>
                <option value="low">Faible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                <option value="open">Ouvert</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolu</option>
                <option value="accepted_risk">Risque accepté</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Composant affecté
              </label>
              <select
                value={filters.component}
                onChange={(e) => handleFilterChange('component', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les composants</option>
                <option value="api-gateway">API Gateway</option>
                <option value="auth-service">Auth Service</option>
                <option value="database">Database</option>
                <option value="frontend">Frontend</option>
                <option value="application-service">Application Service</option>
                <option value="company-service">Company Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Effacer
                </button>
                <button
                  onClick={loadVulnerabilities}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher par titre, CVE, composant..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredVulnerabilities.length} vulnérabilités affichées sur {vulnerabilities.length} total
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 dark:text-red-400">
                {filteredVulnerabilities.filter(v => v.severity === 'critical').length} critiques
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {filteredVulnerabilities.filter(v => v.severity === 'high').length} élevées
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {filteredVulnerabilities.filter(v => v.severity === 'medium').length} moyennes
              </span>
              <span className="text-red-600 dark:text-red-400">
                {filteredVulnerabilities.filter(v => v.status === 'open').length} ouvertes
              </span>
            </div>
          </div>
        </div>

        {/* Liste des vulnérabilités */}
        <div className="space-y-4">
          {filteredVulnerabilities.length > 0 ? filteredVulnerabilities.map((vulnerability) => (
            <div key={vulnerability.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${getSeverityColor(vulnerability.severity)}`}>
                    {vulnerability.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(vulnerability.status)}`}>
                    {vulnerability.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getComponentColor(vulnerability.affectedComponent)}`}>
                    {vulnerability.affectedComponent}
                  </span>
                  {vulnerability.cveId && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                      {vulnerability.cveId}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Découverte: {formatDate(vulnerability.discoveredAt)}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {vulnerability.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {vulnerability.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Composant affecté:</strong>
                  <div className="mt-1">{vulnerability.affectedComponent}</div>
                </div>

                {vulnerability.cvssScore && (
                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">Score CVSS:</strong>
                    <div className="mt-1 font-mono">{vulnerability.cvssScore.toFixed(1)}/10</div>
                  </div>
                )}

                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Statut:</strong>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(vulnerability.status)}`}>
                      {vulnerability.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {vulnerability.assignedTo && (
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  👤 Assignée à: {vulnerability.assignedTo}
                </div>
              )}

              {vulnerability.remediation && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                  <strong className="text-green-800 dark:text-green-400">🛠️ Remédiation:</strong>
                  <p className="text-green-700 dark:text-green-300 mt-1">{vulnerability.remediation}</p>
                </div>
              )}

              {vulnerability.resolvedAt && (
                <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                  ✅ Résolue le {formatDate(vulnerability.resolvedAt)}
                </div>
              )}

              {vulnerability.status !== 'resolved' && vulnerability.status !== 'accepted_risk' && (
                <div className="flex items-center gap-2">
                  {vulnerability.status === 'open' && (
                    <button
                      onClick={() => updateVulnerabilityStatus(vulnerability.id, 'in_progress')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      En cours
                    </button>
                  )}

                  <button
                    onClick={() => updateVulnerabilityStatus(vulnerability.id, 'resolved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Résoudre
                  </button>
                </div>
              )}
            </div>
          )) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Aucune vulnérabilité trouvée avec les critères actuels</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

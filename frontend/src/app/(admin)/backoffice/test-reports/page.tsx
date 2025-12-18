'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Download, Eye, RefreshCw, Trash2, Search, Filter, X } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

interface TestReport {
  id: string
  category?: string
  name?: string
  timestamp: string
  date: string
  time: string
  path: string
  summaryPath?: string
  htmlPath?: string
  pdfPath?: string
  jsonPath?: string
  totalTests?: number
  passed?: number
  failed?: number
  skipped?: number
  status?: 'success' | 'failed' | 'partial' | 'unknown'
  type?: 'performance-backend' | 'performance-frontend' | 'playwright' | 'unitaire' | 'e2e' | 'coverage' | 'other'
  size?: number
}

export default function TestReportsPage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth()
  const [reports, setReports] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'tests' | 'passed' | 'failed'>('date')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadReports()
    }
  }, [authLoading, isAuthenticated])

  // Gérer la touche Escape pour fermer le plein écran
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isFullscreen])

  // Gérer la touche Escape pour fermer le plein écran
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isFullscreen])

  const loadReports = async () => {
    try {
      setLoading(true)
      // ✅ NOUVEAU: Utiliser l'API unifiée qui scanne tous les types de rapports
      const response = await fetch('/api/test-reports/all', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReports(data.reports || [])
          // ✅ Stocker les catégories pour le filtre
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories)
          }
        } else {
          console.error('Erreur API chargement rapports:', data.error)
          setReports([])
        }
      } else {
        console.error('Erreur HTTP chargement rapports:', response.status)
        setReports([])
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }


  const loadReportContent = async (reportId: string) => {
    try {
      setLoadingReport(true)
      const report = reports.find(r => r.id === reportId)
      if (!report) return

      // Utiliser l'ID du rapport directement
      const response = await fetch(`/api/test-reports/view?id=${encodeURIComponent(reportId)}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReportContent(data.content)
          setSelectedReport(reportId)
        } else {
          console.error('Erreur API affichage rapport:', data.error)
          alert(`Erreur: ${data.error}`)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        console.error('Erreur chargement rapport:', errorData.error)
        alert(`Erreur: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Erreur chargement contenu rapport:', error)
    } finally {
      setLoadingReport(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      return
    }

    try {
      setDeleting(reportId)
      const response = await fetch(`/api/test-reports/delete?id=${encodeURIComponent(reportId)}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        // Recharger la liste
        await loadReports()
        // Si le rapport supprimé était sélectionné, le désélectionner
        if (selectedReport === reportId) {
          setSelectedReport(null)
          setReportContent(null)
        }
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur suppression rapport:', error)
      alert('Erreur lors de la suppression du rapport')
    } finally {
      setDeleting(null)
    }
  }

  const deleteAllReports = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les rapports ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting('all')
      const response = await fetch('/api/test-reports/delete?all=true', {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        alert(`${data.deleted} rapport(s) supprimé(s)`)
        await loadReports()
        setSelectedReport(null)
        setReportContent(null)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur suppression rapports:', error)
      alert('Erreur lors de la suppression des rapports')
    } finally {
      setDeleting(null)
    }
  }

  // Filtrer et trier les rapports
  const filteredReports = reports
    .filter(report => {
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          report.date.toLowerCase().includes(query) ||
          report.time.toLowerCase().includes(query) ||
          report.id.toLowerCase().includes(query) ||
          (report.name && report.name.toLowerCase().includes(query)) ||
          (report.category && report.category.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Filtre par statut
      if (filterStatus !== 'all') {
        if (report.status !== filterStatus) return false
      }

      // ✅ Filtre par catégorie
      if (filterCategory !== 'all') {
        if (report.category !== filterCategory) return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.timestamp.localeCompare(a.timestamp) // Plus récent en premier
        case 'tests':
          return (b.totalTests || 0) - (a.totalTests || 0)
        case 'passed':
          return (b.passed || 0) - (a.passed || 0)
        case 'failed':
          return (b.failed || 0) - (a.failed || 0)
        default:
          return 0
      }
    })

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des rapports...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">Vous devez être connecté pour accéder aux rapports de tests.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                📊 Rapports de Tests
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Consultez tous les rapports HTML générés par les tests
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={loadReports}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="sm:inline">Actualiser</span>
              </button>
              {reports.length > 0 && (
                <button
                  onClick={deleteAllReports}
                  disabled={deleting === 'all'}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sm:inline">{deleting === 'all' ? 'Suppression...' : 'Tout supprimer'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          {reports.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* ✅ Filtre par catégorie */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">Toutes les catégories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre par statut */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="success">Réussis</option>
                    <option value="failed">Échoués</option>
                    <option value="partial">Partiels</option>
                  </select>
                </div>

                {/* Tri */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date">Trier par date</option>
                    <option value="tests">Trier par nombre de tests</option>
                    <option value="passed">Trier par réussis</option>
                    <option value="failed">Trier par échoués</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun rapport disponible
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucun rapport de test n'a été généré pour le moment.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Exécutez <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">make test-all</code> pour générer des rapports.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
              Accès : <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">http://localhost:5003/backoffice/test-reports</code>
            </p>
          </div>
        ) : (
          <div className={`grid gap-3 sm:gap-4 lg:gap-6 transition-all ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`} style={{ minHeight: 'calc(100vh - 250px)' }}>
            {/* Liste des rapports */}
            {!isFullscreen && (
              <div className="space-y-4 flex flex-col" style={{ minHeight: 'calc(100vh - 250px)' }}>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex-shrink-0">
                  Rapports Disponibles ({filteredReports.length} / {reports.length})
                </h2>
                
                <div className="space-y-3 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                {filteredReports.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Aucun rapport ne correspond aux critères de recherche
                    </p>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-3 sm:p-4 cursor-pointer transition-all hover:shadow-lg ${
                      selectedReport === report.id
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => loadReportContent(report.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(report.status)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {report.name || `Rapport du ${report.date}`}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {report.date} {report.time}
                            </p>
                            {report.category && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                  {report.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {report.status && (
                        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      )}
                    </div>

                    {/* ✅ Toujours afficher les statistiques si disponibles */}
                    {(report.totalTests !== undefined && report.totalTests > 0) || 
                     (report.passed !== undefined && report.passed > 0) || 
                     (report.failed !== undefined && report.failed > 0) ? (
                      <div className="grid grid-cols-4 gap-2 text-sm mt-2">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">{report.totalTests || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600 dark:text-green-400">{report.passed || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Réussis</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600 dark:text-red-400">{report.failed || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Échoués</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600 dark:text-yellow-400">{report.skipped || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Ignorés</div>
                        </div>
                      </div>
                    ) : report.type === 'performance-backend' || report.type === 'performance-frontend' ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        📊 Rapport de performance - Consultez le rapport pour les détails
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          loadReportContent(report.id)
                        }}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 sm:flex-initial min-w-[80px] justify-center"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Voir</span>
                      </button>
                      <a
                        href={`/api/test-reports/download?id=${encodeURIComponent(report.id)}`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex-1 sm:flex-initial min-w-[80px] justify-center"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Télécharger</span>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteReport(report.id)
                        }}
                        disabled={deleting === report.id}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial min-w-[80px] justify-center"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">{deleting === report.id ? '...' : 'Supprimer'}</span>
                      </button>
                    </div>
                  </div>
                  ))
                )}
                </div>
              </div>
            )}

            {/* Aperçu du rapport sélectionné */}
            <div className="space-y-4">
              {loadingReport ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Chargement du rapport...</p>
                </div>
              ) : selectedReport && reportContent ? (
                <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${isFullscreen ? 'fixed inset-2 sm:inset-4 z-50' : ''}`}>
                  <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {isFullscreen ? `REPORT-${selectedReport}` : 'Aperçu du Rapport'}
                      </h2>
                      <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {reports.find(r => r.id === selectedReport)?.date} {reports.find(r => r.id === selectedReport)?.time}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      {isFullscreen ? (
                        <>
                          <button
                            onClick={() => setIsFullscreen(false)}
                            className="flex items-center gap-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-md"
                            title="Réduire le rapport (ou appuyez sur Escape)"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Réduire</span>
                          </button>
                          <a
                            href={`/api/test-reports/download?id=${encodeURIComponent(selectedReport)}`}
                            download
                            className="flex items-center gap-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md"
                          >
                            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Télécharger</span>
                          </a>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReport(null)
                              setReportContent(null)
                              setIsFullscreen(false)
                            }}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            title="Fermer l'aperçu"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Fermer</span>
                          </button>
                          <button
                            onClick={() => setIsFullscreen(true)}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            title="Afficher en plein écran"
                          >
                            <span className="hidden xs:inline">Plein écran</span>
                            <span className="xs:hidden">⛶</span>
                          </button>
                        </>
                      )}
                      <a
                        href={`/api/test-reports/download?id=${encodeURIComponent(selectedReport)}`}
                        download
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Télécharger</span>
                      </a>
                    </div>
                  </div>
                  <div className={`p-2 sm:p-4 ${isFullscreen ? 'h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)]' : ''}`}>
                    <iframe
                      srcDoc={reportContent}
                      className={`w-full border border-gray-200 dark:border-gray-700 rounded ${isFullscreen ? 'h-full' : 'h-[400px] sm:h-[500px] lg:h-[600px]'}`}
                      title="Rapport de test"
                      style={{
                        maxWidth: '100%',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Sélectionnez un rapport pour l'afficher
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


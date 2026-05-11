'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { FileText, CheckCircle, XCircle, AlertCircle, Download, Eye, RefreshCw, X } from 'lucide-react'

const CATEGORY_PARCOURS = 'Parcours Utilisateur'

/** Iframe via Blob URL pour éviter erreurs srcdoc (newlines/guillemets dans le HTML). */
function ReportIframe({ content }: { content: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!content) {
      setSrc(null)
      return
    }
    const blob = new Blob([content], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [content])
  if (!src) return <div className="p-4 text-gray-500">Chargement...</div>
  return (
    <iframe
      src={src}
      className="w-full h-full min-h-[400px] border border-gray-200 dark:border-gray-700 rounded"
      title="Rapport parcours"
    />
  )
}

interface TestReport {
  id: string
  category?: string
  name?: string
  timestamp: string
  date: string
  time: string
  path: string
  totalTests?: number
  passed?: number
  failed?: number
  skipped?: number
  status?: 'success' | 'failed' | 'partial' | 'unknown'
}

export default function UserJourneyReportsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [reports, setReports] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) loadReports()
  }, [authLoading, isAuthenticated])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-reports/all', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.reports)) {
          const parcours = (data.reports as TestReport[]).filter(
            r => r.category === CATEGORY_PARCOURS
          )
          setReports(parcours)
        } else setReports([])
      } else setReports([])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const loadReportContent = async (reportId: string) => {
    try {
      setLoadingReport(true)
      const response = await fetch(`/api/test-reports/view?id=${encodeURIComponent(reportId)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReportContent(data.content)
          setSelectedReport(reportId)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReport(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />
      case 'partial': return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default: return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          {authLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Connectez-vous pour accéder aux rapports de parcours.</p>
          )}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📄 Rapports de parcours
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Consulter et télécharger les rapports d&apos;exécution des parcours utilisateur
            </p>
          </div>
          <button
            onClick={loadReports}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun rapport de parcours
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Exécutez un parcours utilisateur (prédéfini ou personnalisé) pour générer des rapports.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Les rapports sont enregistrés automatiquement après chaque exécution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rapports ({reports.length})
              </h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => loadReportContent(report.id)}
                    className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedReport === report.id
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusIcon(report.status)}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {report.name || `Parcours ${report.date}`}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {report.date} {report.time}
                          </p>
                        </div>
                      </div>
                    </div>
                    {(report.totalTests != null && report.totalTests > 0) || (report.passed != null) || (report.failed != null) ? (
                      <div className="grid grid-cols-4 gap-2 text-sm mt-3">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">{report.totalTests ?? 0}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600 dark:text-green-400">{report.passed ?? 0}</div>
                          <div className="text-xs text-gray-500">Réussis</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600 dark:text-red-400">{report.failed ?? 0}</div>
                          <div className="text-xs text-gray-500">Échoués</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600 dark:text-yellow-400">{report.skipped ?? 0}</div>
                          <div className="text-xs text-gray-500">Ignorés</div>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); loadReportContent(report.id) }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Eye className="w-3 h-3" /> Voir
                      </button>
                      <a
                        href={`/api/test-reports/download?id=${encodeURIComponent(report.id)}`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        <Download className="w-3 h-3" /> Télécharger
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {loadingReport ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Chargement du rapport...</p>
                </div>
              ) : selectedReport && reportContent ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Aperçu du rapport</span>
                    <button
                      onClick={() => { setSelectedReport(null); setReportContent(null) }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 h-[500px] overflow-auto">
                    <ReportIframe content={reportContent} />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Sélectionnez un rapport pour l&apos;afficher
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

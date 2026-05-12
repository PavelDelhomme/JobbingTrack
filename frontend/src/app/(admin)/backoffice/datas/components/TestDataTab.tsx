'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { TestTube, RefreshCw, Tag, Trash2, AlertCircle } from '@/lib/icons'
import { useAuth } from '@/lib/hooks/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

type SummaryCounts = {
  usersTest: number
  usersNonAdminNotTagged: number
  companies: number
  applications: number
  contacts: number
  interviews: number
  followUps: number
  calls: number
  events: number
  documents: number
  emailLogsTest: number
}

export default function TestDataTab() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{
    counts: SummaryCounts
    protectedAdminEmail: string
    protectedUserEmails: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tagMessage, setTagMessage] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    if (!token) return
    setError(null)
    try {
      const { data } = await axios.get(`${API_URL}/api/v1/admin/test-data/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setSummary({
          counts: data.counts,
          protectedAdminEmail: data.protectedAdminEmail,
          protectedUserEmails: data.protectedUserEmails || []
        })
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error || e.message : 'Erreur chargement résumé'
      setError(String(msg))
    }
  }, [token])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const tagLikely = async () => {
    if (!token) return
    if (
      !confirm(
        'Marquer comme données de test (isTestData) les comptes évidents (@jobbingtrack.test, user*@jobbingtrack.test, TEST_USER_EMAIL, etc.) et les entités liées, plus les enregistrements contenant [TEST_DATA_TAG: dans les notes ?\n\nLes comptes admin et PROTECTED_USER_EMAILS ne sont pas modifiés.'
      )
    ) {
      return
    }
    setLoading(true)
    setTagMessage(null)
    setError(null)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/admin/test-data/tag-likely`,
        { includeTaggedNotes: true },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        setTagMessage(JSON.stringify(data.tagged, null, 2))
        await loadSummary()
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error || e.message : 'Erreur marquage'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  const clearTestOnly = async () => {
    if (!token) return
    if (
      !confirm(
        'Supprimer uniquement les données marquées isTestData=true (et logs mail de test) ? Les comptes admin / PROTECTED_USER_EMAILS sont conservés.'
      )
    ) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/admin/clear-test-data`,
        { onlyTestData: true },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        setTagMessage(`Nettoyé : ${JSON.stringify(data.deletedCounts, null, 2)}`)
        await loadSummary()
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error || e.message : 'Erreur nettoyage'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  const c = summary?.counts

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TestTube className="h-8 w-8 text-amber-600" />
          Données test
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Comptes marqués <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">isTestData</code> (sauf{' '}
          <strong>{summary?.protectedAdminEmail || 'admin@jobbingtrack.test'}</strong>
          {summary?.protectedUserEmails?.length ? (
            <>
              {' '}
              et <strong>PROTECTED_USER_EMAILS</strong>
            </>
          ) : null}
          ). Nettoyage ciblé sans toucher au monitoring système.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {tagMessage && (
        <pre className="mb-4 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-3 text-xs text-gray-100 dark:border-gray-700">
          {tagMessage}
        </pre>
      )}

      <div className="mb-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs isTestData</span>
          <span className="text-lg font-semibold tabular-nums">{c?.usersTest ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs non tagués (hors admin)</span>
          <span className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-300">
            {c?.usersNonAdminNotTagged ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Logs mail (test + users test)</span>
          <span className="text-lg font-semibold tabular-nums">{c?.emailLogsTest ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Entreprises test</span>
          <span className="text-lg font-semibold tabular-nums">{c?.companies ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Candidatures test</span>
          <span className="text-lg font-semibold tabular-nums">{c?.applications ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Contacts test</span>
          <span className="text-lg font-semibold tabular-nums">{c?.contacts ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Entretiens / relances / appels</span>
          <span className="text-lg font-semibold tabular-nums">
            {c == null ? '—' : c.interviews + c.followUps + c.calls}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Événements / documents test</span>
          <span className="text-lg font-semibold tabular-nums">
            {c == null ? '—' : c.events + c.documents}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void loadSummary()}
          disabled={loading || !token}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser les compteurs
        </button>
        <button
          type="button"
          onClick={() => void tagLikely()}
          disabled={loading || !token}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
        >
          <Tag className="h-4 w-4" />
          Marquer données de test (heuristiques)
        </button>
        <button
          type="button"
          onClick={() => void clearTestOnly()}
          disabled={loading || !token}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer données isTestData
        </button>
        <Link
          href="/b4ck0ff1ce/test-data"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <TestTube className="h-4 w-4" />
          Générateur avancé
        </Link>
        <Link
          href="/b4ck0ff1ce/datas?tab=applications"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Voir les candidatures
        </Link>
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
        En ligne de commande : <code className="rounded bg-gray-100 px-1 dark:bg-gray-900">make datas-remove-tests-tags</code> — même principe
        (suppression des lignes <code className="rounded bg-gray-100 px-1 dark:bg-gray-900">isTestData</code> côté SQL).
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { 
  Calendar, Clock, Play, Pause, Trash2, Edit, Plus, 
  CheckCircle, XCircle, RefreshCw, Settings, Zap
} from '@/lib/icons'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

interface TestSchedule {
  id: string
  name: string
  type: 'performance-backend' | 'performance-frontend' | 'both' | 'api' | 'backend' | 'frontend' | 'backoffice' | 'security' | 'playwright' | 'emails'
  interval: 'hourly' | 'daily' | 'weekly' | 'custom'
  customCron?: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  createdAt: string
  config?: any
}

export default function PerformanceTestsSchedulePage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth()
  const [schedules, setSchedules] = useState<TestSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<TestSchedule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'both' as 'performance-backend' | 'performance-frontend' | 'both' | 'api' | 'backend' | 'frontend' | 'backoffice' | 'security' | 'playwright' | 'emails',
    interval: 'daily' as 'hourly' | 'daily' | 'weekly' | 'custom',
    customCron: '',
    enabled: true
  })

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSchedules()
    }
  }, [authLoading, isAuthenticated])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-reports/schedule')
      const data = await response.json()
      if (data.success) {
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Erreur chargement schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingSchedule 
        ? `/api/test-reports/schedule?id=${editingSchedule.id}`
        : '/api/test-reports/schedule'
      
      const method = editingSchedule ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSchedule ? { id: editingSchedule.id, ...formData } : formData)
      })
      
      const data = await response.json()
      if (data.success) {
        await loadSchedules()
        setShowModal(false)
        setEditingSchedule(null)
        setFormData({
          name: '',
          type: 'both',
          interval: 'daily',
          customCron: '',
          enabled: true
        })
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur sauvegarde schedule:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const toggleSchedule = async (schedule: TestSchedule) => {
    try {
      const response = await fetch('/api/test-reports/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, enabled: !schedule.enabled })
      })
      
      const data = await response.json()
      if (data.success) {
        await loadSchedules()
      }
    } catch (error) {
      console.error('Erreur toggle schedule:', error)
    }
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce schedule ?')) return
    
    try {
      const response = await fetch(`/api/test-reports/schedule?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (data.success) {
        await loadSchedules()
      }
    } catch (error) {
      console.error('Erreur suppression schedule:', error)
    }
  }

  const runNow = async (schedule: TestSchedule) => {
    try {
      // Lancer les tests selon le type
      if (schedule.type === 'performance-backend' || schedule.type === 'both') {
        await fetch('/api/test/run-performance-backend', { method: 'POST' })
      }
      if (schedule.type === 'performance-frontend' || schedule.type === 'both') {
        await fetch('/api/test/run-performance-frontend', { method: 'POST' })
      }
      if (schedule.type === 'api') {
        await fetch('/api/test/run-api', { method: 'POST' })
      }
      if (schedule.type === 'backend') {
        await fetch('/api/test/run-backend', { method: 'POST' })
      }
      if (schedule.type === 'frontend') {
        await fetch('/api/test/run-frontend', { method: 'POST' })
      }
      if (schedule.type === 'backoffice') {
        await fetch('/api/test/run-backoffice', { method: 'POST' })
      }
      if (schedule.type === 'security') {
        await fetch('/api/test/run-security', { method: 'POST' })
      }
      if (schedule.type === 'playwright') {
        await fetch('/api/test/run-playwright', { method: 'POST' })
      }
      if (schedule.type === 'emails') {
        await fetch('/api/test/run-emails', { method: 'POST' })
      }

      alert('Tests lancés ! Consultez les rapports dans "Rapports de Tests"')
    } catch (error) {
      console.error('Erreur lancement tests:', error)
      alert('Erreur lors du lancement des tests')
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
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
            <p className="text-yellow-800 dark:text-yellow-200">Vous devez être connecté.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              Programmer les Tests
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configurez l'exécution automatique des tests (Performance, API, Backend, Frontend, Backoffice)
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null)
              setFormData({
                name: '',
                type: 'both',
                interval: 'daily',
                customCron: '',
                enabled: true
              })
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nouveau Schedule
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucun schedule configuré
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Créez un schedule pour programmer l'exécution automatique des tests de performance
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {schedule.name}
                      </h3>
                      {schedule.enabled ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-medium">
                          Inactif
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {schedule.type === 'both' ? 'Performance Backend + Frontend' : 
                           schedule.type === 'performance-backend' ? 'Performance Backend' : 
                           schedule.type === 'performance-frontend' ? 'Performance Frontend' :
                           schedule.type === 'api' ? 'Tests API' :
                           schedule.type === 'backend' ? 'Tests Backend' :
                           schedule.type === 'frontend' ? 'Tests Frontend' :
                           schedule.type === 'backoffice' ? 'Tests Backoffice' :
                           schedule.type === 'security' ? 'Tests Sécurité' :
                           schedule.type === 'playwright' ? 'Tests Playwright' :
                           schedule.type === 'emails' ? 'Tests Emails' : schedule.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Intervalle</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {schedule.interval === 'hourly' ? 'Toutes les heures' :
                           schedule.interval === 'daily' ? 'Quotidien' :
                           schedule.interval === 'weekly' ? 'Hebdomadaire' : 'Personnalisé'}
                        </p>
                      </div>
                      {schedule.lastRun && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Dernière exécution</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(schedule.lastRun).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      )}
                      {schedule.nextRun && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Prochaine exécution</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(schedule.nextRun).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => runNow(schedule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Lancer maintenant"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleSchedule(schedule)}
                      className={`p-2 rounded ${
                        schedule.enabled
                          ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                          : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={schedule.enabled ? 'Désactiver' : 'Activer'}
                    >
                      {schedule.enabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSchedule(schedule)
                        setFormData({
                          name: schedule.name,
                          type: schedule.type,
                          interval: schedule.interval,
                          customCron: schedule.customCron || '',
                          enabled: schedule.enabled
                        })
                        setShowModal(true)
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de création/édition */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingSchedule ? 'Modifier le Schedule' : 'Nouveau Schedule'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom du Schedule
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type de Test
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <optgroup label="Tests de Performance">
                      <option value="both">Performance Backend + Frontend</option>
                      <option value="performance-backend">Performance Backend uniquement</option>
                      <option value="performance-frontend">Performance Frontend uniquement</option>
                    </optgroup>
                    <optgroup label="Autres Types de Tests">
                      <option value="api">Tests API</option>
                      <option value="backend">Tests Backend</option>
                      <option value="frontend">Tests Frontend</option>
                      <option value="backoffice">Tests Backoffice (E2E)</option>
                      <option value="security">Tests Sécurité</option>
                      <option value="playwright">Tests Playwright</option>
                      <option value="emails">Tests Emails</option>
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Intervalle
                  </label>
                  <select
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="custom">Personnalisé (Cron)</option>
                  </select>
                </div>
                
                {formData.interval === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expression Cron (ex: 0 0 * * * pour tous les jours à minuit)
                    </label>
                    <input
                      type="text"
                      value={formData.customCron}
                      onChange={(e) => setFormData({ ...formData, customCron: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0 0 * * *"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
                    Activer immédiatement
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingSchedule(null)
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSchedule ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


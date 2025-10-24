'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface GenerationStatus {
  isGenerating: boolean
  intervalMinutes: number
}

export default function SecurityDataGeneratorPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const [intervalMinutes, setIntervalMinutes] = useState(5)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) {
      loadGenerationStatus()
    }
  }, [token])

  const loadGenerationStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/security/generate-continuous/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setGenerationStatus(response.data.data)
        setIntervalMinutes(response.data.data.intervalMinutes || 5)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du statut de génération:', error)
    }
  }

  const startGeneration = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/security/generate-continuous`, {
        intervalMinutes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('✅ Génération continue démarrée avec succès')
        await loadGenerationStatus()
      }
    } catch (error) {
      console.error('Erreur lors du démarrage de la génération:', error)
      setMessage('❌ Erreur lors du démarrage de la génération')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const stopGeneration = async () => {
    setLoading(true)
    try {
      const response = await axios.delete(`${API_URL}/api/v1/security/generate-continuous`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('✅ Génération continue arrêtée avec succès')
        await loadGenerationStatus()
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la génération:', error)
      setMessage('❌ Erreur lors de l\'arrêt de la génération')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const generateOneTimeData = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/v1/security/generate-dev-data`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('✅ Données de test générées avec succès')
      }
    } catch (error) {
      console.error('Erreur lors de la génération des données:', error)
      setMessage('❌ Erreur lors de la génération des données')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  if (loading && !generationStatus) {
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
            ⚙️ Générateur de Données de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuration et gestion de la génération automatique de données de sécurité réalistes
          </p>
        </div>

        {/* Message de statut */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm ${
              message.includes('✅')
                ? 'text-green-800 dark:text-green-400'
                : 'text-red-800 dark:text-red-400'
            }`}>
              {message}
            </p>
          </div>
        )}

        {/* État actuel de la génération */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            📊 État de la Génération Continue
          </h3>

          {generationStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                    generationStatus.isGenerating
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {generationStatus.isGenerating ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Interval: {generationStatus.intervalMinutes} minutes
                </div>
              </div>

              {generationStatus.isGenerating && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  🔄 Génération automatique de données de sécurité en cours...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Impossible de récupérer l'état de la génération</p>
            </div>
          )}
        </div>

        {/* Configuration de la génération continue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            ⚙️ Configuration de la Génération Continue
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interval entre les générations (minutes)
              </label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={generationStatus?.isGenerating}
              >
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Plus l'interval est court, plus il y aura d'événements générés
              </p>
            </div>

            <div className="flex gap-4">
              {!generationStatus?.isGenerating ? (
                <button
                  onClick={startGeneration}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Démarrer la génération continue
                </button>
              ) : (
                <button
                  onClick={stopGeneration}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Arrêter la génération continue
                </button>
              )}

              <button
                onClick={generateOneTimeData}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Générer des données maintenant
              </button>
            </div>
          </div>
        </div>

        {/* Informations sur la génération */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            ℹ️ Informations sur la Génération
          </h3>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">📋 Types d'événements générés:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Connexions réussies et échouées</li>
                <li>Tentatives d'intrusion (SQL Injection, XSS, Brute Force)</li>
                <li>Attaques DDoS simulées</li>
                <li>Activité suspecte et patterns inhabituels</li>
                <li>Alertes de sécurité automatiques</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🌍 Localisation géographique:</h4>
              <p>Les IPs sont automatiquement géolocalisées avec des pays réalistes (US, CN, RU, FR, etc.)</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">⚠️ Système d'alertes:</h4>
              <p>Les événements à haut risque génèrent automatiquement des alertes de sécurité et des tentatives d'intrusion</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🔄 Données en temps réel:</h4>
              <p>Les données sont générées avec des timestamps réalistes et des scores de risque appropriés</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Note de développement</h4>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Ce générateur est destiné uniquement à des fins de développement et de test.
                  En production, les données de sécurité proviennent des vraies requêtes et analyses du système.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton d'actualisation du statut */}
        <div className="flex justify-center mt-6">
          <button
            onClick={loadGenerationStatus}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser le statut
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

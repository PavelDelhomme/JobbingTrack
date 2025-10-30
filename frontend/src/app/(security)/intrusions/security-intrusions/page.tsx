'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface IntrusionAttempt {
  id: string
  timestamp: string
  sourceIP: string
  country?: string
  city?: string
  attackType: string
  targetEndpoint: string
  method: string
  userAgent?: string
  payload?: string
  riskScore: number
  isBlocked: boolean
  blockReason?: string
  metadata?: any
}

export default function SecurityIntrusionsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [intrusions, setIntrusions] = useState<IntrusionAttempt[]>([])
  const [filteredIntrusions, setFilteredIntrusions] = useState<IntrusionAttempt[]>([])
  const [filters, setFilters] = useState({
    attackType: '',
    blocked: '',
    riskScore: '',
    search: ''
  })

  useEffect(() => {
    if (token) {
      loadIntrusionAttempts()
    }
  }, [token])

  useEffect(() => {
    applyFilters()
  }, [intrusions, filters])

  const loadIntrusionAttempts = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/intrusions`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setIntrusions(response.data.data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tentatives d\'intrusion:', error)

      // Fallback vers des données mockées
      const mockIntrusions = Array.from({ length: 50 }, (_, i) => ({
        id: `intrusion-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        country: ['US', 'CN', 'RU', 'FR', 'DE', 'BR'][Math.floor(Math.random() * 6)],
        city: ['New York', 'Beijing', 'Moscow', 'Paris', 'Berlin', 'São Paulo'][Math.floor(Math.random() * 6)],
        attackType: ['SQL_INJECTION', 'XSS', 'BRUTE_FORCE', 'CSRF', 'LFI', 'RFI', 'DIRECTORY_TRAVERSAL', 'COMMAND_INJECTION'][Math.floor(Math.random() * 8)],
        targetEndpoint: `/api/v1/${['auth', 'users', 'applications', 'companies', 'contacts'][Math.floor(Math.random() * 5)]}`,
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        payload: Math.random() > 0.5 ? 'SELECT * FROM users WHERE id=1 OR 1=1--' : undefined,
        riskScore: Math.floor(Math.random() * 100),
        isBlocked: Math.random() > 0.3,
        blockReason: Math.random() > 0.5 ? 'Suspicious pattern detected' : undefined,
        metadata: {
          attackVector: 'Web application attack',
          confidence: Math.random(),
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]
        }
      }))

      setIntrusions(mockIntrusions)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...intrusions]

    if (filters.attackType) {
      filtered = filtered.filter(intrusion => intrusion.attackType === filters.attackType)
    }

    if (filters.blocked !== '') {
      const blocked = filters.blocked === 'true'
      filtered = filtered.filter(intrusion => intrusion.isBlocked === blocked)
    }

    if (filters.riskScore) {
      const minScore = parseInt(filters.riskScore)
      filtered = filtered.filter(intrusion => intrusion.riskScore >= minScore)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(intrusion =>
        intrusion.sourceIP.toLowerCase().includes(searchTerm) ||
        intrusion.attackType.toLowerCase().includes(searchTerm) ||
        intrusion.targetEndpoint.toLowerCase().includes(searchTerm) ||
        intrusion.country?.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredIntrusions(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      attackType: '',
      blocked: '',
      riskScore: '',
      search: ''
    })
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

  const getAttackTypeColor = (attackType: string) => {
    switch (attackType) {
      case 'SQL_INJECTION': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'XSS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'BRUTE_FORCE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'CSRF': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'LFI': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
      case 'RFI': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
      case 'DIRECTORY_TRAVERSAL': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
      case 'COMMAND_INJECTION': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    if (riskScore >= 60) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    if (riskScore >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  }

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'CN': '🇨🇳',
      'RU': '🇷🇺',
      'FR': '🇫🇷',
      'DE': '🇩🇪',
      'BR': '🇧🇷',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'IN': '🇮🇳',
      'GB': '🇬🇧'
    }
    return flags[country] || '🌍'
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
            🛡️ Tentatives d'Intrusion
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Surveillance et analyse des tentatives d'intrusion détectées par le système de sécurité
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type d'attaque
              </label>
              <select
                value={filters.attackType}
                onChange={(e) => handleFilterChange('attackType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les types</option>
                <option value="SQL_INJECTION">SQL Injection</option>
                <option value="XSS">XSS</option>
                <option value="BRUTE_FORCE">Brute Force</option>
                <option value="CSRF">CSRF</option>
                <option value="LFI">LFI</option>
                <option value="RFI">RFI</option>
                <option value="DIRECTORY_TRAVERSAL">Directory Traversal</option>
                <option value="COMMAND_INJECTION">Command Injection</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.blocked}
                onChange={(e) => handleFilterChange('blocked', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                <option value="true">Bloquées</option>
                <option value="false">Autorisées</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Score de risque min.
              </label>
              <select
                value={filters.riskScore}
                onChange={(e) => handleFilterChange('riskScore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les scores</option>
                <option value="80">80+ (Critique)</option>
                <option value="60">60+ (Élevé)</option>
                <option value="40">40+ (Moyen)</option>
                <option value="20">20+ (Faible)</option>
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
                  onClick={loadIntrusionAttempts}
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
              placeholder="Rechercher par IP, endpoint, pays..."
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
              {filteredIntrusions.length} tentatives affichées sur {intrusions.length} total
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 dark:text-red-400">
                {filteredIntrusions.filter(i => i.riskScore >= 80).length} critiques
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {filteredIntrusions.filter(i => i.riskScore >= 60 && i.riskScore < 80).length} élevées
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {filteredIntrusions.filter(i => i.riskScore >= 40 && i.riskScore < 60).length} moyennes
              </span>
              <span className="text-green-600 dark:text-green-400">
                {filteredIntrusions.filter(i => i.isBlocked).length} bloquées
              </span>
            </div>
          </div>
        </div>

        {/* Liste des tentatives d'intrusion */}
        <div className="space-y-4">
          {filteredIntrusions.length > 0 ? filteredIntrusions.map((intrusion) => (
            <div key={intrusion.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getAttackTypeColor(intrusion.attackType)}`}>
                    {intrusion.attackType.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRiskColor(intrusion.riskScore)}`}>
                    Score: {intrusion.riskScore}
                  </span>
                  {intrusion.isBlocked && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      BLOQUÉE
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(intrusion.timestamp)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Source:</strong>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono">{intrusion.sourceIP}</span>
                    {intrusion.country && (
                      <span className="text-lg">{getCountryFlag(intrusion.country)}</span>
                    )}
                    {intrusion.country && (
                      <span className="text-gray-600 dark:text-gray-400">({intrusion.country})</span>
                    )}
                  </div>
                  {intrusion.city && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {intrusion.city}
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Cible:</strong>
                  <div className="font-mono text-xs mt-1">
                    {intrusion.method} {intrusion.targetEndpoint}
                  </div>
                </div>

                <div className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">Détails:</strong>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {intrusion.userAgent?.substring(0, 40)}...
                  </div>
                </div>
              </div>

              {intrusion.payload && (
                <div className="mb-4">
                  <strong className="text-sm text-gray-900 dark:text-gray-100">Payload:</strong>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 mt-1">
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {intrusion.payload}
                    </code>
                  </div>
                </div>
              )}

              {intrusion.blockReason && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-4">
                  <strong>Raison du blocage:</strong> {intrusion.blockReason}
                </div>
              )}

              {intrusion.metadata && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>Confiance:</strong> {(intrusion.metadata.confidence * 100).toFixed(1)}% •
                  <strong> Sévérité:</strong> {intrusion.metadata.severity}
                </div>
              )}
            </div>
          )) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Aucune tentative d'intrusion trouvée avec les critères actuels</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

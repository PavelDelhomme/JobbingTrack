'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { FRONTEND_URLS } from '@/config/ports.config'
import axios from 'axios'

interface APITest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  url: string
  body?: string
  headers?: Record<string, string>
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  token?: string
}

interface HistoryItem {
  id: string
  method: string
  url: string
  timestamp: string
  status?: number
  responseTime?: number
  requestBody?: string
  responseBody?: string
  headers?: Record<string, string>
}

interface EnvironmentVariable {
  key: string
  value: string
  enabled: boolean
}

interface TestScript {
  id: string
  name: string
  type: 'pre-request' | 'test'
  script: string
  enabled: boolean
}

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: string
  secure?: boolean
  httpOnly?: boolean
}

interface Collection {
  id: string
  name: string
  description?: string
  requests: CollectionRequest[]
  variables?: EnvironmentVariable[]
}

interface CollectionRequest {
  id: string
  name: string
  method: string
  url: string
  body?: string
  headers?: Record<string, string>
  tests?: TestScript[]
}

const API_URL = FRONTEND_URLS.api

export default function APITesterPage() {
  const [service, setService] = useState('applications')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'>('GET')
  const [endpoint, setEndpoint] = useState('')
  const [requestBody, setRequestBody] = useState('{}')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nouvelles fonctionnalités
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({})
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([
    { key: 'API_URL', value: API_URL, enabled: true },
    { key: 'USER_ID', value: '', enabled: false },
    { key: 'BASE_URL', value: `${API_URL}/api/v1`, enabled: true },
    { key: 'CURRENT_TIMESTAMP', value: Date.now().toString(), enabled: false },
    { key: 'RANDOM_ID', value: Math.random().toString(36).substr(2, 9), enabled: false }
  ])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeTab, setActiveTab] = useState<'request' | 'history' | 'collections' | 'environment' | 'cookies' | 'tests'>('request')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [authMethod, setAuthMethod] = useState<'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2'>('bearer')

  // Configuration OAuth2
  const [oauth2Config, setOauth2Config] = useState({
    clientId: '',
    clientSecret: '',
    authUrl: '',
    tokenUrl: '',
    scope: '',
    accessToken: '',
    refreshToken: ''
  })

  // Nouvelles fonctionnalités avancées
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [testScripts, setTestScripts] = useState<TestScript[]>([
    { id: '1', name: 'Status Code Test', type: 'test', script: 'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});', enabled: true },
    { id: '2', name: 'Response Time Test', type: 'test', script: 'pm.test("Response time is less than 500ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(500);\n});', enabled: true }
  ])
  const [preRequestScript, setPreRequestScript] = useState('')
  const [responseFormat, setResponseFormat] = useState<'json' | 'xml' | 'html' | 'text'>('json')
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<string>('')
  const [environments, setEnvironments] = useState<{[key: string]: EnvironmentVariable[]}>({
    'development': [
      { key: 'API_URL', value: API_URL, enabled: true },
      { key: 'BASE_URL', value: `${API_URL}/api/v1`, enabled: true },
    ],
    'production': [
      { key: 'API_URL', value: 'https://api.yourapp.com', enabled: true },
      { key: 'BASE_URL', value: 'https://api.yourapp.com/api/v1', enabled: true },
    ]
  })
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('development')
  const [historySearch, setHistorySearch] = useState<string>('')
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])

  // Charger les utilisateurs au montage
  useEffect(() => {
    loadUsers()
    loadHistory()
  }, [])

  // Filtrer l'historique en fonction de la recherche
  useEffect(() => {
    if (historySearch.trim() === '') {
      setFilteredHistory(history)
    } else {
      const filtered = history.filter(item =>
        item.method.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.url.toLowerCase().includes(historySearch.toLowerCase()) ||
        (item.status && item.status.toString().includes(historySearch))
      )
      setFilteredHistory(filtered)
    }
  }, [history, historySearch])

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.data.success) {
        // Enrichir les utilisateurs avec leurs tokens si disponibles
        const enrichedUsers = (response.data.users || []).map((user: User) => ({
          ...user,
          token: localStorage.getItem(`token_${user.id}`) || undefined // Stocker les tokens séparément si nécessaire
        }))
        setUsers(enrichedUsers)
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
    }
  }

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('apiTesterHistory')
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error)
    }
  }

  const saveHistory = (item: HistoryItem) => {
    try {
      const newHistory = [item, ...history.slice(0, 49)] // Garder les 50 derniers
      setHistory(newHistory)
      localStorage.setItem('apiTesterHistory', JSON.stringify(newHistory))
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error)
    }
  }

  const executePreRequestScript = async () => {
    try {
      // Créer un contexte d'exécution pour le script pré-requête
      const context = {
        pm: {
          environment: {
            set: (key: string, value: string) => {
              setEnvironmentVariables(prev =>
                prev.map(env => env.key === key ? { ...env, value } : env)
              )
            },
            get: (key: string) => {
              const envVar = environmentVariables.find(env => env.key === key && env.enabled)
              return envVar?.value || ''
            }
          },
          variables: {
            set: (key: string, value: string) => {
              setEnvironmentVariables(prev => [
                ...prev.filter(env => env.key !== key),
                { key, value, enabled: true }
              ])
            },
            get: (key: string) => {
              const envVar = environmentVariables.find(env => env.key === key && env.enabled)
              return envVar?.value || ''
            }
          }
        }
      }

      // Exécuter le script dans un contexte sécurisé
      const scriptFunction = new Function('pm', preRequestScript)
      scriptFunction(context.pm)
    } catch (error) {
      console.error('Erreur exécution script pré-requête:', error)
    }
  }

  const executeTestScripts = async (response: any) => {
    try {
      const context = {
        pm: {
          test: (name: string, fn: () => void) => {
            try {
              fn()
              console.log(`✅ Test passed: ${name}`)
            } catch (error) {
              console.error(`❌ Test failed: ${name}`, error)
            }
          },
          expect: (actual: any) => ({
            to: {
              be: {
                below: (expected: number) => {
                  if (actual >= expected) throw new Error(`Expected ${actual} to be below ${expected}`)
                },
                above: (expected: number) => {
                  if (actual <= expected) throw new Error(`Expected ${actual} to be above ${expected}`)
                }
              },
              toBe: (expected: any) => {
                if (actual !== expected) throw new Error(`Expected ${actual} to be ${expected}`)
              },
              toHave: {
                status: (expected: number) => {
                  if (response.status !== expected) throw new Error(`Expected status ${response.status} to be ${expected}`)
                }
              }
            }
          }),
          response: {
            status: response.status,
            responseTime: response.responseTime,
            to: {
              have: {
                status: (expected: number) => {
                  if (response.status !== expected) throw new Error(`Expected status ${response.status} to be ${expected}`)
                }
              }
            }
          }
        }
      }

      // Exécuter chaque script de test activé
      for (const script of testScripts.filter(s => s.enabled && s.type === 'test')) {
        try {
          const scriptFunction = new Function('pm', script.script)
          scriptFunction(context.pm)
        } catch (error) {
          console.error(`Erreur exécution test "${script.name}":`, error)
        }
      }
    } catch (error) {
      console.error('Erreur exécution tests:', error)
    }
  }

  const manageCookies = (response: any) => {
    // Extraire et gérer les cookies de la réponse
    const setCookieHeaders = response.headers?.['set-cookie']
    if (setCookieHeaders) {
      setCookieHeaders.forEach((cookieStr: string) => {
        const cookie = parseCookie(cookieStr)
        if (cookie) {
          setCookies((prev: any) => {
            const existingIndex = prev.findIndex((c: any) => c.name === cookie.name && c.domain === cookie.domain)
            if (existingIndex >= 0) {
              const updated = [...prev]
              updated[existingIndex] = cookie
              return updated
            }
            return [...prev, cookie]
          })
        }
      })
    }
  }

  const parseCookie = (cookieStr: string): Cookie | null => {
    try {
      const parts = cookieStr.split(';').map(p => p.trim())
      const [name, value] = parts[0].split('=')
      const cookie: Cookie = {
        name,
        value,
        domain: 'localhost',
        path: '/',
        secure: false,
        httpOnly: false
      }

      parts.slice(1).forEach(part => {
        const [key, val] = part.split('=')
        switch (key.toLowerCase()) {
          case 'domain':
            cookie.domain = val
            break
          case 'path':
            cookie.path = val
            break
          case 'expires':
            cookie.expires = val
            break
          case 'secure':
            cookie.secure = true
            break
          case 'httponly':
            cookie.httpOnly = true
            break
        }
      })

      return cookie
    } catch (error) {
      console.error('Erreur parsing cookie:', error)
      return null
    }
  }

  const services = [
    { value: 'auth', label: 'Auth Service', port: 3001 },
    { value: 'applications', label: 'Applications', port: 3002 },
    { value: 'companies', label: 'Companies', port: 3003 },
    { value: 'contacts', label: 'Contacts', port: 3004 },
    { value: 'interviews', label: 'Interviews', port: 3005 },
    { value: 'notifications', label: 'Notifications', port: 3006 },
    { value: 'dashboard', label: 'Dashboard', port: 3007 },
    { value: 'calls', label: 'Calls', port: 3008 },
    { value: 'profile', label: 'Profile', port: 3009 },
    { value: 'events', label: 'Events', port: 3011 },
    { value: 'followups', label: 'FollowUps', port: 3012 },
  ]

  const quickTests = {
    applications: [
      { name: 'Liste candidatures', method: 'GET', endpoint: '' },
      { name: 'Créer candidature', method: 'POST', endpoint: '', body: JSON.stringify({ position: 'Test', companyName: 'Test Company' }, null, 2) },
      { name: 'Health check', method: 'GET', endpoint: '/health' },
    ],
    auth: [
      { name: 'Tous les users', method: 'GET', endpoint: '/users' },
      { name: 'Mon profil', method: 'GET', endpoint: '/profile' },
      { name: 'Health check', method: 'GET', endpoint: '/health' },
    ],
    companies: [
      { name: 'Liste entreprises', method: 'GET', endpoint: '' },
      { name: 'Créer entreprise', method: 'POST', endpoint: '', body: JSON.stringify({ name: 'Test Company', industry: 'Technology' }, null, 2) },
      { name: 'Health check', method: 'GET', endpoint: '/health' },
    ],
  }

  const executeRequest = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      // Exécuter le script pré-requête
      if (preRequestScript.trim()) {
        await executePreRequestScript()
      }

      // Mettre à jour les variables dynamiques
      const updatedEnvVars = environmentVariables.map(env => {
        if (env.key === 'CURRENT_TIMESTAMP') {
          return { ...env, value: Date.now().toString() }
        }
        if (env.key === 'RANDOM_ID') {
          return { ...env, value: Math.random().toString(36).substr(2, 9) }
        }
        return env
      })
      setEnvironmentVariables(updatedEnvVars)

      // Remplacer les variables d'environnement dans l'URL et le corps
      let processedUrl = endpoint
      let processedBody = requestBody

      updatedEnvVars.filter(env => env.enabled).forEach(env => {
        const regex = new RegExp(`{{${env.key}}}`, 'g')
        processedUrl = processedUrl.replace(regex, env.value)
        processedBody = processedBody.replace(regex, env.value)
      })

      const url = `${API_URL}/api/v1/${service}${processedUrl}`

    // Construire les headers d'authentification
    const authHeaders: Record<string, string> = {}

    if (authMethod === 'bearer') {
      // Utiliser le token de l'utilisateur sélectionné ou le token actuel
      const selectedUserData = users.find(u => u.id === selectedUser)
      const tokenToUse = selectedUser && selectedUserData ? selectedUserData.token || localStorage.getItem('token') : localStorage.getItem('token')
      if (tokenToUse) {
        authHeaders['Authorization'] = `Bearer ${tokenToUse}`
      }
    } else if (authMethod === 'basic') {
      const basicAuth = btoa('user:password') // À remplacer par de vraies credentials
      authHeaders['Authorization'] = `Basic ${basicAuth}`
    } else if (authMethod === 'apikey') {
      authHeaders['X-API-Key'] = 'your-api-key' // À remplacer par une vraie clé
    } else if (authMethod === 'oauth2') {
      if (oauth2Config.accessToken) {
        authHeaders['Authorization'] = `Bearer ${oauth2Config.accessToken}`
      }
    }

    // Fusionner avec les headers personnalisés
    const allHeaders = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...customHeaders
    }
    
    try {
      const config = {
        method,
        url,
        headers: allHeaders,
        data: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.parse(processedBody) : undefined,
        timeout: 15000
      }

      const startTime = Date.now()
      const result = await axios(config)
      const responseTime = Date.now() - startTime

      const responseData = {
        status: result.status,
        statusText: result.statusText,
        data: result.data,
        responseTime,
        headers: result.headers,
        size: JSON.stringify(result.data).length
      }

      setResponse(responseData)

      // Exécuter les tests automatisés
      await executeTestScripts(responseData)

      // Gérer les cookies
      manageCookies(result)

      // Sauvegarder dans l'historique avec plus de détails
      saveHistory({
        id: Date.now().toString(),
        method,
        url,
        timestamp: new Date().toISOString(),
        status: result.status,
        responseTime,
        requestBody: processedBody,
        responseBody: JSON.stringify(result.data),
        headers: allHeaders
      })
    

    } catch (err: any) {
      const responseData = {
        status: err.response?.status,
        statusText: err.response?.statusText,
        error: err.message,
        data: err.response?.data,
        responseTime: Date.now() - Date.now()
      }

      setError(err.response?.data || err.message)
      setResponse(responseData)

      // Sauvegarder l'erreur dans l'historique
      saveHistory({
        id: Date.now().toString(),
        method,
        url,
        timestamp: new Date().toISOString(),
        status: err.response?.status,
        responseTime: Date.now() - Date.now()
      })
    }

    } finally {
      setLoading(false)
    }
  }

  const loadQuickTest = (test: any) => {
    setMethod(test.method as any);
    setEndpoint(test.endpoint);
    if (test.body) {
      setRequestBody(test.body);
    }
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🧪 Testeur d'API Avancé
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Testez les endpoints avec authentification, variables d'environnement et collections
          </p>
        </div>

        {/* Onglets principaux */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'request', label: '📡 Requête', icon: 'Send' },
                { id: 'history', label: '📋 Historique', icon: 'History' },
                { id: 'collections', label: '📁 Collections', icon: 'Folder' },
                { id: 'environment', label: '⚙️ Environnements', icon: 'Settings' },
                { id: 'cookies', label: '🍪 Cookies', icon: 'Cookie' },
                { id: 'tests', label: '🧪 Tests', icon: 'TestTube' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Onglets de contenu */}
        {activeTab === 'request' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Request Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Configuration */}
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Configuration de la requête
                </h3>

                {/* Service Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {services.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label} (Port {s.port})
                      </option>
                    ))}
                  </select>
                </div>

              {/* Method & Endpoint */}
              <div className="mb-4 flex space-x-4">
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Méthode
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="/api/v1/applications"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authentification
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="bearer"
                      checked={authMethod === 'bearer'}
                      onChange={(e) => setAuthMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    Bearer Token
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="basic"
                      checked={authMethod === 'basic'}
                      onChange={(e) => setAuthMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    Basic Auth
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="apikey"
                      checked={authMethod === 'apikey'}
                      onChange={(e) => setAuthMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    API Key
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="none"
                      checked={authMethod === 'none'}
                      onChange={(e) => setAuthMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    Aucune
                  </label>
                </div>

                {authMethod === 'bearer' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Utilisateur pour le token
                      </label>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Token actuel (admin)</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedUser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Token personnalisé (optionnel)
                        </label>
                        <textarea
                          value={users.find(u => u.id === selectedUser)?.token || ''}
                          onChange={(e) => {
                            const updatedUsers = users.map(u =>
                              u.id === selectedUser ? { ...u, token: e.target.value } : u
                            )
                            setUsers(updatedUsers)
                            // Sauvegarder le token dans localStorage
                            if (e.target.value) {
                              localStorage.setItem(`token_${selectedUser}`, e.target.value)
                            } else {
                              localStorage.removeItem(`token_${selectedUser}`)
                            }
                          }}
                          placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Laissez vide pour utiliser le token par défaut ou collez un token personnalisé
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* URL Preview */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL complète:</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {method} {API_URL}/api/v1/{service}{(() => {
                    let processedUrl = endpoint
                    environmentVariables.filter(env => env.enabled).forEach(env => {
                      const regex = new RegExp(`{{${env.key}}}`, 'g')
                      processedUrl = processedUrl.replace(regex, env.value)
                    })
                    return processedUrl
                  })()}
                </p>
              </div>

              {/* Headers personnalisés */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Headers personnalisés
                  </label>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {showAdvanced ? 'Masquer' : 'Afficher'} avancées
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-2">
                    {Object.entries(customHeaders).map(([key, value], index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Header name"
                          value={key}
                          onChange={(e) => {
                            const newHeaders = {...customHeaders}
                            if (e.target.value) {
                              newHeaders[e.target.value] = newHeaders[key] || value
                              delete newHeaders[key]
                            }
                            setCustomHeaders(newHeaders)
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={value}
                          onChange={(e) => {
                            const newHeaders = {...customHeaders}
                            newHeaders[key] = e.target.value
                            setCustomHeaders(newHeaders)
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded"
                        />
                        <button
                          onClick={() => {
                            const newHeaders = {...customHeaders}
                            delete newHeaders[key]
                            setCustomHeaders(newHeaders)
                          }}
                          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newHeaders = {...customHeaders}
                        newHeaders[`header-${Object.keys(customHeaders).length}`] = ''
                        setCustomHeaders(newHeaders)
                      }}
                      className="w-full px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      + Ajouter header
                    </button>
                  </div>
                )}
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Corps de la requête (JSON)
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ Exécution...' : '🚀 Exécuter la requête'}
              </button>
            </div>

            {/* Response */}
            {response && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Réponse
                </h3>

                {/* Status et contrôles */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded font-mono text-sm font-medium ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : response.status >= 400
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {response.status} {response.statusText}
                    </div>
                    {response.responseTime && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ⚡ {response.responseTime}ms
                      </div>
                    )}
                  </div>

                  {/* Sélecteur de format de réponse */}
                  <select
                    value={responseFormat}
                    onChange={(e) => setResponseFormat(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="html">HTML</option>
                    <option value="text">Text</option>
                  </select>
                </div>

                {/* Response Data */}
                <div className="bg-gray-950 dark:bg-black rounded-lg p-4 overflow-x-auto border border-gray-800">
                  {responseFormat === 'json' && (
                    <pre className="text-sm text-green-400 dark:text-green-300 font-mono">
                      {JSON.stringify(response.data || response.error, null, 2)}
                    </pre>
                  )}
                  {responseFormat === 'xml' && (
                    <pre className="text-sm text-blue-400 dark:text-blue-300 font-mono">
                      {typeof (response.data || response.error) === 'string'
                        ? (response.data || response.error)
                        : JSON.stringify(response.data || response.error, null, 2)}
                    </pre>
                  )}
                  {responseFormat === 'html' && (
                    <div className="text-sm text-orange-400 dark:text-orange-300 font-mono">
                      {typeof (response.data || response.error) === 'string'
                        ? (response.data || response.error)
                        : '<pre>' + JSON.stringify(response.data || response.error, null, 2) + '</pre>'}
                    </div>
                  )}
                  {responseFormat === 'text' && (
                    <pre className="text-sm text-gray-300 dark:text-gray-400 font-mono">
                      {typeof (response.data || response.error) === 'string'
                        ? (response.data || response.error)
                        : JSON.stringify(response.data || response.error, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">❌ Erreur:</p>
                <pre className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right Panel - Quick Tests */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ⚡ Tests rapides
              </h3>
              <div className="space-y-2">
                {(quickTests[service as keyof typeof quickTests] || []).map((test, index) => (
                  <button
                    key={index}
                    onClick={() => loadQuickTest(test)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">{test.method}</span>
                    <span className="text-gray-600 dark:text-gray-400"> {test.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Common Headers */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Headers automatiques
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Content-Type:</span>
                  <span className="text-gray-900 dark:text-gray-100"> application/json</span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Authorization:</span>
                  <span className="text-gray-900 dark:text-gray-100"> Bearer {"<token>"}</span>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                💡 Exemples
              </h3>
              <div className="space-y-3 text-xs">
                <ExampleItem
                  title="Lister les candidatures"
                  code="GET /api/v1/applications"
                />
                <ExampleItem
                  title="Créer une entreprise"
                  code='POST /api/v1/companies
{"name": "Google", "industry": "Tech"}'
                />
                <ExampleItem
                  title="Mettre à jour utilisateur"
                  code='PUT /api/v1/auth/users/{id}/role
{"role": "ADMIN"}'
                />
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  📋 Historique des requêtes
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Rechercher (méthode, URL, statut)..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm flex-1 sm:w-64"
                  />
                  <button
                    onClick={() => {
                      setHistory([])
                      localStorage.removeItem('apiTesterHistory')
                    }}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    🗑️ Effacer
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {historySearch ? 'Aucune requête trouvée' : 'Aucune requête dans l\'historique'}
                  </p>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => {
                        setMethod(item.method as any)
                        setService(item.url.split('/api/v1/')[1]?.split('/')[0] || 'applications')
                        setEndpoint(item.url.split('/api/v1/')[1]?.replace(/^[^/]+\//, '') || '')
                        setActiveTab('request')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          item.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          item.method === 'PUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          item.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {item.method}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {item.url.split('/api/v1/')[1] || item.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status >= 200 && item.status < 300
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : item.status >= 400
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {item.status}
                          </span>
                        )}
                        {item.responseTime && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.responseTime}ms
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Collections */}
        {activeTab === 'collections' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📁 Collections de requêtes
              </h3>
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📁</span>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Collections de requêtes à venir
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Organisez vos requêtes API en collections pour une meilleure gestion
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Environnements */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            {/* Sélecteur d'environnement */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                🌍 Gestion des environnements
              </h3>
              <div className="flex gap-4 items-center mb-6">
                <select
                  value={currentEnvironment}
                  onChange={(e) => {
                    setCurrentEnvironment(e.target.value)
                    setEnvironmentVariables(environments[e.target.value] || [])
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.keys(environments).map(env => (
                    <option key={env} value={env}>
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const newEnvName = prompt('Nom du nouvel environnement:')
                    if (newEnvName) {
                      setEnvironments(prev => ({
                        ...prev,
                        [newEnvName]: [
                          { key: 'API_URL', value: API_URL, enabled: true },
                          { key: 'BASE_URL', value: `${API_URL}/api/v1`, enabled: true }
                        ]
                      }))
                      setCurrentEnvironment(newEnvName)
                      setEnvironmentVariables(environments[newEnvName])
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  ➕ Nouvel environnement
                </button>
              </div>

              {/* Variables de l'environnement actuel */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Variables - {currentEnvironment.charAt(0).toUpperCase() + currentEnvironment.slice(1)}
                </h4>
                {environmentVariables.map((env, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={env.enabled}
                      onChange={(e) => {
                        const newEnv = [...environmentVariables]
                        newEnv[index] = {...env, enabled: e.target.checked}
                        setEnvironmentVariables(newEnv)
                        // Mettre à jour l'environnement global
                        setEnvironments(prev => ({
                          ...prev,
                          [currentEnvironment]: newEnv
                        }))
                      }}
                      className="rounded"
                    />
                    <input
                      type="text"
                      value={env.key}
                      onChange={(e) => {
                        const newEnv = [...environmentVariables]
                        newEnv[index] = {...env, key: e.target.value}
                        setEnvironmentVariables(newEnv)
                        setEnvironments(prev => ({
                          ...prev,
                          [currentEnvironment]: newEnv
                        }))
                      }}
                      placeholder="Nom de variable"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                    />
                    <input
                      type="text"
                      value={env.value}
                      onChange={(e) => {
                        const newEnv = [...environmentVariables]
                        newEnv[index] = {...env, value: e.target.value}
                        setEnvironmentVariables(newEnv)
                        setEnvironments(prev => ({
                          ...prev,
                          [currentEnvironment]: newEnv
                        }))
                      }}
                      placeholder="Valeur"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                    />
                    <button
                      onClick={() => {
                        const newEnv = environmentVariables.filter((_, i) => i !== index)
                        setEnvironmentVariables(newEnv)
                        setEnvironments(prev => ({
                          ...prev,
                          [currentEnvironment]: newEnv
                        }))
                      }}
                      className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newEnv = [...environmentVariables, {
                      key: '',
                      value: '',
                      enabled: true
                    }]
                    setEnvironmentVariables(newEnv)
                    setEnvironments(prev => ({
                      ...prev,
                      [currentEnvironment]: newEnv
                    }))
                  }}
                  className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  + Ajouter variable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Cookies */}
        {activeTab === 'cookies' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                🍪 Gestion des cookies
              </h3>
              <div className="space-y-4">
                {cookies.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Aucun cookie enregistré
                  </p>
                ) : (
                  cookies.map((cookie, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Nom:</span>
                          <p className="text-gray-900 dark:text-gray-100">{cookie.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Valeur:</span>
                          <p className="text-gray-900 dark:text-gray-100 truncate" title={cookie.value}>{cookie.value}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Domaine:</span>
                          <p className="text-gray-900 dark:text-gray-100">{cookie.domain}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Chemin:</span>
                          <p className="text-gray-900 dark:text-gray-100">{cookie.path}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            const updatedCookies = cookies.filter((_, i) => i !== index)
                            setCookies(updatedCookies)
                          }}
                          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Tests */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Script pré-requête */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ⚡ Script pré-requête
              </h3>
              <textarea
                value={preRequestScript}
                onChange={(e) => setPreRequestScript(e.target.value)}
                placeholder="console.log('Script exécuté avant la requête');"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Utilisez <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pm.environment.set()</code> et <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pm.variables.set()</code>
              </p>
            </div>

            {/* Tests automatisés */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                🧪 Tests automatisés
              </h3>
              <div className="space-y-4">
                {testScripts.map((script, index) => (
                  <div key={script.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={script.enabled}
                          onChange={(e) => {
                            const updated = [...testScripts]
                            updated[index] = {...script, enabled: e.target.checked}
                            setTestScripts(updated)
                          }}
                          className="rounded"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{script.name}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          script.type === 'test' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {script.type === 'test' ? 'Test' : 'Pré-requête'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = testScripts.filter((_, i) => i !== index)
                          setTestScripts(updated)
                        }}
                        className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={script.script}
                      onChange={(e) => {
                        const updated = [...testScripts]
                        updated[index] = {...script, script: e.target.value}
                        setTestScripts(updated)
                      }}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    setTestScripts([...testScripts, {
                      id: Date.now().toString(),
                      name: `Nouveau test ${testScripts.length + 1}`,
                      type: 'test',
                      script: 'pm.test("Test name", function () {\n    // Votre test ici\n});',
                      enabled: true
                    }])
                  }}
                  className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  + Ajouter un test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function ExampleItem({ title, code }: { title: string, code: string }) {
  return (
    <div>
      <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">{title}</p>
      <pre className="p-2 bg-gray-950 dark:bg-black text-green-400 dark:text-green-300 rounded font-mono text-xs overflow-x-auto border border-gray-800">
        {code}
      </pre>
    </div>
  )
}

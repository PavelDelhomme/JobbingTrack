'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import axios from 'axios'

interface APITest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  body?: string
  headers?: Record<string, string>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function APITesterPage() {
  const [service, setService] = useState('applications')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [endpoint, setEndpoint] = useState('')
  const [requestBody, setRequestBody] = useState('{}')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const url = `${API_URL}/api/v1/${service}${endpoint}`
    const token = localStorage.getItem('token')

    try {
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.parse(requestBody) : undefined,
        timeout: 10000
      }

      const startTime = Date.now()
      const result = await axios(config)
      const responseTime = Date.now() - startTime

      setResponse({
        status: result.status,
        statusText: result.statusText,
        data: result.data,
        responseTime,
        headers: result.headers
      })
    } catch (err: any) {
      setError(err.response?.data || err.message)
      setResponse({
        status: err.response?.status,
        statusText: err.response?.statusText,
        error: err.message,
        data: err.response?.data
      })
    } finally {
      setLoading(false)
    }
  }

  const loadQuickTest = (test: any) => {
    setMethod(test.method as any)
    setEndpoint(test.endpoint)
    if (test.body) {
      setRequestBody(test.body)
    }
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🧪 Testeur d'API
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Testez directement les endpoints des microservices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Request Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuration de la requête
              </h3>

              {/* Service Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Méthode
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="/api/v1/service/endpoint"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* URL Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">URL complète:</p>
                <p className="text-sm font-mono text-gray-900">
                  {method} {API_URL}/api/v1/{service}{endpoint}
                </p>
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Corps de la requête (JSON)
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Exécution...' : '🚀 Exécuter la requête'}
              </button>
            </div>

            {/* Response */}
            {response && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Réponse
                </h3>

                {/* Status */}
                <div className="mb-4 flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded font-mono text-sm font-medium ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-green-100 text-green-800'
                      : response.status >= 400
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {response.status} {response.statusText}
                  </div>
                  {response.responseTime && (
                    <div className="text-sm text-gray-600">
                      ⚡ {response.responseTime}ms
                    </div>
                  )}
                </div>

                {/* Response Data */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {JSON.stringify(response.data || response.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">❌ Erreur:</p>
                <pre className="mt-2 text-sm text-red-700">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right Panel - Quick Tests */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚡ Tests rapides
              </h3>
              <div className="space-y-2">
                {(quickTests[service as keyof typeof quickTests] || []).map((test, index) => (
                  <button
                    key={index}
                    onClick={() => loadQuickTest(test)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="font-medium">{test.method}</span> {test.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Headers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Headers automatiques
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-gray-50 rounded font-mono">
                  <span className="text-gray-600">Content-Type:</span>
                  <span className="text-gray-900"> application/json</span>
                </div>
                <div className="p-2 bg-gray-50 rounded font-mono">
                  <span className="text-gray-600">Authorization:</span>
                  <span className="text-gray-900"> Bearer {"<token>"}</span>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
      </div>
    </AdminLayout>
  )
}

function ExampleItem({ title, code }: { title: string, code: string }) {
  return (
    <div>
      <p className="text-gray-700 font-medium mb-1">{title}</p>
      <pre className="p-2 bg-gray-900 text-green-400 rounded font-mono text-xs overflow-x-auto">
        {code}
      </pre>
    </div>
  )
}



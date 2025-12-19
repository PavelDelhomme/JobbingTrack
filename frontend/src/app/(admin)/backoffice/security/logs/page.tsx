'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AdminLayout } from '@/components/features'
import axios from 'axios'

interface SecurityLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  category: string
  message: string
  sourceIP?: string
  userAgent?: string
  endpoint?: string
  timestamp: string
  riskScore?: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // ✅ OPTIMISATION : useCallback pour éviter les re-créations de fonction
  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/security/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 } // Limiter à 100 logs par défaut
      })
      
      if (response.data.success) {
        // L'API retourne les logs dans response.data.data (array) ou response.data.data.data
        const logsData = response.data.data || response.data.logs || []
        setLogs(Array.isArray(logsData) ? logsData : [])
      }
    } catch (error: any) {
      console.error('Error loading security logs:', error)
      // En cas d'erreur, afficher un message mais ne pas bloquer
      if (error.response?.status !== 404) {
        console.warn('Security logs service unavailable:', error.message)
      }
    } finally {
      setLoading(false)
    }
  }, []);

  useEffect(() => {
    fetchLogs()
    // Rafraîchir toutes les 5 secondes pour un affichage en temps réel
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  // ✅ OPTIMISATION : useMemo pour filteredLogs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterLevel !== 'all' && log.level !== filterLevel) return false
      if (filterCategory !== 'all' && log.category !== filterCategory) return false
      return true
    })
  }, [logs, filterLevel, filterCategory])

  const levelColors = {
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    error: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    critical: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              📋 Security Logs
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Monitor security events in real time (auto-refresh every 5 seconds)
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="all">All levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="all">All categories</option>
              <option value="intrusion">Intrusion</option>
              <option value="injection">Injection</option>
              <option value="ddos">DDoS</option>
              <option value="authentication">Authentication</option>
            </select>
          </div>
        </div>

        {/* Liste des logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Source IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${levelColors[log.level]}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {log.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.sourceIP || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No security logs found
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}


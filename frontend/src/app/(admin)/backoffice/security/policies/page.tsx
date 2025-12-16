'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import axios from 'axios'

interface SecurityPolicy {
  id: string
  name: string
  description: string
  enabled: boolean
  type: 'ip_blocking' | 'rate_limiting' | 'waf' | 'authentication'
  config: any
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function SecurityPoliciesPage() {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [blockedIPs, setBlockedIPs] = useState<string[]>([])
  const [newIP, setNewIP] = useState('')

  useEffect(() => {
    fetchPolicies()
    fetchBlockedIPs()
  }, [])

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/security/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setPolicies(response.data.policies || [])
      }
    } catch (error) {
      console.error('Erreur chargement politiques:', error)
      // Politiques par défaut
      setPolicies([
        {
          id: '1',
          name: 'Blocage IP',
          description: 'Bloquer les IPs suspectes',
          enabled: true,
          type: 'ip_blocking',
          config: {}
        },
        {
          id: '2',
          name: 'Rate Limiting',
          description: 'Limiter le nombre de requêtes par IP',
          enabled: true,
          type: 'rate_limiting',
          config: { maxRequests: 100, windowMinutes: 1 }
        },
        {
          id: '3',
          name: 'WAF',
          description: 'Web Application Firewall',
          enabled: true,
          type: 'waf',
          config: {}
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchBlockedIPs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/security/blocked-ips`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setBlockedIPs(response.data.ips || [])
      }
    } catch (error) {
      console.error('Erreur chargement IPs bloquées:', error)
    }
  }

  const handleBlockIP = async () => {
    if (!newIP) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/api/v1/security/block-ip`, 
        { ip: newIP },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewIP('')
      fetchBlockedIPs()
    } catch (error) {
      console.error('Erreur blocage IP:', error)
      alert('Erreur lors du blocage de l\'IP')
    }
  }

  const handleUnblockIP = async (ip: string) => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/v1/security/blocked-ips/${ip}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchBlockedIPs()
    } catch (error) {
      console.error('Erreur déblocage IP:', error)
      alert('Erreur lors du déblocage de l\'IP')
    }
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
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            ⚙️ Politiques de Sécurité
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configurez les politiques de sécurité de votre application
          </p>
        </div>

        {/* Politiques */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Politiques Actives
          </h2>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{policy.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{policy.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    onChange={() => {
                      setPolicies(policies.map(p => 
                        p.id === policy.id ? { ...p, enabled: !p.enabled } : p
                      ))
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Gestion IPs bloquées */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            IPs Bloquées
          </h2>
          
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="Adresse IP à bloquer (ex: 192.168.1.100)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleBlockIP}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Bloquer IP
            </button>
          </div>

          <div className="space-y-2">
            {blockedIPs.map((ip) => (
              <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100 font-mono">{ip}</span>
                <button
                  onClick={() => handleUnblockIP(ip)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  Débloquer
                </button>
              </div>
            ))}
            {blockedIPs.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune IP bloquée
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}


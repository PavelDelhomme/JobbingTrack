'use client'

import { useState, useEffect, useRef } from 'react'

interface ContainerMetrics {
  id: string
  name: string
  cpu: {
    percent: number
    cores: number
  }
  memory: {
    usage: number
    limit: number
    percent: number
  }
  network: {
    rxBytes: number
    txBytes: number
  }
  timestamp: string
}

interface SystemMetrics {
  cpu: {
    percent: number
    cores: number
    model: string
  }
  memory: {
    total: number
    used: number
    free: number
    percent: number
  }
  uptime: number
  platform: string
  hostname: string
}

interface ServiceMetricsHealth {
  status?: string
  responseTime?: number | string
  version?: string
  error?: string
}

interface ServiceMetricsDetails {
  memory?: { usage?: number | string; limit?: number | string; percentage?: number | string }
  cpu?: { usage?: number | string; system?: number | string; percentage?: number | string }
}

interface ServiceMetrics {
  health?: ServiceMetricsHealth
  metrics?: ServiceMetricsDetails
  status?: string
  version?: string
  lastCheck?: string
}

interface MetricsData {
  services?: Record<string, ServiceMetrics>
  // containers peut être un tableau (flux WS brut) ou une map (agrégateur)
  containers?: ContainerMetrics[] | Record<string, any>
  system?: SystemMetrics | Record<string, any>
  timestamp: string
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef<WebSocket | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // Fonction de reconnexion avec retry
  const attemptReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('[METRICS] ❌ Max retry attempts reached')
      setError('Service de métriques indisponible')
      setIsLoading(false)
      return
    }

    reconnectAttempts.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000) // Exponential backoff

    console.log(`[METRICS] 🔄 Tentative de reconnexion ${reconnectAttempts.current}/${maxReconnectAttempts} dans ${delay}ms`)

    retryTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        initSocket()
      }
    }, delay)
  }

  const initSocket = () => {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004'
      console.log('[METRICS] Connexion à:', metricsUrl)

      // Créer une connexion WebSocket avec timeout
      const socket = new WebSocket(metricsUrl.replace(/^http/, 'ws'))

      // Timeout de connexion
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.log('[METRICS] ⏱️ Timeout de connexion WebSocket')
          socket.close()
          attemptReconnect()
        }
      }, 5000)

      socketRef.current = socket

      socket.onopen = () => {
        clearTimeout(connectionTimeout)
        if (typeof window === 'undefined') return

        console.log('[METRICS] ✅ Connecté')
        setIsConnected(true)
        setIsLoading(false)
        setError(null)
        reconnectAttempts.current = 0 // Reset retry counter on success
      }

      socket.onclose = (event) => {
        clearTimeout(connectionTimeout)
        if (typeof window === 'undefined') return

        console.log('[METRICS] ❌ Déconnecté', event.code, event.reason)

        // Ne pas retry si c'est une fermeture normale
        if (event.code === 1000) {
          setIsConnected(false)
          return
        }

        setIsConnected(false)

        // Retry automatique après un délai
        if (reconnectAttempts.current < maxReconnectAttempts) {
          attemptReconnect()
        } else {
          setError('Service de métriques indisponible')
          setIsLoading(false)
        }
      }

      socket.onmessage = (event) => {
        if (typeof window === 'undefined') return

        try {
          const data = JSON.parse(event.data)

          if (data.type === 'initial' || data.type === 'update') {
            console.log('[METRICS] 📊 Données reçues')
            setMetrics(data.data)
            setError(null)
          }
        } catch (err) {
          console.error('[METRICS] Erreur parsing message:', err)
        }
      }

      socket.onerror = (err) => {
        if (typeof window === 'undefined') return

        console.error('[METRICS] ⚠️ Erreur WebSocket:', err)
        setError('Erreur de connexion WebSocket')
        setIsConnected(false)
        setIsLoading(false)

        // Ne pas retry sur les erreurs de sécurité ou de protocole
        if (err && typeof err === 'object' && 'target' in err) {
          const target = err.target as WebSocket
          if (target && target.readyState === WebSocket.CLOSED) {
            return
          }
        }
      }

    } catch (err) {
      if (typeof window === 'undefined') return

      console.error('[METRICS] ❌ Erreur initialisation:', err)
      setError('Erreur initialisation WebSocket')
      setIsLoading(false)

      // Retry pour les erreurs d'initialisation
      if (reconnectAttempts.current < maxReconnectAttempts) {
        attemptReconnect()
      }
    }
  }

  useEffect(() => {
    // Vérification côté client uniquement
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    let mounted = true

    const initMetrics = async () => {
      // Attendre que les services soient disponibles
      const checkServices = async () => {
        try {
          const response = await fetch('http://localhost:3000/health', {
            signal: AbortSignal.timeout(2000)
          })
          if (response.ok) {
            initSocket()
          } else {
            throw new Error('Services non disponibles')
          }
        } catch (err) {
          console.log('[METRICS] ⏳ Services non encore disponibles, retry dans 2s...')
          setTimeout(checkServices, 2000)
        }
      }

      checkServices()
    }

    initMetrics()

    return () => {
      mounted = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted')
        socketRef.current = null
      }
    }
  }, [])

  const refreshMetrics = async () => {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:5004'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`, {
        signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setError(null)
        return data
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('[METRICS] Erreur refresh:', errorMessage)

      // Ne pas afficher d'erreur si c'est juste un service indisponible
      if (!errorMessage.includes('fetch') && !errorMessage.includes('ECONNREFUSED') && !errorMessage.includes('AbortError')) {
        setError('Service de métriques temporairement indisponible')
      }

      return null
    }
  }

  return {
    metrics,
    isConnected,
    error,
    isLoading,
    refreshMetrics,
  }
}

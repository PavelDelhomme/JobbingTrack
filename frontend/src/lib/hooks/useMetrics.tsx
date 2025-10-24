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

interface MetricsData {
  containers: ContainerMetrics[]
  system: SystemMetrics
  timestamp: string
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Vérification côté client uniquement
    if (typeof window === 'undefined') {
      return
    }

    let mounted = true

    const initSocket = async () => {
      try {
        const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'

        console.log('[METRICS] Connexion à:', metricsUrl)

        // Créer une connexion WebSocket native
        const socket = new WebSocket(`ws://localhost:3014`)

        socketRef.current = socket

        socket.onopen = () => {
          if (!mounted) return
          console.log('[METRICS] ✅ Connecté')
          setIsConnected(true)
          setIsLoading(false)
          setError(null)
        }

        socket.onclose = () => {
          if (!mounted) return
          console.log('[METRICS] ❌ Déconnecté')
          setIsConnected(false)
        }

        socket.onmessage = (event) => {
          if (!mounted) return
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'initial' || data.type === 'update') {
              console.log('[METRICS] 📊 Données reçues')
              setMetrics(data.data)
            }
          } catch (err) {
            console.error('[METRICS] Erreur parsing message:', err)
          }
        }

        socket.onerror = (err) => {
          if (!mounted) return
          console.error('[METRICS] ⚠️ Erreur:', err)
          setError(`Erreur de connexion: ${err}`)
          setIsConnected(false)
          setIsLoading(false)
        }

      } catch (err) {
        if (!mounted) return
        console.error('[METRICS] ❌ Erreur connexion:', err)
        setError('Erreur connexion WebSocket')
        setIsLoading(false)
      }
    }

    initSocket()

    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [])

  const refreshMetrics = async () => {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`)

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setError(null)
      }
    } catch (err) {
      console.error('[METRICS] Erreur refresh:', err)
      setError('Erreur rafraîchissement')
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

'use client'

import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    model: string
  }
  memory: {
    total: number
    used: number
    free: number
    usage: number
  }
  load: {
    average: number
    cores: number[]
  }
  disk: Array<{
    mount: string
    total: number
    used: number
    usage: number
  }>
}

interface ServiceMetrics {
  name: string
  url: string
  port: number
  status: 'online' | 'offline' | 'testing'
  responseTime?: number
  version?: string
  error?: string
  health?: {
    status: string
    responseTime: number
    version?: string
    error?: string
  }
  lastCheck: string
  metrics?: {
    memory?: {
      usage: number
      limit: number
      percentage: number
    }
    cpu?: {
      usage: number
      system: number
      percentage: number
    }
    network?: {
      rx_bytes: number
      tx_bytes: number
    }
  }
}

interface ContainerMetrics {
  [containerName: string]: {
    memory: {
      usage: number
      limit: number
      percentage: number
    }
    cpu: {
      usage: number
      system: number
      percentage: number
    }
    network: {
      rx_bytes: number
      tx_bytes: number
    }
    status: string
  }
}

interface MetricsData {
  services: { [key: string]: ServiceMetrics }
  system: SystemMetrics
  containers: ContainerMetrics
  timestamp: string
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef<any>(null)

  useEffect(() => {
    // Connexion au Metrics Aggregator Service
    const socket = io('http://localhost:3014', {
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[METRICS] Connecté au service de métriques')
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', () => {
      console.log('[METRICS] Déconnecté du service de métriques')
      setIsConnected(false)
    })

    socket.on('metrics-update', (data: MetricsData) => {
      setMetrics(data)
    })

    socket.on('connect_error', (err: Error) => {
      console.error('[METRICS] Erreur de connexion:', err)
      setError('Impossible de se connecter au service de métriques')
      setIsConnected(false)
    })

    // Nettoyage à la déconnexion
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [])

  const refreshMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3014/api/v1/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setError(null)
      } else {
        throw new Error(`Erreur HTTP ${response.status}`)
      }
    } catch (err) {
      console.error('[METRICS] Erreur lors du rafraîchissement:', err)
      setError('Erreur lors du rafraîchissement des métriques')
    }
  }

  return {
    metrics,
    isConnected,
    error,
    refreshMetrics
  }
}

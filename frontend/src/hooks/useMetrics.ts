'use client'

import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import { Socket } from 'socket.io-client'

interface SystemMetrics {
  cpu: {
    usage: number | string
    cores: number | string
    model: string
  }
  memory: {
    total: number | string
    used: number | string
    free: number | string
    usage: number | string
  }
  load: {
    average: number | string
    cores: number[] | string
  }
  disk: Array<{
    mount: string
    total: number | string
    used: number | string
    usage: number | string
  }>
}

interface ServiceMetrics {
  name: string
  url: string
  port: number
  status: string
  responseTime?: number | string
  version?: string
  error?: string
  health?: {
    status: string
    responseTime: number | string
    version?: string
    error?: string
  }
  lastCheck: string
  metrics?: {
    memory?: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu?: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network?: {
      rx_bytes: number | string
      tx_bytes: number | string
    }
  }
}

interface ContainerMetrics {
  [containerName: string]: {
    memory: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network: {
      rx_bytes: number | string
      tx_bytes: number | string
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
  const socketRef = useRef<any | null>(null)
  const connectionAttempts = useRef(0)
  const maxConnectionAttempts = 3

  // Initialiser avec des métriques N/A
  useEffect(() => {
    setMetrics(generateNAMetrics())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Vérification côté client uniquement
    if (typeof window === 'undefined') {
      return
    }

    let mounted = true

    // Importation dymanyique de socket.io-client
    const initSocket = async () => {
      try {
        // Importation dynamique
        const io = (await import('socket.io-client')).default

        if (!mounted) return

        const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'

        // Vérifier si les WebSockets sont désactivés
        const disableWebSocket = process.env.NEXT_PUBLIC_DISABLE_METRICS_WEBSOCKET === 'true'

        if (disableWebSocket) {
          console.log('[METRICS] WebSocket désactivé par configuration')
          setIsConnected(false)
          setIsLoading(false)
          fetchMetricsFallback()
          return
        }

        // Connecion au Metrics Aggregator Service avec gestion d'erreur améliorée
        const socket = io(metricsUrl, {
          transports: ['websocket', 'polling'],
          timeout: 3000,
          forceNew: true,
          reconnection: false, // Désactiver la reconnexion automatique pour éviter le spam
          reconnectionAttempts: 0,
        })

        socket.on('connect', () => {
          if (!mounted) return
          connectionAttempts.current = 0
          console.log('[METRICS] ✅ Connecté au service de métriques')
          setIsConnected(true)
          setIsLoading(false)
          setError(null)
        })

        socket.on('disconnect', (reason: string) => {
          if (!mounted) return
          console.log('[METRICS] ❌ Déconnecté du service de métriques:', reason)
          setIsConnected(false)
          // Fallback automatique vers HTTP après déconnexion
          if (reason !== 'io client disconnect') {
            setTimeout(() => {
              if (!mounted) return
              fetchMetricsFallback()
            }, 1000)
          }
        })

        socket.on('metrics-update', (data: MetricsData) => {
          if (!mounted) return
          console.log('[METRICS] 📊 Mise à jour reçue')
          setMetrics(data)
          setIsLoading(false)
        })

        socket.on('connect_error', (err: Error) => {
          if (!mounted) return
          connectionAttempts.current++

          // Seulement logger les premières tentatives pour éviter le spam
          if (connectionAttempts.current <= maxConnectionAttempts) {
            console.warn(`[METRICS] ⚠️ Erreur de connexion WebSocket (tentative ${connectionAttempts.current}/${maxConnectionAttempts})`)
          }

          if (connectionAttempts.current >= maxConnectionAttempts) {
            console.warn('[METRICS] ❌ Abandon de la connexion WebSocket après plusieurs tentatives')
          setError('Mode dégradé - Connexion WebSocket non disponible')
          setIsConnected(false)
          setIsLoading(false)
            // Passage automatique en mode HTTP
            fetchMetricsFallback()
          }
        })

        socket.on('error', (err: Error) => {
          if (!mounted) return
          // Ne pas logger les erreurs de socket pour éviter le spam
          console.warn('[METRICS] ⚠️ Erreur socket détectée')
        })

      } catch (err) {
        if (!mounted) return
        console.error('[METRICS] ❌ Erreur lors du chargement de socket.io-client:', err)
        setError('Erreur lors du chargement de la bibliothèque socket.io-client')
        setIsLoading(false)
      }
    }

    initSocket()

    // Nettoyage à la déconnexion
    return () => {
      mounted = false
      if (socketRef.current) {
        console.log('[METRICS] 🔌 Nettoyage de la connexion socket')
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
        console.log('[METRICS] 🔄 Métriques rafraîchies')
      } else {
        throw new Error(`Erreur HTTP ${response.status}`)
      }
    } catch (err) {
      console.error('[METRICS] ⚠️ Erreur lors du rafraîchissement:', err)
      setError('Erreur lors du rafraîchissement des métriques')
    }
  }


  // Fonction pour générer des métriques avec valeurs N/A
  const generateNAMetrics = (): MetricsData => ({
    services: {
      'api-gateway': {
        name: 'API Gateway',
        url: 'http://localhost:3000',
        port: 3000,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString(),
        metrics: {
          memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
          cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
          network: { rx_bytes: 'N/A', tx_bytes: 'N/A' }
        }
      },
      'auth-service': {
        name: 'Auth Service',
        url: 'http://localhost:3001',
        port: 3001,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString(),
        metrics: {
          memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
          cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
          network: { rx_bytes: 'N/A', tx_bytes: 'N/A' }
        }
      },
      'application-service': {
        name: 'Application Service',
        url: 'http://localhost:3002',
        port: 3002,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'company-service': {
        name: 'Company Service',
        url: 'http://localhost:3003',
        port: 3003,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'contact-service': {
        name: 'Contact Service',
        url: 'http://localhost:3004',
        port: 3004,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'interview-service': {
        name: 'Interview Service',
        url: 'http://localhost:3005',
        port: 3005,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'notification-service': {
        name: 'Notification Service',
        url: 'http://localhost:3006',
        port: 3006,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'dashboard-service': {
        name: 'Dashboard Service',
        url: 'http://localhost:3007',
        port: 3007,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'call-service': {
        name: 'Call Service',
        url: 'http://localhost:3008',
        port: 3008,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'event-service': {
        name: 'Event Service',
        url: 'http://localhost:3009',
        port: 3009,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'followup-service': {
        name: 'FollowUp Service',
        url: 'http://localhost:3010',
        port: 3010,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'profile-service': {
        name: 'Profile Service',
        url: 'http://localhost:3011',
        port: 3011,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      },
      'workflow-service': {
        name: 'Workflow Service',
        url: 'http://localhost:3013',
        port: 3013,
        status: 'N/A',
        responseTime: 'N/A',
        version: 'N/A',
        health: { status: 'N/A', responseTime: 'N/A' },
        lastCheck: new Date().toISOString()
      }
    },
    system: {
      cpu: { usage: 'N/A', cores: 'N/A', model: 'N/A' },
      memory: { total: 'N/A', used: 'N/A', free: 'N/A', usage: 'N/A' },
      load: { average: 'N/A', cores: 'N/A' },
      disk: [{ mount: 'N/A', total: 'N/A', used: 'N/A', usage: 'N/A' }]
    },
    containers: {
      'api-gateway': {
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
        network: { rx_bytes: 'N/A', tx_bytes: 'N/A' },
        status: 'N/A'
      },
      'auth-service': {
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
        network: { rx_bytes: 'N/A', tx_bytes: 'N/A' },
        status: 'N/A' as 'N/A'
      },
      'application-service': {
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
        network: { rx_bytes: 'N/A', tx_bytes: 'N/A' },
        status: 'N/A' as 'N/A'
      },
      'postgres': {
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
        network: { rx_bytes: 'N/A', tx_bytes: 'N/A' },
        status: 'N/A' as 'N/A'
      },
      'redis': {
        memory: { usage: 'N/A', limit: 'N/A', percentage: 'N/A' },
        cpu: { usage: 'N/A', system: 'N/A', percentage: 'N/A' },
        network: { rx_bytes: 'N/A', tx_bytes: 'N/A' },
        status: 'N/A' as 'N/A'
      }
    },
    timestamp: new Date().toISOString()
  })

  // Fonction pour récupérer les métriques système via HTTP avec retry intelligent
  const fetchMetricsFallback = async (retryCount = 0) => {
    const maxRetries = 2

    try {
      // Essayer d'abord le service de métriques agrégateur
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'
      const response = await fetch(`${metricsUrl}/api/v1/metrics`)

      if (response.ok) {
        const data = await response.json()

        // Fusionner les nouvelles données avec les données N/A existantes
        setMetrics(prevMetrics => {
          if (!prevMetrics) return data

          const updatedMetrics = { ...prevMetrics }

          // Mettre à jour les services avec les vraies données
          if (data.services) {
            Object.keys(data.services).forEach(serviceKey => {
              if (data.services[serviceKey]) {
                updatedMetrics.services[serviceKey] = {
                  ...updatedMetrics.services[serviceKey],
                  ...data.services[serviceKey]
                }
              }
            })
          }

          // Mettre à jour les métriques système
          if (data.system) {
            updatedMetrics.system = {
              ...updatedMetrics.system,
              ...data.system
            }
          }

          // Mettre à jour les conteneurs
          if (data.containers) {
            updatedMetrics.containers = {
              ...updatedMetrics.containers,
              ...data.containers
            }
          }

          updatedMetrics.timestamp = data.timestamp || new Date().toISOString()
          return updatedMetrics
        })

        setError(null)
        console.log('[METRICS] 📊 Métriques récupérées depuis le service agrégateur')
        return
      }
    } catch (err) {
      if (retryCount < maxRetries) {
        console.warn(`[METRICS] ⚠️ Service de métriques agrégateur non disponible (tentative ${retryCount + 1}/${maxRetries + 1})`)
        // Attendre avant de retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return fetchMetricsFallback(retryCount + 1)
      }
      console.warn('[METRICS] ⚠️ Service de métriques agrégateur non disponible après tous les retries')
    }

    try {
      // Fallback vers le service de métriques système
      const systemMetricsUrl = 'http://localhost:3018'
      const response = await fetch(`${systemMetricsUrl}/api/v1/metrics/system`)

      if (response.ok) {
        const responseData = await response.json()

        if (responseData.success && responseData.data) {
          const systemData = responseData.data
          console.log('[METRICS] 📊 Métriques système récupérées')

          // Fusionner les métriques système avec les données N/A existantes
          setMetrics(prevMetrics => {
            if (!prevMetrics) {
              return {
                services: generateNAMetrics().services,
                system: systemData,
                containers: generateNAMetrics().containers,
                timestamp: new Date().toISOString()
              }
            }

            return {
              ...prevMetrics,
              system: {
                ...prevMetrics.system,
                ...systemData
              },
              timestamp: new Date().toISOString()
            }
          })

          // Essayer de récupérer les métriques des services depuis l'agrégateur
          try {
            const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014'
            const fullResponse = await fetch(`${metricsUrl}/api/v1/metrics`)

            if (fullResponse.ok) {
              const fullData = await fullResponse.json()

              // Fusionner les services aussi
              setMetrics(prevMetrics => {
                if (!prevMetrics) return fullData

                const updatedMetrics = { ...prevMetrics }

                // Mettre à jour les services
                if (fullData.services) {
                  Object.keys(fullData.services).forEach(serviceKey => {
                    if (fullData.services[serviceKey]) {
                      updatedMetrics.services[serviceKey] = {
                        ...updatedMetrics.services[serviceKey],
                        ...fullData.services[serviceKey]
                      }
                    }
                  })
                }

                // Mettre à jour les conteneurs
                if (fullData.containers) {
                  updatedMetrics.containers = {
                    ...updatedMetrics.containers,
                    ...fullData.containers
                  }
                }

                return updatedMetrics
              })

              setError(null)
              console.log('[METRICS] 📊 Métriques complètes récupérées')
              return
            }
          } catch (err) {
            console.warn('[METRICS] ⚠️ Service agrégateur non disponible pour les services')
          }

          setError('Métriques des services non disponibles')
          return
        }
      }
    } catch (err) {
      // Seulement logger si c'est une erreur inattendue
      if (retryCount === 0) {
        console.warn('[METRICS] ⚠️ Service de métriques système non disponible')
      }
    }

    // cAdvisor non accessible depuis les conteneurs, ne pas essayer
    console.log('[METRICS] cAdvisor non accessible depuis les conteneurs')

    // Si tous les fallbacks échouent, garder les métriques N/A existantes
    console.warn('[METRICS] ⚠️ Aucun service de métriques disponible - fonctionnement avec valeurs N/A')
    setError('Services de métriques non disponibles - affichage des valeurs N/A')
  }


  return {
    metrics,
    isConnected,
    error,
    refreshMetrics,
    fetchMetricsFallback,
    isLoading,
  }
}

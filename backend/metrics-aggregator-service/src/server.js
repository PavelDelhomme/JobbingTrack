const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cron = require('node-cron')
const si = require('systeminformation')
const axios = require('axios')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    methods: ["GET", "POST"]
  }
})

// Middleware de sécurité
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080"
}))
app.use(morgan('combined'))
app.use(express.json())

// Docker non accessible depuis les conteneurs

// Configuration des services connus
const KNOWN_SERVICES = {
  'jobbingtrack-api-gateway': { port: 3000, healthPath: '/api/v1/health' },
  'jobbingtrack-auth-service': { port: 3001, healthPath: '/api/v1/auth/health' },
  'jobbingtrack-application-service': { port: 3002, healthPath: '/api/v1/applications/health' },
  'jobbingtrack-company-service': { port: 3003, healthPath: '/api/v1/companies/health' },
  'jobbingtrack-contact-service': { port: 3004, healthPath: '/api/v1/contacts/health' },
  'jobbingtrack-interview-service': { port: 3005, healthPath: '/api/v1/interviews/health' },
  'jobbingtrack-notification-service': { port: 3006, healthPath: '/api/v1/notifications/health' },
  'jobbingtrack-dashboard-service': { port: 3007, healthPath: '/api/v1/dashboard/health' },
  'jobbingtrack-call-service': { port: 3008, healthPath: '/api/v1/calls/health' },
  'jobbingtrack-event-service': { port: 3009, healthPath: '/api/v1/events/health' },
  'jobbingtrack-followup-service': { port: 3010, healthPath: '/api/v1/followups/health' },
  'jobbingtrack-profile-service': { port: 3011, healthPath: '/api/v1/profile/health' },
  'jobbingtrack-workflow-service': { port: 3013, healthPath: '/api/v1/workflow/health' },
  'jobbingtrack-metrics-aggregator': { port: 3014, healthPath: '/api/v1/health' },
  'jobbingtrack-frontend': { port: 3000, healthPath: '/health' },
  'jobbingtrack-postgres': { port: 5432, type: 'database' },
  'jobbingtrack-redis': { port: 6379, type: 'cache' },
  'jobbingtrack-cadvisor': { port: 8080, type: 'monitoring' },
  'jobbingtrack-prometheus': { port: 9090, type: 'monitoring' }
}

// Stockage des métriques
let servicesMetrics = {}
let systemMetrics = {}
let containerMetrics = {}

// Fonction pour découvrir automatiquement les conteneurs
async function discoverServices() {
  console.log('[DISCOVERY] === DÉBUT DÉCOUVERTE ===')
  try {
    console.log('[DISCOVERY] Docker API non accessible, utilisation des services configurés statiquement...')

    // Retourner les services configurés statiquement car Docker API n'est pas accessible
    const discoveredServices = {}

    // Ajouter tous les services configurés comme non démarrés
    Object.keys(KNOWN_SERVICES).forEach(serviceName => {
      discoveredServices[serviceName] = {
        ...KNOWN_SERVICES[serviceName],
        containerId: null,
        status: 'not_running',
        discovered: false
      }
    })

    console.log(`[DISCOVERY] ${Object.keys(discoveredServices).length} services configurés`)
    console.log('[DISCOVERY] === FIN DÉCOUVERTE ===')
    return discoveredServices

  } catch (error) {
    console.error('[DISCOVERY] Erreur lors de la découverte:', error)
    console.log('[DISCOVERY] === ERREUR DÉCOUVERTE ===')
    return {}
  }
}

// Fonction pour tester la santé d'un service
async function testServiceHealth(serviceName, serviceConfig) {
  const startTime = Date.now()

  try {
    // Test HTTP pour les services web
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `http://${serviceName}:${serviceConfig.port}`
      : `http://localhost:${serviceConfig.port}`

    const response = await axios.get(`${baseUrl}${serviceConfig.healthPath}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    })

    return {
      status: response.status >= 200 && response.status < 400 ? 'online' : 'offline',
      responseTime: Date.now() - startTime,
      version: response.data?.version || '1.0.0',
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined
    }

  } catch (error) {
    return {
      status: 'offline',
      responseTime: Date.now() - startTime,
      error: error.code === 'ECONNREFUSED' ? 'Service non démarré' :
             error.code === 'ETIMEDOUT' ? 'Timeout' :
             error.message || 'Service inaccessible'
    }
  }
}

// Fonction pour collecter les métriques système
async function collectSystemMetrics() {
  try {
    const [cpu, mem, load, disk] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.currentLoad(),
      si.fsSize()
    ])

    systemMetrics = {
      cpu: {
        usage: Math.round(cpu.usage || 0),
        cores: cpu.cores || 1,
        model: cpu.brand || 'Unknown'
      },
      memory: {
        total: Math.round(mem.total / 1024 / 1024), // MB
        used: Math.round(mem.used / 1024 / 1024),   // MB
        free: Math.round(mem.free / 1024 / 1024),   // MB
        usage: Math.round((mem.used / mem.total) * 100)
      },
      load: {
        average: Math.round(load.avgload * 100) / 100,
        cores: load.cpus || []
      },
      disk: disk.map(d => ({
        mount: d.mount,
        total: Math.round(d.size / 1024 / 1024 / 1024), // GB
        used: Math.round(d.used / 1024 / 1024 / 1024),  // GB
        usage: Math.round((d.used / d.size) * 100)
      }))
    }

    return systemMetrics

  } catch (error) {
    console.error('[METRICS] Erreur collecte métriques système:', error)
    return {}
  }
}

// Fonction pour collecter les métriques des conteneurs depuis Prometheus
async function collectContainerMetrics() {
  console.log('[CONTAINERS] === DÉBUT COLLECTE CONTENEURS ===')
  try {
    console.log('[CONTAINERS] Récupération des métriques depuis Prometheus...')

    // Configuration Prometheus
    const prometheusUrl = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090'

    // Récupérer les métriques CPU des conteneurs
    const cpuQuery = 'rate(container_cpu_usage_seconds_total[5m]) * 100'
    const memoryQuery = 'container_memory_usage_bytes / container_spec_memory_limit_bytes * 100'

    const [cpuResponse, memoryResponse] = await Promise.all([
      axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query: cpuQuery },
        timeout: 5000
      }),
      axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query: memoryQuery },
        timeout: 5000
      })
    ])

    const containerMetrics = {}

    // Traiter les métriques CPU
    if (cpuResponse.data.status === 'success' && cpuResponse.data.data.result) {
      console.log(`[PROMETHEUS] Traitement de ${cpuResponse.data.data.result.length} métriques CPU`)
      cpuResponse.data.data.result.forEach(metric => {
        const containerId = metric.metric.id || metric.metric.name || 'unknown'
        const containerName = containerId.replace('/', '').replace(/^\//, '') || 'system'
        const cpuUsage = parseFloat(metric.value[1])

        console.log(`[PROMETHEUS] CPU ${containerName}: ${cpuUsage}`)

        if (!containerMetrics[containerName]) {
          containerMetrics[containerName] = {}
        }
        containerMetrics[containerName].cpu = {
          usage: cpuUsage,
          percentage: Math.min(100, Math.max(0, cpuUsage))
        }
      })
    }

    // Traiter les métriques mémoire
    if (memoryResponse.data.status === 'success' && memoryResponse.data.data.result) {
      console.log(`[PROMETHEUS] Traitement de ${memoryResponse.data.data.result.length} métriques mémoire`)
      memoryResponse.data.data.result.forEach(metric => {
        const containerId = metric.metric.id || metric.metric.name || 'unknown'
        const containerName = containerId.replace('/', '').replace(/^\//, '') || 'system'
        const memoryUsage = parseFloat(metric.value[1]) * 100

        console.log(`[PROMETHEUS] Mémoire ${containerName}: ${memoryUsage}%`)

        if (!containerMetrics[containerName]) {
          containerMetrics[containerName] = {}
        }
        containerMetrics[containerName].memory = {
          usage: memoryUsage,
          limit: 100, // Pourcentage
          percentage: Math.min(100, Math.max(0, memoryUsage))
        }
      })
    }

    console.log(`[CONTAINERS] Métriques collectées pour ${Object.keys(containerMetrics).length} conteneurs`)
    console.log('[CONTAINERS] === FIN COLLECTE CONTENEURS ===')
    return containerMetrics

  } catch (error) {
    console.error('[METRICS] Erreur collecte métriques conteneurs depuis Prometheus:', error.message)
    console.log('[CONTAINERS] === ERREUR COLLECTE CONTENEURS ===')
    return {}
  }
}

// Fonction principale de collecte des métriques
async function collectAllMetrics() {
  console.log('[COLLECTOR] === DÉBUT COLLECTE ===')
  try {
    console.log('[COLLECTOR] Démarrage de la collecte des métriques...')

    // Découvrir les services
    const discoveredServices = await discoverServices()

    // Collecter métriques système et conteneurs
    await Promise.all([
      collectSystemMetrics(),
      collectContainerMetrics()
    ])

    // Tester la santé de chaque service
    for (const [serviceName, serviceConfig] of Object.entries(discoveredServices)) {
      const health = await testServiceHealth(serviceName, serviceConfig)

      servicesMetrics[serviceName] = {
        ...serviceConfig,
        health,
        lastCheck: new Date().toISOString(),
        metrics: containerMetrics[serviceName] || {}
      }
    }

    console.log(`[COLLECTOR] Métriques collectées pour ${Object.keys(servicesMetrics).length} services`)
    console.log('[COLLECTOR] === FIN COLLECTE ===')

    // Émettre les métriques via WebSocket
    io.emit('metrics-update', {
      services: servicesMetrics,
      system: systemMetrics,
      containers: containerMetrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[COLLECTOR] Erreur lors de la collecte:', error)
    console.log('[COLLECTOR] === ERREUR COLLECTE ===')
  }
}

// Routes API
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'jobbingtrack-metrics-aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/v1/metrics', (req, res) => {
  res.json({
    services: servicesMetrics,
    system: systemMetrics,
    containers: containerMetrics,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/v1/services', async (req, res) => {
  const discoveredServices = await discoverServices()
  res.json(discoveredServices)
})

app.get('/api/v1/services/:serviceName', (req, res) => {
  const service = servicesMetrics[req.params.serviceName]
  if (!service) {
    return res.status(404).json({ error: 'Service non trouvé' })
  }
  res.json(service)
})

// WebSocket connection
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connecté:', socket.id)

  // Envoyer les métriques actuelles au client
  socket.emit('metrics-update', {
    services: servicesMetrics,
    system: systemMetrics,
    containers: containerMetrics,
    timestamp: new Date().toISOString()
  })

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client déconnecté:', socket.id)
  })
})

// Démarrer la collecte périodique
console.log('[SERVER] Démarrage du Metrics Aggregator Service...')

// Collecte immédiate au démarrage
collectAllMetrics()

// Collecte toutes les 10 secondes
cron.schedule('*/10 * * * * *', collectAllMetrics)

const PORT = process.env.PORT || 3014
server.listen(PORT, () => {
  console.log(`[SERVER] Service démarré sur le port ${PORT}`)
  console.log(`[SERVER] WebSocket activé pour les clients`)
})

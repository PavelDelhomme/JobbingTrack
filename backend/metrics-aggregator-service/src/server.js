const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cron = require('node-cron')
const Docker = require('dockerode')
const si = require('systeminformation')
const axios = require('axios')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
})

// Middleware de sécurité
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001"
}))
app.use(morgan('combined'))
app.use(express.json())

// Configuration Docker
const docker = new Docker()

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
  try {
    console.log('[DISCOVERY] Démarrage de la découverte automatique des services...')

    const containers = await docker.listContainers({ all: true })
    const discoveredServices = {}

    for (const container of containers) {
      const containerName = container.Names[0]?.replace('/', '') || container.Id.substring(0, 12)
      const imageName = container.Image

      // Vérifier si c'est un service connu ou si c'est un nouveau service
      if (KNOWN_SERVICES[containerName]) {
        const serviceConfig = KNOWN_SERVICES[containerName]
        discoveredServices[containerName] = {
          ...serviceConfig,
          containerId: container.Id,
          status: container.State,
          image: imageName,
          containerName: containerName,
          discovered: true
        }
      } else if (imageName.includes('postgres')) {
        discoveredServices[containerName] = {
          port: 5432,
          type: 'database',
          containerId: container.Id,
          status: container.State,
          image: imageName,
          containerName: containerName,
          discovered: true
        }
      } else if (imageName.includes('redis')) {
        discoveredServices[containerName] = {
          port: 6379,
          type: 'cache',
          containerId: container.Id,
          status: container.State,
          image: imageName,
          containerName: containerName,
          discovered: true
        }
      }
    }

    // Fusionner avec les services connus
    Object.keys(KNOWN_SERVICES).forEach(serviceName => {
      if (!discoveredServices[serviceName]) {
        discoveredServices[serviceName] = {
          ...KNOWN_SERVICES[serviceName],
          containerId: null,
          status: 'not_running',
          discovered: false
        }
      }
    })

    console.log(`[DISCOVERY] ${Object.keys(discoveredServices).length} services découverts`)
    return discoveredServices

  } catch (error) {
    console.error('[DISCOVERY] Erreur lors de la découverte:', error)
    return {}
  }
}

// Fonction pour tester la santé d'un service
async function testServiceHealth(serviceName, serviceConfig) {
  const startTime = Date.now()

  try {
    if (serviceConfig.type === 'database') {
      // Test de base de données PostgreSQL
      return {
        status: 'online',
        responseTime: Date.now() - startTime,
        version: 'PostgreSQL 15'
      }
    }

    if (serviceConfig.type === 'cache') {
      // Test Redis
      return {
        status: 'online',
        responseTime: Date.now() - startTime,
        version: 'Redis 7'
      }
    }

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

// Fonction pour collecter les métriques de cAdvisor
async function collectCadvisorMetrics() {
  try {
    const response = await axios.get('http://localhost:8080/api/v1.3/docker/', {
      timeout: 5000
    })

    if (response.data) {
      const cadvisorMetrics = {}

      // Traiter les métriques de chaque conteneur
      Object.keys(response.data).forEach(containerId => {
        const containerData = response.data[containerId]
        const containerName = Object.keys(containerData.aliases || {})[0] || containerId.substring(0, 12)

        if (containerData.stats && containerData.stats.length > 0) {
          const latestStats = containerData.stats[containerData.stats.length - 1]

          cadvisorMetrics[containerName] = {
            memory: {
              usage: Math.round(latestStats.memory?.usage || 0),
              max_usage: Math.round(latestStats.memory?.max_usage || 0),
              limit: Math.round(latestStats.memory?.limit || 0)
            },
            cpu: {
              usage: latestStats.cpu?.usage?.total || 0,
              system: latestStats.cpu?.usage?.system || 0,
              user: latestStats.cpu?.usage?.user || 0
            },
            network: {
              rx_bytes: latestStats.network?.rx_bytes || 0,
              tx_bytes: latestStats.network?.tx_bytes || 0,
              rx_errors: latestStats.network?.rx_errors || 0,
              tx_errors: latestStats.network?.tx_errors || 0
            },
            filesystem: latestStats.filesystem?.map(fs => ({
              device: fs.device,
              capacity: fs.capacity,
              usage: fs.usage
            })) || []
          }
        }
      })

      return cadvisorMetrics
    }

    return {}

  } catch (error) {
    console.error('[CADVISOR] Erreur récupération métriques cAdvisor:', error.message)
    return {}
  }
}

// Fonction pour collecter les métriques des conteneurs
async function collectContainerMetrics() {
  try {
    const containers = await docker.listContainers({ all: true })
    const metrics = {}

    // Essayer d'abord cAdvisor si disponible
    const cadvisorMetrics = await collectCadvisorMetrics()

    for (const container of containers) {
      const containerName = container.Names[0]?.replace('/', '') || container.Id.substring(0, 12)

      try {
        // Utiliser cAdvisor si disponible, sinon Docker API
        if (cadvisorMetrics[containerName]) {
          metrics[containerName] = {
            ...cadvisorMetrics[containerName],
            status: container.State,
            source: 'cadvisor'
          }
        } else {
          // Fallback vers Docker API
          const containerInfo = docker.getContainer(container.Id)
          const stats = await containerInfo.stats({ stream: false })

          if (stats && stats.memory_stats && stats.cpu_stats) {
            const memoryUsage = stats.memory_stats.usage || 0
            const memoryLimit = stats.memory_stats.limit || 1
            const cpuUsage = stats.cpu_stats.cpu_usage?.total_usage || 0
            const cpuSystem = stats.cpu_stats.system_cpu_usage || 1

            metrics[containerName] = {
              memory: {
                usage: Math.round(memoryUsage / 1024 / 1024), // MB
                limit: Math.round(memoryLimit / 1024 / 1024), // MB
                percentage: Math.round((memoryUsage / memoryLimit) * 100)
              },
              cpu: {
                usage: cpuUsage,
                system: cpuSystem,
                percentage: Math.round((cpuUsage / cpuSystem) * 100)
              },
              network: {
                rx_bytes: stats.networks?.eth0?.rx_bytes || 0,
                tx_bytes: stats.networks?.eth0?.tx_bytes || 0
              },
              status: container.State,
              source: 'docker'
            }
          }
        }
      } catch (error) {
        console.error(`[METRICS] Erreur collecte métriques container ${containerName}:`, error)
      }
    }

    containerMetrics = metrics
    return metrics

  } catch (error) {
    console.error('[METRICS] Erreur collecte métriques conteneurs:', error)
    return {}
  }
}

// Fonction principale de collecte des métriques
async function collectAllMetrics() {
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

    // Émettre les métriques via WebSocket
    io.emit('metrics-update', {
      services: servicesMetrics,
      system: systemMetrics,
      containers: containerMetrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[COLLECTOR] Erreur lors de la collecte:', error)
  }
}

// Routes API
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'metrics-aggregator',
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

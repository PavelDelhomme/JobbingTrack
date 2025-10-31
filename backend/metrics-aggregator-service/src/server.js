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

// Middleware d'authentification pour les métriques
const authenticateMetrics = (req, res, next) => {
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key']
  
  // Vérifier API Key ou Bearer token
  const validApiKey = process.env.METRICS_API_KEY || 'jobbingtrack-metrics-secret-key'
  
  if (apiKey === validApiKey) {
    return next()
  }
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // Pour le développement, accepter un token simple
    if (token === validApiKey || process.env.NODE_ENV === 'development') {
      return next()
    }
  }
  
  // En développement, permettre l'accès depuis localhost
  if (process.env.NODE_ENV === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
    return next()
  }
  
  res.status(401).json({ error: 'Unauthorized', message: 'API key or token required' })
}

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

// Fonction pour collecter les métriques des conteneurs depuis /proc natif
async function collectContainerMetrics() {
  console.log('[CONTAINERS] === DÉBUT COLLECTE CONTENEURS ===')
  const containerMetrics = {}
  
  try {
    const Docker = require('dockerode')
    const docker = new Docker({ socketPath: '/var/run/docker.sock' })
    const fs = require('fs').promises
    
    // Lister tous les conteneurs
    const containers = await docker.listContainers({ all: false })
    console.log(`[PROC] ${containers.length} conteneurs en cours d'exécution`)
    
    for (const containerInfo of containers) {
      const containerId = containerInfo.Id.substring(0, 12)
      const containerName = containerInfo.Names[0].replace(/^\//, '')
      
      try {
        // Inspecter le conteneur pour obtenir le PID
        const container = docker.getContainer(containerInfo.Id)
        const inspect = await container.inspect()
        const pid = inspect.State.Pid
        
        if (!pid || pid === 0) {
          console.log(`[PROC] ${containerName}: PID non disponible (conteneur arrêté?)`)
          continue
        }
        
        // Lire /host/proc/[pid]/stat pour CPU (mount depuis l'hôte en read-only)
        const statPath = `/host/proc/${pid}/stat`
        const statData = await fs.readFile(statPath, 'utf8')
        const statFields = statData.split(' ')
        
        // Champs importants de /proc/[pid]/stat:
        // 14: utime (user CPU time)
        // 15: stime (system CPU time)
        // 22: starttime
        const utime = parseInt(statFields[13]) || 0
        const stime = parseInt(statFields[14]) || 0
        const totalTime = utime + stime
        
        // Lire /host/proc/[pid]/status pour mémoire (mount depuis l'hôte en read-only)
        const statusPath = `/host/proc/${pid}/status`
        const statusData = await fs.readFile(statusPath, 'utf8')
        
        // Extraire VmRSS (Resident Set Size = mémoire physique utilisée)
        const vmrssMatch = statusData.match(/VmRSS:\s+(\d+)\s+kB/)
        const memoryKB = vmrssMatch ? parseInt(vmrssMatch[1]) : 0
        const memoryMB = Math.round(memoryKB / 1024)
        
        // Extraire VmSize (taille virtuelle totale)
        const vmsizeMatch = statusData.match(/VmSize:\s+(\d+)\s+kB/)
        const vmsizeKB = vmsizeMatch ? parseInt(vmsizeMatch[1]) : 0
        const vmsizeMB = Math.round(vmsizeKB / 1024)
        
        // Obtenir les limites de mémoire du conteneur depuis Docker
        const memoryLimit = inspect.HostConfig.Memory || 0
        const memoryLimitMB = memoryLimit > 0 ? Math.round(memoryLimit / 1024 / 1024) : vmsizeMB || 2048
        
        // Calculer le pourcentage de mémoire
        const memoryPercent = memoryLimitMB > 0 ? (memoryMB / memoryLimitMB) * 100 : 0
        
        // Pour le CPU, on utilise le temps total (sera calculé en différentiel)
        const cpuPercent = 0 // Sera calculé par différence entre 2 collectes
        
        containerMetrics[containerName] = {
          cpu: {
            usage: cpuPercent,
            percentage: cpuPercent,
            totalTime: totalTime, // Pour calcul différentiel
            lastUpdate: Date.now()
          },
          memory: {
            usage: memoryMB,
            limit: memoryLimitMB,
            percentage: Math.min(100, Math.max(0, memoryPercent))
          },
          network: {
            rx_bytes: 0, // À implémenter via /proc/net/dev si nécessaire
            tx_bytes: 0
          },
          status: inspect.State.Status || 'running',
          pid: pid
        }
        
        console.log(`[PROC] ${containerName}: PID ${pid}, Mémoire ${memoryMB}MB/${memoryLimitMB}MB (${memoryPercent.toFixed(1)}%)`)
        
      } catch (err) {
        console.error(`[PROC] Erreur pour ${containerName}:`, err.message)
      }
    }
    
    console.log(`[CONTAINERS] ${Object.keys(containerMetrics).length} conteneurs collectés depuis /proc`)
    return containerMetrics
    
  } catch (error) {
    console.error('[METRICS] Erreur collecte depuis /proc:', error.message)
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

    // Calculer les métriques système agrégées depuis TOUS les conteneurs
    const allContainers = Object.entries(containerMetrics)
    
    let systemTotalCpu = 0
    let systemTotalMemoryUsed = 0
    let systemTotalMemoryLimit = 0
    let systemContainerCount = 0

    allContainers.forEach(([name, metrics]) => {
      if (metrics.cpu?.percentage) {
        systemTotalCpu += metrics.cpu.percentage
        systemContainerCount++
      }
      if (metrics.memory?.usage && metrics.memory?.limit) {
        systemTotalMemoryUsed += metrics.memory.usage
        systemTotalMemoryLimit += metrics.memory.limit
      }
    })

    // Calculer les métriques agrégées pour les conteneurs JobbingTrack uniquement
    const jobbingtrackContainers = Object.entries(containerMetrics)
      .filter(([name]) => name.toLowerCase().includes('jobbingtrack'))
    
    let totalCpuPercent = 0
    let totalMemoryUsed = 0
    let totalMemoryLimit = 0
    let containerCount = 0

    jobbingtrackContainers.forEach(([name, metrics]) => {
      if (metrics.cpu?.percentage) {
        totalCpuPercent += metrics.cpu.percentage
        containerCount++
      }
      if (metrics.memory?.usage && metrics.memory?.limit) {
        totalMemoryUsed += metrics.memory.usage
        totalMemoryLimit += metrics.memory.limit
      }
    })

    // Ajouter les métriques agrégées au systemMetrics
    if (systemMetrics) {
      // Remplacer les métriques système par les métriques réelles des conteneurs
      systemMetrics.containersAggregate = {
        cpu: {
          percent: systemContainerCount > 0 ? (systemTotalCpu / systemContainerCount).toFixed(2) : 0,
          total: systemTotalCpu.toFixed(2),
          containers: systemContainerCount
        },
        memory: {
          used: Math.round(systemTotalMemoryUsed),
          limit: Math.round(systemTotalMemoryLimit),
          percent: systemTotalMemoryLimit > 0 ? ((systemTotalMemoryUsed / systemTotalMemoryLimit) * 100).toFixed(2) : 0
        }
      }
      
      systemMetrics.jobbingtrack = {
        containers: {
          count: jobbingtrackContainers.length,
          cpu: {
            averagePercent: containerCount > 0 ? Math.round(totalCpuPercent / containerCount) : 0,
            totalPercent: Math.round(totalCpuPercent)
          },
          memory: {
            used: Math.round(totalMemoryUsed),
            limit: Math.round(totalMemoryLimit),
            percent: totalMemoryLimit > 0 ? Math.round((totalMemoryUsed / totalMemoryLimit) * 100) : 0
          }
        }
      }
    }

    console.log(`[COLLECTOR] Métriques collectées pour ${Object.keys(servicesMetrics).length} services`)
    console.log(`[COLLECTOR] JobbingTrack: ${jobbingtrackContainers.length} conteneurs, CPU avg: ${systemMetrics.jobbingtrack?.containers?.cpu?.averagePercent}%, Mémoire: ${systemMetrics.jobbingtrack?.containers?.memory?.percent}%`)
    
    // Construire l'objet de métriques complet
    const metricsData = {
      containers: containerMetrics,
      system: systemMetrics,
      services: servicesMetrics,
      timestamp: new Date().toISOString()
    }
    
    // Exporter vers /tmp/metrics/latest.json (partage avec l'hôte)
    try {
      const fs = require('fs').promises
      const exportPath = '/tmp/metrics/latest.json'
      await fs.writeFile(exportPath, JSON.stringify(metricsData, null, 2), 'utf8')
      console.log(`[EXPORT] Métriques exportées vers ${exportPath}`)
    } catch (err) {
      console.error('[EXPORT] Erreur export /tmp/metrics:', err.message)
    }
    
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

// Import des routes
const dockerRoutes = require('./routes/docker.routes')

// Routes API
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'jobbingtrack-metrics-aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// Routes Docker (métriques directes depuis Docker)
app.use('/api/v1/docker', dockerRoutes)

app.get('/api/v1/metrics', authenticateMetrics, (req, res) => {
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

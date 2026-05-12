const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cron = require('node-cron')
const si = require('systeminformation')
const axios = require('axios')
const Docker = require('dockerode')
const jwt = require('jsonwebtoken')

// Réduction des logs : moins de bruit conteneurs/monitoring pour se concentrer sur données et tests API.
// Mettre REDUCE_METRICS_LOGS=0 dans .env pour réactiver les logs verbeux ([PROC], [DISCOVERY], [CONTAINERS], etc.).
const REDUCE_LOGS = process.env.REDUCE_METRICS_LOGS !== '0'
function logIfVerbose (...args) { if (!REDUCE_LOGS) console.log(...args) }

// ✅ OPTIMISATION: Pool de connexions Docker réutilisable
// Créer une instance Docker unique réutilisable au lieu de créer de nouvelles instances
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [
      // Nouveaux ports (5000-5019) - prioritaires
      'http://localhost:5003',  // Frontend
      'http://localhost:5002',  // API Gateway
      'http://localhost:5005',  // Auth Service
      'http://localhost:5004',  // Metrics Aggregator
      'http://127.0.0.1:5003',
      'http://127.0.0.1:5002',
      'http://127.0.0.1:5005',
      'http://127.0.0.1:5004',
      // Anciens ports (compatibilité)
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Middleware CORS - DOIT être avant Helmet pour éviter les conflits
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [
  // Nouveaux ports (5000-5019) - prioritaires
  'http://localhost:5003',  // Frontend
  'http://localhost:5002',  // API Gateway
  'http://localhost:5005',  // Auth Service
  'http://localhost:5004',  // Metrics Aggregator
  'http://127.0.0.1:5003',
  'http://127.0.0.1:5002',
  'http://127.0.0.1:5005',
  'http://127.0.0.1:5004',
  // Anciens ports (compatibilité)
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5003',  // Frontend backoffice
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5003'
]
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (ex: Postman, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, true) // En développement, autoriser toutes les origines
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Origin', 'X-Requested-With', 'Accept']
}
app.use(cors(corsOptions))
// Middleware de sécurité - après CORS pour éviter les conflits
// Désactiver crossOriginResourcePolicy de Helmet car il peut bloquer CORS
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}))
app.use(morgan('combined'))
app.use(express.json())

// Middleware d'authentification pour les métriques (activé si ENABLE_METRICS_AUTH=true ou NODE_ENV=production)
const metricsAuthEnabled = process.env.ENABLE_METRICS_AUTH === 'true' || process.env.NODE_ENV === 'production'
let metricsAuthLoggedOnce = false
const authenticateMetrics = (req, res, next) => {
  if (!metricsAuthEnabled) {
    if (!metricsAuthLoggedOnce) {
      metricsAuthLoggedOnce = true
      console.log('[AUTH] Métriques en mode accès libre (ENABLE_METRICS_AUTH non activé)')
    }
    return next()
  }
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key']
  const validApiKey = process.env.METRICS_API_KEY
  if (validApiKey && apiKey === validApiKey) {
    return next()
  }
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET
    if (jwtSecret && token) {
      try {
        req.user = jwt.verify(token, jwtSecret)
        return next()
      } catch {
        return res.status(403).json({ success: false, error: 'Forbidden', message: 'Invalid metrics bearer token' })
      }
    }
    if (process.env.NODE_ENV === 'test' && token && token.length > 10) {
      return next()
    }
  }
  res.status(401).json({ success: false, error: 'Unauthorized', message: 'API key (X-API-Key) or Bearer token required for metrics' })
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
  'jobbingtrack-security-service': { port: 3017, healthPath: '/api/v1/security/health' },
  'jobbingtrack-deployment-service': { port: 3016, healthPath: '/api/v1/health' },
  'jobbingtrack-monitoring-c': { port: 8015, healthPath: '/api/v1/health' },
  'jobbingtrack-log-collector-c': { port: 3019, healthPath: '/health' },
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

// Conteneurs considérés comme "JobbingTrack" (nom complet ou court, selon source bas niveau)
function isJobbingTrackContainer(name) {
  if (!name || typeof name !== 'string') return false
  const n = name.toLowerCase().trim()
  if (n.includes('jobbingtrack')) return true
  if (KNOWN_SERVICES[n]) return true
  const withPrefix = 'jobbingtrack-' + n.replace(/^\//, '')
  if (KNOWN_SERVICES[withPrefix]) return true
  return false
}
// Payload complet pour le backoffice (source bas niveau → aggregator → frontend)
let lastMetricsData = null

// Fonction pour découvrir automatiquement les conteneurs
async function discoverServices() {
  logIfVerbose('[DISCOVERY] === DÉBUT DÉCOUVERTE ===')
  try {
    logIfVerbose('[DISCOVERY] Docker API non accessible, utilisation des services configurés statiquement...')

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

    logIfVerbose(`[DISCOVERY] ${Object.keys(discoveredServices).length} services configurés`)
    logIfVerbose('[DISCOVERY] === FIN DÉCOUVERTE ===')
    return discoveredServices
  } catch (error) {
    console.error('[DISCOVERY] Erreur lors de la découverte:', error)
    logIfVerbose('[DISCOVERY] === ERREUR DÉCOUVERTE ===')
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

    const responseTime = Date.now() - startTime;

    return {
      status: response.status >= 200 && response.status < 400 ? 'healthy' : 'unhealthy',
      responseTime: responseTime,
      responseTimeMs: responseTime, // ✅ Ajouter aussi en responseTimeMs pour compatibilité
      statusCode: response.status,
      version: response.data?.version || '1.0.0',
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'offline',
      responseTime: responseTime,
      responseTimeMs: responseTime, // ✅ Ajouter aussi en responseTimeMs
      statusCode: null,
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

    // ✅ Calculer la charge moyenne correctement
    // Si avgLoad n'est pas disponible, estimer à partir de currentLoad
    const loadAverage = load.avgLoad !== undefined && load.avgLoad > 0 ? load.avgLoad : 
                       (load.currentLoad ? (load.currentLoad / 100) * (cpu.cores || 1) : 0)

    console.log(`[SYSTEM] Load - avgLoad: ${load.avgLoad}, currentLoad: ${load.currentLoad}, calculated: ${loadAverage}`)

    // ✅ Filtrer les disques pertinents (éviter les snap, loop, etc.)
    const relevantDisks = disk.filter(d => 
      !d.mount.includes('/snap') && 
      !d.mount.includes('/loop') &&
      d.size > 0 &&
      (d.mount === '/' || d.mount.startsWith('/var') || d.mount.startsWith('/home'))
    )

    // ✅ Utiliser le disque principal (/) ou le premier disque valide
    const mainDisk = relevantDisks.find(d => d.mount === '/') || relevantDisks[0]

    console.log(`[SYSTEM] Disque principal: ${mainDisk?.mount}, ${mainDisk?.used}/${mainDisk?.size}`)

    systemMetrics = {
      cpu: {
        usage: Math.round(load.currentLoad || cpu.usage || 0),
        usage_percent: Math.round(load.currentLoad || cpu.usage || 0), // frontend attend usage_percent
        cores: cpu.cores || 1,
        model: cpu.brand || 'Unknown',
        per_core: cpu.cores ? Math.round((load.currentLoad || 0) / cpu.cores * 10) / 10 : 0
      },
      memory: {
        total: Math.round(mem.total / 1024 / 1024), // MB
        used: Math.round(mem.used / 1024 / 1024),   // MB
        free: Math.round(mem.free / 1024 / 1024),   // MB
        usage: Math.round((mem.used / mem.total) * 100),
        usage_percent: Math.round((mem.used / mem.total) * 100), // frontend attend usage_percent
        total_mb: Math.round(mem.total / 1024 / 1024),
        used_mb: Math.round(mem.used / 1024 / 1024),
        free_mb: Math.round(mem.free / 1024 / 1024),
        // Format lisible pour l'affichage
        total_human: `${Math.round(mem.total / 1024 / 1024 / 1024)} GB`,
        used_human: `${Math.round(mem.used / 1024 / 1024 / 1024)} GB`
      },
      load: {
        average: Math.round(loadAverage * 100) / 100,
        load_1: load.avgLoad || loadAverage,
        load_5: load.avgLoad || loadAverage,
        load_15: load.avgLoad || loadAverage,
        current_percent: Math.round(load.currentLoad || 0),
        cores: cpu.cores || 1
      },
      disk: mainDisk ? [{
        mount: mainDisk.mount,
        total: Math.round(mainDisk.size / 1024 / 1024 / 1024), // GB
        used: Math.round(mainDisk.used / 1024 / 1024 / 1024),  // GB
        available: Math.round((mainDisk.size - mainDisk.used) / 1024 / 1024 / 1024), // GB
        usage_percent: Math.round((mainDisk.used / mainDisk.size) * 100),
        usage: Math.round((mainDisk.used / mainDisk.size) * 100), // alias pour frontend
        // Format lisible
        total_human: `${Math.round(mainDisk.size / 1024 / 1024 / 1024)} GB`,
        used_human: `${Math.round(mainDisk.used / 1024 / 1024 / 1024)} GB`,
        available_human: `${Math.round((mainDisk.size - mainDisk.used) / 1024 / 1024 / 1024)} GB`
      }] : [],
      // Ajouter tous les disques pour référence
      all_disks: relevantDisks.map(d => ({
        mount: d.mount,
        total: Math.round(d.size / 1024 / 1024 / 1024),
        used: Math.round(d.used / 1024 / 1024 / 1024),
        usage_percent: Math.round((d.used / d.size) * 100)
      }))
    }

    console.log(`[SYSTEM] ✅ Métriques système collectées - CPU: ${systemMetrics.cpu.usage}%, Charge: ${systemMetrics.load.average}, Disque: ${systemMetrics.disk[0]?.usage_percent}%`)

    return systemMetrics

  } catch (error) {
    console.error('[METRICS] Erreur collecte métriques système:', error)
    return {}
  }
}

// ✅ OPTIMISATION: Fonction helper pour lire une ligne spécifique d'un fichier /proc avec streaming
async function readProcFileLine(filePath, searchPattern) {
  const readline = require('readline')
  const fs = require('fs')
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    
    rl.on('line', (line) => {
      if (line.match(searchPattern)) {
        rl.close()
        fileStream.close()
        resolve(line)
      }
    })
    
    rl.on('close', () => {
      resolve(null) // Ligne non trouvée
    })
    
    rl.on('error', (error) => {
      reject(error)
    })
  })
}

// ✅ OPTIMISATION: Fonction pour récupérer les statistiques réseau d'un conteneur avec streaming
async function getContainerNetworkStats(pid) {
  try {
    const fs = require('fs')
    const readline = require('readline')
    const netDevPath = `/host/proc/${pid}/net/dev`
    
    let totalRx = 0
    let totalTx = 0
    let lineCount = 0
    
    // ✅ OPTIMISATION: Utiliser streaming au lieu de lire tout le fichier
    const fileStream = fs.createReadStream(netDevPath, { encoding: 'utf8' })
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    
    for await (const line of rl) {
      lineCount++
      // Skip les 2 premières lignes (header)
      if (lineCount <= 2) continue
      
      if (!line.trim()) continue
      
      const parts = line.trim().split(/\s+/)
      if (parts.length < 10) continue
      
      const iface = parts[0].replace(':', '')
      if (iface === 'lo') continue // Skip loopback
      
      totalRx += parseInt(parts[1]) || 0 // RX bytes
      totalTx += parseInt(parts[9]) || 0 // TX bytes
    }
    
    return {
      rx: totalRx,
      tx: totalTx,
      rx_mb: totalRx / 1024 / 1024,
      tx_mb: totalTx / 1024 / 1024,
    }
  } catch (error) {
    // ENOENT = /host/proc non monté (ex: dev hors Docker), pas de log bruyant
    if (error.code !== 'ENOENT') {
      console.error(`[NETWORK] Erreur lecture réseau pour PID ${pid}:`, error.message)
    }
    return { rx: 0, tx: 0, rx_mb: 0, tx_mb: 0 }
  }
}

// Cache pour le calcul différentiel du CPU
let previousCpuStats = {}

// Fonction pour collecter les métriques des conteneurs depuis /proc natif ET Docker stats
async function collectContainerMetrics() {
  logIfVerbose('[CONTAINERS] === DÉBUT COLLECTE CONTENEURS ===')
  const containerMetrics = {}
  
  try {
    // ✅ OPTIMISATION: Utiliser l'instance Docker réutilisable au lieu d'en créer une nouvelle
    const fs = require('fs').promises
    
    // Lister uniquement les conteneurs du projet JobbingTrack (exclure lab-*, etc.)
    const allContainers = await docker.listContainers({ all: false })
    const containers = allContainers.filter(c => {
      const name = (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, '') : ''
      return isJobbingTrackContainer(name)
    })
    logIfVerbose(`[PROC] ${containers.length} conteneurs en cours d'exécution (${allContainers.length} total sur l'hôte, filtre JobbingTrack)`)
    
    // ✅ OPTIMISATION: Collecte parallèle avec limite de concurrence (max 5 conteneurs à la fois)
    const MAX_CONCURRENT = 5
    const collectContainerMetric = async (containerInfo) => {
      const containerId = containerInfo.Id.substring(0, 12)
      const containerName = containerInfo.Names[0].replace(/^\//, '')
      
      try {
        // Inspecter le conteneur pour obtenir le PID
        const container = docker.getContainer(containerInfo.Id)
        const inspect = await container.inspect()
        const pid = inspect.State.Pid
        
        if (!pid || pid === 0) {
          logIfVerbose(`[PROC] ${containerName}: PID non disponible (conteneur arrêté?)`)
          return null
        }
        
        // ✅ Récupérer les stats Docker pour le CPU
        const stats = await container.stats({ stream: false })
        
        // Calculer le CPU à partir des stats Docker
        let cpuPercent = 0
        if (stats.cpu_stats && stats.precpu_stats) {
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
          const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
          const numberCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1
          
          if (systemDelta > 0 && cpuDelta > 0) {
            cpuPercent = (cpuDelta / systemDelta) * numberCpus * 100
          }
        }
        
        // Mémoire : /host/proc si disponible, sinon fallback sur Docker stats
        let memoryMB = 0
        let memoryLimitMB = 2048
        const memoryLimit = inspect.HostConfig.Memory || 0
        const memoryLimitFromDocker = memoryLimit > 0 ? Math.round(memoryLimit / 1024 / 1024) : 2048

        try {
          const statusPath = `/host/proc/${pid}/status`
          const readline = require('readline')
          const fsSync = require('fs')
          let memoryKB = 0
          let vmsizeKB = 0
          const fileStream = fsSync.createReadStream(statusPath, { encoding: 'utf8' })
          const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })
          for await (const line of rl) {
            const vmrssMatch = line.match(/^VmRSS:\s+(\d+)\s+kB/)
            if (vmrssMatch) {
              memoryKB = parseInt(vmrssMatch[1])
              if (vmsizeKB > 0) break
              continue
            }
            const vmsizeMatch = line.match(/^VmSize:\s+(\d+)\s+kB/)
            if (vmsizeMatch) vmsizeKB = parseInt(vmsizeMatch[1])
            if (memoryKB > 0 && vmsizeKB > 0) break
          }
          fileStream.destroy()
          memoryMB = Math.round(memoryKB / 1024)
          const vmsizeMB = Math.round(vmsizeKB / 1024)
          memoryLimitMB = memoryLimitFromDocker || vmsizeMB || 2048
        } catch (procErr) {
          // /host/proc non monté ou PID invalide : utiliser les stats Docker
          if (procErr.code !== 'ENOENT') {
            console.error(`[PROC] ${containerName}: lecture /host/proc:`, procErr.message)
          }
          const mem = stats.memory_stats || {}
          const usage = mem.usage != null ? Number(mem.usage) : 0
          const limit = mem.limit != null ? Number(mem.limit) : memoryLimit
          memoryMB = Math.round(usage / 1024 / 1024)
          memoryLimitMB = limit > 0 ? Math.round(limit / 1024 / 1024) : memoryLimitFromDocker
        }

        const memoryPercent = memoryLimitMB > 0 ? (memoryMB / memoryLimitMB) * 100 : 0
        
        // ✅ Récupérer les statistiques réseau
        const networkStats = await getContainerNetworkStats(pid)
        const blkioEntries = Array.isArray(stats.blkio_stats?.io_service_bytes_recursive)
          ? stats.blkio_stats.io_service_bytes_recursive
          : []
        const blockReadBytes = blkioEntries
          .filter(entry => String(entry?.op || '').toLowerCase() === 'read')
          .reduce((sum, entry) => sum + Number(entry?.value || 0), 0)
        const blockWriteBytes = blkioEntries
          .filter(entry => String(entry?.op || '').toLowerCase() === 'write')
          .reduce((sum, entry) => sum + Number(entry?.value || 0), 0)
        
        const metrics = {
          cpu: {
            usage: parseFloat(Number(cpuPercent).toFixed(4)),
            percentage: parseFloat(Number(cpuPercent).toFixed(4)),
            lastUpdate: Date.now()
          },
          memory: {
            usage: memoryMB,
            limit: memoryLimitMB,
            percentage: parseFloat(Math.min(100, Math.max(0, Number(memoryPercent))).toFixed(4))
          },
          network: networkStats,
          blockIO: {
            read: Math.round(blockReadBytes),
            write: Math.round(blockWriteBytes)
          },
          status: inspect.State.Status || 'running',
          pid: pid
        }
        
        logIfVerbose(`[PROC] ${containerName}: CPU ${cpuPercent.toFixed(1)}%, Mémoire ${memoryMB}MB/${memoryLimitMB}MB (${memoryPercent.toFixed(1)}%)`)
        return { containerName, metrics }
        
      } catch (err) {
        if (err.statusCode === 404 || (err.message && err.message.includes('no such container'))) {
          return null
        }
        // ENOENT = /host/proc non monté ou PID invalide (ex: dev hors Docker), pas de log
        if (err.code === 'ENOENT') return null
        console.error(`[PROC] Erreur pour ${containerName}:`, err.message)
        return null
      }
    }
    
    // ✅ OPTIMISATION: Collecte parallèle avec limite de concurrence
    const results = []
    for (let i = 0; i < containers.length; i += MAX_CONCURRENT) {
      const batch = containers.slice(i, i + MAX_CONCURRENT)
      const batchResults = await Promise.all(batch.map(collectContainerMetric))
      results.push(...batchResults.filter(r => r !== null))
    }
    
    // Construire l'objet containerMetrics
    results.forEach(({ containerName, metrics }) => {
      containerMetrics[containerName] = metrics
    })
    
    logIfVerbose(`[CONTAINERS] ${Object.keys(containerMetrics).length} conteneurs collectés`)
    return containerMetrics
  } catch (error) {
    console.error('[METRICS] Erreur collecte conteneurs:', error.message)
    logIfVerbose('[CONTAINERS] === ERREUR COLLECTE CONTENEURS ===')
    return {}
  }
}

// Throttle: ne loguer l'indisponibilité de la source bas niveau qu'au plus toutes les 5 min
let lastMonitoringCUnavailableLog = 0
const MONITORING_C_LOG_INTERVAL_MS = 5 * 60 * 1000
// Fallback Docker coûteux: désactivé par défaut quand une source bas niveau est disponible.
// Mettre DOCKER_FALLBACK_INTERVAL_MS > 0 pour réactiver un enrichissement périodique.
const DOCKER_FALLBACK_INTERVAL_MS = Number(process.env.DOCKER_FALLBACK_INTERVAL_MS || 0)
let lastDockerFallbackCollectionAt = 0
// Throttle: limiter les health checks HTTP séquentiels trop fréquents
const SERVICE_HEALTH_CHECK_INTERVAL_MS = Number(process.env.SERVICE_HEALTH_CHECK_INTERVAL_MS || 30000)
const SERVICE_AVAILABILITY_PERSIST_INTERVAL_MS = Number(process.env.SERVICE_AVAILABILITY_PERSIST_INTERVAL_MS || 60000)
const AGGREGATOR_PERSIST_INTERVAL_MS = Number(process.env.AGGREGATOR_PERSIST_INTERVAL_MS || 60000)
const ENABLE_DOCKER_LOGS_COLLECTION = process.env.ENABLE_DOCKER_LOGS_COLLECTION === 'true'
const lastServiceAvailabilityPersistAt = new Map()
let lastAggregatorPersistAt = 0

/** Profilage durée par phase dans `collectAllMetrics` (logs JSON une ligne). Activer : METRICS_AGGREGATOR_PROFILE_COLLECT=1 */
function createCollectProfiler(enabled) {
  if (!enabled) {
    return {
      step() {},
      finish() {},
    }
  }
  const steps = []
  let last = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  return {
    step(name) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      steps.push([name, Math.round((now - last) * 100) / 100])
      last = now
    },
    finish(meta = {}) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      const tail = Math.round((now - last) * 100) / 100
      const ms = Object.fromEntries(steps)
      const accounted = steps.reduce((s, [, v]) => s + v, 0)
      console.log(
        '[PROFILE_COLLECT]',
        JSON.stringify({
          ...meta,
          phaseMs: ms,
          accountedMs: Math.round(accounted * 100) / 100,
          tailAfterLastStepMs: tail,
        })
      )
    },
  }
}

function monitoringSourceUrls() {
  return [
    process.env.MONITORING_AGENT_URL,
    process.env.MONITORING_C_URL || 'http://jobbingtrack-monitoring-c:8015'
  ].filter(Boolean)
}

function monitoringSourceName(url) {
  return url.includes('monitoring-agent-rs') ? 'monitoring-agent-rs' : 'monitoring-c'
}

function roundMetric(value, decimals = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const factor = 10 ** decimals
  return Math.round(number * factor) / factor
}

async function collectMetricsFromMonitoringSource() {
  const urls = monitoringSourceUrls()
  let lastError = null

  for (const url of urls) {
    const sourceName = monitoringSourceName(url)
    const data = await fetchMonitoringSource(url, sourceName)
    if (data) return data
    lastError = sourceName
  }

  if (lastError) logMonitoringSourceUnavailable(lastError)
  return null
}

async function fetchMonitoringSource(url, sourceName) {
  try {
    const response = await axios.get(`${url}/api/v1/metrics`, {
      timeout: 5000
    })
    if (response.data) {
      const containerCount = response.data.containers?.length || 0
      response.data.source = sourceName
      logIfVerbose(`[${sourceName}] Métriques récupérées: ${containerCount} conteneurs, CPU: ${response.data.avg_cpu_percent}%, Mem: ${response.data.avg_memory_percent}%`)
      return response.data
    }
    return null
  } catch (error) {
    logIfVerbose(`[${sourceName}] Non disponible: ${error.message}`)
    return null
  }
}

function logMonitoringSourceUnavailable(sourceName) {
  const now = Date.now()
  if (now - lastMonitoringCUnavailableLog < MONITORING_C_LOG_INTERVAL_MS) return
  lastMonitoringCUnavailableLog = now
  console.warn(`[${sourceName}] Non disponible (fallback Node actif)`)
}

// Fonction principale de collecte des métriques
async function collectAllMetrics() {
  const profileCollect =
    process.env.METRICS_AGGREGATOR_PROFILE_COLLECT === '1' ||
    process.env.METRICS_AGGREGATOR_PROFILE_COLLECT === 'true'
  const prof = createCollectProfiler(profileCollect)
  let monitoringCData = null
  let dockerFallbackRan = false
  let collectFatal = null

  logIfVerbose('[COLLECTOR] === DÉBUT COLLECTE ===')
  try {
    logIfVerbose('[COLLECTOR] Démarrage de la collecte des métriques...')

    // Essayer d'abord la source bas niveau configurée (Rust optionnel, C fallback).
    try {
      monitoringCData = await collectMetricsFromMonitoringSource()
    } catch (error) {
      console.warn('[COLLECTOR] Source monitoring bas niveau indisponible, utilisation de la collecte classique')
    }
    prof.step('monitoring_agent_http')

    // Découvrir les services
    const discoveredServices = await discoverServices()
    prof.step('discover_services')

    containerMetrics = {}

    // Collecter métriques système et conteneurs (fallback si la source bas niveau est indisponible)
    if (!monitoringCData) {
      await collectSystemMetrics()
      prof.step('collect_system_metrics_si')
      const collected = await collectContainerMetrics()
      if (collected && typeof collected === 'object') {
        Object.assign(containerMetrics, collected)
      }
      prof.step('collect_container_metrics_si')
    } else {
      logIfVerbose(`[COLLECTOR] Utilisation des données ${monitoringCData.source || 'monitoring'} pour enrichir les métriques`)
      if (monitoringCData.containers && Array.isArray(monitoringCData.containers)) {
        const filtered = monitoringCData.containers.filter(c => isJobbingTrackContainer(c.name || ''))
        logIfVerbose(`[COLLECTOR] Conversion de ${filtered.length} conteneurs depuis ${monitoringCData.source || 'monitoring'} (${monitoringCData.containers.length} reçus, filtre JobbingTrack)`)
        filtered.forEach(container => {
          const rawName = container.name || 'unknown'
          const containerName = rawName.startsWith('jobbingtrack-') ? rawName : `jobbingtrack-${rawName}`
          if (!containerMetrics[containerName]) {
            containerMetrics[containerName] = {}
          }
          
          containerMetrics[containerName] = {
            ...containerMetrics[containerName],
            cpu: {
              percentage: container.cpu_percent || 0,
              usage: container.cpu_percent || 0
            },
            memory: {
              usage: container.memory_mb || 0,
              limit: container.memory_limit_mb || 0,
              percentage: container.memory_percent || 0,
              usageMb: container.memory_mb || 0,
              limitMb: container.memory_limit_mb || 0
            },
            network: {
              rx: container.network_rx_bytes || 0,
              tx: container.network_tx_bytes || 0,
              rx_mb: container.network_rx_mb || (container.network_rx_bytes ? container.network_rx_bytes / (1024 * 1024) : 0),
              tx_mb: container.network_tx_mb || (container.network_tx_bytes ? container.network_tx_bytes / (1024 * 1024) : 0)
            },
            responseTimeMs: container.response_time_ms || null,
            httpStatus: container.http_status || 0
          }
        })
      }
      prof.step('merge_monitoring_c_container_rows')

      // Fallback coûteux: ne pas le faire à chaque cycle si une source bas niveau est déjà disponible.
      const now = Date.now()
      const shouldRunDockerFallback =
        DOCKER_FALLBACK_INTERVAL_MS > 0 &&
        (now - lastDockerFallbackCollectionAt) >= DOCKER_FALLBACK_INTERVAL_MS
      if (shouldRunDockerFallback) {
        dockerFallbackRan = true
        const dockerCollected = await collectContainerMetrics()
        if (dockerCollected && typeof dockerCollected === 'object') {
          Object.assign(containerMetrics, dockerCollected)
        }
        lastDockerFallbackCollectionAt = now
      }
      prof.step(dockerFallbackRan ? 'docker_fallback_collect_containers' : 'docker_fallback_skipped')
      
      // Enrichir systemMetrics avec les données de la source bas niveau.
      if (!systemMetrics) {
        systemMetrics = {}
      }
      
      systemMetrics.monitoringC = {
        avg_cpu_percent: monitoringCData.avg_cpu_percent || 0,
        avg_memory_percent: monitoringCData.avg_memory_percent || 0,
        avg_response_time_ms: monitoringCData.avg_response_time_ms || 0,
        container_count: monitoringCData.container_count || 0,
        load_score: monitoringCData.load_score || 0,
        availability_percent: monitoringCData.availability_percent || 0,
        // Ajouter les métriques réseau depuis la source bas niveau.
        network: monitoringCData.network || {
          total_rx_mb: 0,
          total_tx_mb: 0,
          total_mb: 0
        }
      }
      
      // Enrichir avec les métriques CPU, mémoire, disque depuis la source bas niveau.
      if (monitoringCData.cpu) {
        systemMetrics.cpu = {
          ...systemMetrics.cpu,
          load_1: monitoringCData.cpu.load_1,
          load_5: monitoringCData.cpu.load_5,
          load_15: monitoringCData.cpu.load_15,
          cores: monitoringCData.cpu.cores,
          usage_percent: monitoringCData.cpu.usage_percent || monitoringCData.avg_cpu_percent
        }
      }
      
      if (monitoringCData.memory) {
        systemMetrics.memory = {
          ...systemMetrics.memory,
          total_mb: monitoringCData.memory.total_mb,
          used_mb: monitoringCData.memory.used_mb,
          free_mb: monitoringCData.memory.free_mb,
          usage_percent: monitoringCData.memory.usage_percent || monitoringCData.avg_memory_percent
        }
      }
      
      if (monitoringCData.disk) {
        systemMetrics.disk = [{
          name: 'root',
          total: roundMetric(monitoringCData.disk.total_gb, 1),
          used: roundMetric(monitoringCData.disk.used_gb, 1),
          free: roundMetric(monitoringCData.disk.free_gb, 1),
          usage: roundMetric(monitoringCData.disk.usage_percent, 1),
          usage_percent: roundMetric(monitoringCData.disk.usage_percent, 1)
        }]
      }
      prof.step('merge_monitoring_c_system_fields')
    }

    // Tester la santé de chaque service (throttlé pour réduire la charge CPU/réseau)
    const now = Date.now()
    for (const [serviceName, serviceConfig] of Object.entries(discoveredServices)) {
      const prevService = servicesMetrics[serviceName]
      const prevHealth = prevService?.health
      const prevCheckMs = prevService?.lastCheck ? Date.parse(prevService.lastCheck) : 0
      const needsFreshHealthCheck =
        !prevHealth ||
        !Number.isFinite(prevCheckMs) ||
        (now - prevCheckMs) >= SERVICE_HEALTH_CHECK_INTERVAL_MS
      const health = needsFreshHealthCheck
        ? await testServiceHealth(serviceName, serviceConfig)
        : prevHealth

      servicesMetrics[serviceName] = {
        ...serviceConfig,
        name: serviceName,
        displayName: serviceName.replace('jobbingtrack-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        rawName: serviceName,
        health,
        status: health.status, // ✅ Ajouter le statut au niveau racine
        responseTimeMs: health.responseTimeMs, // ✅ Exposer le temps de réponse
        lastCheck: needsFreshHealthCheck ? new Date().toISOString() : (prevService?.lastCheck || new Date().toISOString()),
        metrics: containerMetrics[serviceName] || {}
      }
    }
    prof.step('service_health_checks')

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

    // ✅ OPTIMISATION : Calculer les métriques agrégées pour les conteneurs JobbingTrack (nom complet ou court)
    const jobbingtrackContainers = Object.entries(containerMetrics)
      .filter(([name]) => isJobbingTrackContainer(name))
    
    let totalCpuPercent = 0
    let totalMemoryUsed = 0
    let totalMemoryLimit = 0
    let containerCount = 0
    const cpuValues = []
    const memoryValues = []

    jobbingtrackContainers.forEach(([name, metrics]) => {
      if (metrics.cpu?.percentage) {
        totalCpuPercent += metrics.cpu.percentage
        cpuValues.push(metrics.cpu.percentage)
        containerCount++
      }
      if (metrics.memory?.usage && metrics.memory?.limit) {
        totalMemoryUsed += metrics.memory.usage
        totalMemoryLimit += metrics.memory.limit
        memoryValues.push(metrics.memory.usage)
      }
    })
    
    // ✅ Calculer les moyennes pour plus de précision
    const avgCpuPercent = cpuValues.length > 0 ? totalCpuPercent / cpuValues.length : 0
    const avgMemoryUsed = memoryValues.length > 0 ? totalMemoryUsed / memoryValues.length : 0
    const maxCpuPercent = cpuValues.length > 0 ? Math.max(...cpuValues) : 0
    const maxMemoryUsed = memoryValues.length > 0 ? Math.max(...memoryValues) : 0

    // ✅ Calculer les statistiques réseau agrégées
    let totalNetworkRx = 0;
    let totalNetworkTx = 0;
    let jobbingtrackNetworkRx = 0;
    let jobbingtrackNetworkTx = 0;
    
    allContainers.forEach(([name, metrics]) => {
      if (metrics.network?.rx && metrics.network?.tx) {
        totalNetworkRx += metrics.network.rx;
        totalNetworkTx += metrics.network.tx;
      }
    });
    
    jobbingtrackContainers.forEach(([name, metrics]) => {
      if (metrics.network?.rx && metrics.network?.tx) {
        jobbingtrackNetworkRx += metrics.network.rx;
        jobbingtrackNetworkTx += metrics.network.tx;
      }
    });

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
        },
        network: {
          total_rx: totalNetworkRx,
          total_tx: totalNetworkTx,
          total_rx_mb: Math.round(totalNetworkRx / 1024 / 1024 * 100) / 100,
          total_tx_mb: Math.round(totalNetworkTx / 1024 / 1024 * 100) / 100,
          total_mb: Math.round((totalNetworkRx + totalNetworkTx) / 1024 / 1024 * 100) / 100
        }
      }
      
      const systemMemoryMb = (systemMetrics.memory?.total_mb ?? systemMetrics.memory?.total ?? (Number(systemMetrics.memory?.used) + Number(systemMetrics.memory?.free))) || 0
      const percentOfSystem = systemMemoryMb > 0 ? Math.round((totalMemoryUsed / systemMemoryMb) * 100) : 0
      systemMetrics.jobbingtrack = {
        containers: {
          count: jobbingtrackContainers.length,
          cpu: {
            averagePercent: containerCount > 0 ? Math.round(avgCpuPercent * 10) / 10 : 0,
            totalPercent: Math.round(totalCpuPercent * 10) / 10,
            maxPercent: Math.round(maxCpuPercent * 10) / 10,
            minPercent: cpuValues.length > 0 ? Math.round(Math.min(...cpuValues) * 10) / 10 : 0
          },
          memory: {
            used: Math.round(totalMemoryUsed),
            limit: Math.round(totalMemoryLimit),
            percent: totalMemoryLimit > 0 ? Math.round((totalMemoryUsed / totalMemoryLimit) * 100) : 0,
            percent_of_system: percentOfSystem,
            averageUsed: Math.round(avgMemoryUsed),
            maxUsed: Math.round(maxMemoryUsed),
            minUsed: memoryValues.length > 0 ? Math.round(Math.min(...memoryValues)) : 0
          },
          network: {
            total_rx: jobbingtrackNetworkRx,
            total_tx: jobbingtrackNetworkTx,
            total_rx_mb: Math.round(jobbingtrackNetworkRx / 1024 / 1024 * 100) / 100,
            total_tx_mb: Math.round(jobbingtrackNetworkTx / 1024 / 1024 * 100) / 100,
            total_mb: Math.round((jobbingtrackNetworkRx + jobbingtrackNetworkTx) / 1024 / 1024 * 100) / 100
          },
          // ✅ Ajouter les métriques de disque Docker
          disk: systemMetrics.disk || []
        }
      }
    }

    // ✅ Calculer la disponibilité des services
    const totalServices = Object.keys(servicesMetrics).length;
    const healthyServices = Object.values(servicesMetrics).filter(s => s.status === 'healthy').length;
    const degradedServices = Object.values(servicesMetrics).filter(s => s.status === 'unhealthy' || s.status === 'degraded').length;
    const offlineServices = Object.values(servicesMetrics).filter(s => s.status === 'offline').length;
    
    const stackAvailability = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;
    const systemAvailability = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 100;

    // Score de santé système composite (pas seulement UP/DOWN des services)
    const cpuPercent = Number(systemMetrics.cpu?.usage_percent ?? systemMetrics.host?.cpu?.usagePercent ?? 0);
    const memoryPercent = Number(systemMetrics.memory?.usage_percent ?? systemMetrics.host?.memory?.usagePercent ?? 0);
    const diskPercent = Number(
      systemMetrics.disk?.[0]?.usage_percent ??
      systemMetrics.disk?.[0]?.usage ??
      systemMetrics.host?.disk?.usagePercent ??
      0
    );
    const responseTimes = Object.values(servicesMetrics)
      .map((svc) => Number(svc?.responseTimeMs || 0))
      .filter((v) => v > 0);
    const responseAvgMs = responseTimes.length > 0
      ? responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length
      : 0;

    const resourceHealth = Math.max(0, 100 - ((cpuPercent * 0.4) + (memoryPercent * 0.35) + (diskPercent * 0.25)));
    const latencyHealth = responseAvgMs <= 100 ? 100 : Math.max(0, 100 - ((responseAvgMs - 100) / 8));
    const compositeHealthScore = Math.round(
      (stackAvailability * 0.5) +
      (resourceHealth * 0.3) +
      (latencyHealth * 0.2)
    );
    
    logIfVerbose(`[COLLECTOR] Métriques collectées pour ${totalServices} services`)
    logIfVerbose(`[COLLECTOR] Disponibilité: ${healthyServices} sains, ${degradedServices} dégradés, ${offlineServices} hors ligne = ${stackAvailability}%`)
    logIfVerbose(`[COLLECTOR] JobbingTrack: ${jobbingtrackContainers.length} conteneurs, CPU avg: ${systemMetrics.jobbingtrack?.containers?.cpu?.averagePercent}%, Mémoire: ${systemMetrics.jobbingtrack?.containers?.memory?.percent}%`)
    
    // Normaliser les champs attendus par le frontend (usage_percent, disk[0].usage)
    if (systemMetrics.cpu && systemMetrics.cpu.usage !== undefined && systemMetrics.cpu.usage_percent === undefined) {
      systemMetrics.cpu.usage_percent = systemMetrics.cpu.usage
    }
    if (systemMetrics.memory && systemMetrics.memory.usage !== undefined && systemMetrics.memory.usage_percent === undefined) {
      systemMetrics.memory.usage_percent = systemMetrics.memory.usage
    }
    if (systemMetrics.memory && (systemMetrics.memory.used !== undefined || systemMetrics.memory.used_mb !== undefined)) {
      systemMetrics.memory.used_mb = systemMetrics.memory.used_mb ?? systemMetrics.memory.used
      systemMetrics.memory.total_mb = systemMetrics.memory.total_mb ?? systemMetrics.memory.total
    }
    if (systemMetrics.disk && systemMetrics.disk[0]) {
      if (systemMetrics.disk[0].usage_percent !== undefined && systemMetrics.disk[0].usage === undefined) {
        systemMetrics.disk[0].usage = systemMetrics.disk[0].usage_percent
      }
      if (systemMetrics.disk[0].usage !== undefined && systemMetrics.disk[0].usage_percent === undefined) {
        systemMetrics.disk[0].usage_percent = systemMetrics.disk[0].usage
      }
    }
    
    // Construire l'objet de métriques complet
    const metricsData = {
      containers: containerMetrics,
      system: {
        ...systemMetrics,
        availability: {
          stack: stackAvailability,
          system: systemAvailability,
          composite: compositeHealthScore
        }
      },
      services: servicesMetrics,
      // ✅ Ajouter les métriques agrégées de disponibilité
      health: {
        availability_percent: compositeHealthScore,
        system_availability_percent: systemAvailability,
        service_availability_percent: stackAvailability,
        resource_health_percent: Math.round(resourceHealth),
        latency_health_percent: Math.round(latencyHealth),
        healthy: healthyServices,
        degraded: degradedServices,
        offline: offlineServices,
        total: totalServices
      },
      // ✅ Temps de réponse agrégé (évite NaN si aucun service n’a de responseTimeMs)
      ...(function buildResponseTimeBlock() {
        const withRt = Object.values(servicesMetrics).filter(
          (s) => typeof s?.responseTimeMs === 'number' && s.responseTimeMs > 0
        );
        if (withRt.length === 0) {
          return {
            responseTime: {
              average_ms: null,
              fastest_ms: null,
              slowest_ms: null,
            },
          };
        }
        const vals = withRt.map((s) => s.responseTimeMs);
        const sum = vals.reduce((a, b) => a + b, 0);
        return {
          responseTime: {
            average_ms: sum / vals.length,
            fastest_ms: Math.min(...vals),
            slowest_ms: Math.max(...vals),
          },
        };
      })(),
      // ✅ Ajouter les erreurs (pour l'instant à 0, à implémenter plus tard)
      errors: {
        total_last_5m: 0,
        rate_per_min: 0
      },
      // Ajouter le réseau depuis la source bas niveau en priorité, puis containersAggregate.
      network: monitoringCData?.network || 
               systemMetrics.containersAggregate?.network || {
        total_rx_mb: 0,
        total_tx_mb: 0,
        total_mb: 0
      },
      // ✅ Ajouter la liste des services pour compatibilité frontend
      servicesList: Object.values(servicesMetrics),
      timestamp: new Date().toISOString()
    }
    prof.step('aggregate_build_metrics_payload')

    lastMetricsData = metricsData

    // Exporter vers /tmp/metrics/latest.json (partage avec l'hôte)
    try {
      const fs = require('fs').promises
      const exportPath = '/tmp/metrics/latest.json'
      await fs.writeFile(exportPath, JSON.stringify(metricsData), 'utf8')
      console.log(`[EXPORT] Métriques exportées vers ${exportPath}`)
    } catch (err) {
      console.error('[EXPORT] Erreur export /tmp/metrics:', err.message)
    }
    prof.step('export_json_latest')

    // La source bas niveau persiste déjà les snapshots fins ; l'agrégateur garde une cadence plus basse.
    const shouldPersistAggregator = (Date.now() - lastAggregatorPersistAt) >= AGGREGATOR_PERSIST_INTERVAL_MS
    if (shouldPersistAggregator) try {
      // Priorité aux données de la source bas niveau si disponibles.
      const cpuPercent = monitoringCData?.avg_cpu_percent || 
                        systemMetrics.monitoringC?.avg_cpu_percent ||
                        systemMetrics.host?.cpu?.usagePercent || 
                        systemMetrics.jobbingtrack?.containers?.cpu?.averagePercent || 
                        systemMetrics.cpu?.usage_percent || 0;
      
      const memoryPercent = monitoringCData?.avg_memory_percent ||
                           systemMetrics.monitoringC?.avg_memory_percent ||
                           systemMetrics.host?.memory?.usagePercent || 
                           systemMetrics.jobbingtrack?.containers?.memory?.percent || 
                           systemMetrics.memory?.usage_percent || 0;
      
      const loadScore = monitoringCData?.load_score || 
                       systemMetrics.monitoringC?.load_score ||
                       parseFloat((((cpuPercent / 100) + (memoryPercent / 100)) / 2).toFixed(3));
      
      const responseTimeAvg = monitoringCData?.avg_response_time_ms ||
                             systemMetrics.monitoringC?.avg_response_time_ms ||
                             metricsData.responseTime?.average_ms || null;
      
      const availabilityPercent = monitoringCData?.availability_percent ||
                                 systemMetrics.monitoringC?.availability_percent ||
                                 compositeHealthScore;
      
      // Préparer les métriques système pour la sauvegarde (entiers pour BigInt)
      const memUsed = Math.round(Number(systemMetrics.memory?.used_mb ?? systemMetrics.memory?.used ?? 0));
      const memTotal = Math.round(Number(systemMetrics.memory?.total_mb ?? systemMetrics.memory?.total ?? 0));
      const memFree = Math.round(Number(systemMetrics.memory?.free_mb ?? systemMetrics.memory?.free ?? 0));
      const systemMetricsForDb = {
        ...systemMetrics,
        cpu: {
          ...systemMetrics.cpu,
          usage: cpuPercent,
          percent: cpuPercent,
          usagePercent: cpuPercent
        },
        memory: {
          ...systemMetrics.memory,
          usage: memoryPercent,
          percent: memoryPercent,
          usagePercent: memoryPercent,
          used: memUsed,
          total: memTotal,
          free: memFree
        },
        load: {
          average: systemMetrics.cpu?.load_1 || 0,
          [0]: systemMetrics.cpu?.load_1 || 0,
          [1]: systemMetrics.cpu?.load_5 || 0,
          [2]: systemMetrics.cpu?.load_15 || 0
        },
        network: {
          rx: Math.round(Number(metricsData.network?.total_rx_mb ?? 0) * 1024 * 1024) || 0,
          tx: Math.round(Number(metricsData.network?.total_tx_mb ?? 0) * 1024 * 1024) || 0
        }
      }
      
      // Sauvegarder les métriques système avec les valeurs calculées
      await persistenceService.saveSystemMetricsSnapshot(systemMetricsForDb, {
        availabilityPercent: availabilityPercent,
        loadScore: loadScore,
        errorCount: metricsData.errors?.total_last_5m || 0,
        errorRate: metricsData.errors?.rate_per_min || 0,
        responseTimeAvg: responseTimeAvg
      })
      
      // Sauvegarder les métriques des conteneurs (source bas niveau ou collecte classique).
      // Convertir les métriques bas niveau au format attendu par persistenceService.
      const containersForDb = {}
      
      // Si on a des données bas niveau, les utiliser en priorité.
      if (monitoringCData && monitoringCData.containers && Array.isArray(monitoringCData.containers)) {
        const toSave = monitoringCData.containers.filter(c => isJobbingTrackContainer(c.name || ''))
        logIfVerbose(`[PERSISTENCE] Préparation de ${toSave.length} conteneurs depuis ${monitoringCData.source || 'monitoring'} pour sauvegarde (${monitoringCData.containers.length} reçus, filtre JobbingTrack)`)
        toSave.forEach(container => {
          const asNum = (...vals) => {
            for (const v of vals) {
              const n = Number(v)
              if (Number.isFinite(n)) return n
            }
            return 0
          }
          const containerName = container.name || 'unknown'
          const memMb = Number(container.memory_mb) || 0
          const limitMb = Number(container.memory_limit_mb) || 0
          const blockReadBytes = asNum(
            container.block_read_bytes,
            container.block_io_read_bytes,
            container.blkio_read_bytes,
            container.io_read_bytes,
            container.block_read,
            container.blkio_read
          )
          const blockWriteBytes = asNum(
            container.block_write_bytes,
            container.block_io_write_bytes,
            container.blkio_write_bytes,
            container.io_write_bytes,
            container.block_write,
            container.blkio_write
          )
          containersForDb[containerName] = {
            cpu: {
              percentage: container.cpu_percent || 0,
              usage: container.cpu_percent || 0
            },
            memory: {
              usage: Math.round(memMb * 1024 * 1024),
              limit: Math.round(limitMb * 1024 * 1024),
              percentage: container.memory_percent || 0
            },
            network: {
              rx: Math.round(Number(container.network_rx_bytes) || 0),
              tx: Math.round(Number(container.network_tx_bytes) || 0)
            },
            blockIO: {
              read: Math.round(blockReadBytes),
              write: Math.round(blockWriteBytes)
            },
            status: container.http_status === 200 ? 'running' : 'unknown'
          }
        })
      }
      
      // Fusionner avec les métriques collectées classiquement (si disponibles), uniquement JobbingTrack
      Object.keys(containerMetrics).forEach(name => {
        if (!isJobbingTrackContainer(name)) return
        const incoming = containerMetrics[name] || {}
        const existing = containersForDb[name] || {}
        containersForDb[name] = {
          ...existing,
          ...incoming,
          cpu: {
            ...(existing.cpu || {}),
            ...(incoming.cpu || {})
          },
          memory: {
            ...(existing.memory || {}),
            ...(incoming.memory || {})
          },
          network: {
            ...(existing.network || {}),
            ...(incoming.network || {})
          },
          blockIO: {
            ...(existing.blockIO || {}),
            ...(incoming.blockIO || {})
          }
        }
      })
      
      logIfVerbose(`[PERSISTENCE] Sauvegarde de ${Object.keys(containersForDb).length} conteneurs en BDD`)
      await persistenceService.saveMultipleContainerMetrics(containersForDb)
      
      // Sauvegarder la disponibilité des services (silencieux si table absente)
      const persistAvailabilityNow = Date.now()
      for (const [serviceName, serviceData] of Object.entries(servicesMetrics)) {
        const lastPersistAt = lastServiceAvailabilityPersistAt.get(serviceName) || 0
        if (persistAvailabilityNow - lastPersistAt < SERVICE_AVAILABILITY_PERSIST_INTERVAL_MS) {
          continue
        }
        await persistenceService.saveServiceAvailability(serviceName, {
          isAvailable: serviceData.health?.status === 'healthy',
          responseTimeMs: serviceData.health?.responseTime || null,
          statusCode: serviceData.health?.statusCode || null,
          errorMessage: serviceData.health?.error || null,
        }).catch(err => {
          const msg = (err && err.message) ? String(err.message) : '';
          if (msg && !msg.includes('does not exist') && !msg.includes('service_availability_history')) {
            console.error(`[PERSISTENCE] Échec disponibilité ${serviceName}:`, msg);
          }
        });
        lastServiceAvailabilityPersistAt.set(serviceName, persistAvailabilityNow)
      }
      
      logIfVerbose('[PERSISTENCE] ✅ Métriques persistées avec succès')
      lastAggregatorPersistAt = Date.now()
    } catch (error) {
      console.error('[PERSISTENCE] ❌ Erreur persistance:', error.message)
    }
    prof.step('persistence_db')

    logIfVerbose('[COLLECTOR] === FIN COLLECTE ===')

    // Émettre les métriques via WebSocket
    io.emit('metrics-update', {
      services: servicesMetrics,
      system: systemMetrics,
      containers: containerMetrics,
      timestamp: new Date().toISOString()
    })
    prof.step('websocket_emit')
  } catch (error) {
    collectFatal = error
    console.error('[COLLECTOR] Erreur lors de la collecte:', error)
    logIfVerbose('[COLLECTOR] === ERREUR COLLECTE ===')
  } finally {
    const svcN = servicesMetrics && typeof servicesMetrics === 'object' ? Object.keys(servicesMetrics).length : 0
    const ctrN = containerMetrics && typeof containerMetrics === 'object' ? Object.keys(containerMetrics).length : 0
    prof.finish({
      ok: !collectFatal,
      error: collectFatal ? String(collectFatal.message || collectFatal) : null,
      monitoringC: Boolean(monitoringCData),
      dockerFallbackRan,
      servicesCount: svcN,
      containersCount: ctrN,
    })
  }
}

// Fonction de collecte des logs Docker
async function collectDockerLogs() {
  try {
    console.log('[LOGS] === DÉBUT COLLECTE LOGS ===')
    
    const allLogs = await dockerLogsService.getAllJobbingTrackLogs({
      tail: 50, // Dernières 50 lignes de chaque conteneur
      since: Math.floor(Date.now() / 1000) - 600, // Dernières 10 minutes
    })
    
    for (const [containerName, logs] of Object.entries(allLogs)) {
      if (logs.length > 0) {
        const containerId = logs[0]?.containerId || null
        await persistenceService.saveContainerLogs(containerName, containerId, logs)
          .catch(err => console.error(`[LOGS] Échec sauvegarde logs ${containerName}:`, err.message))
      }
    }
    
    console.log('[LOGS] === FIN COLLECTE LOGS ===')
  } catch (error) {
    console.error('[LOGS] Erreur collecte logs:', error.message)
  }
}

// Import des routes et services
const dockerRoutes = require('./routes/docker.routes')
const persistenceRoutes = require('./routes/persistence.routes')
const persistenceService = require('./services/persistence.service')
const dockerLogsService = require('./services/docker-logs.service')

// Routes API — /health pour monitoring-c (collecteur appelle GET /health), /api/v1/health pour docker healthcheck
const healthPayload = (req, res) => {
  const startTime = Date.now()
  res.json({
    status: 'online',
    service: 'jobbingtrack-metrics-aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  })
}
app.get('/health', healthPayload)
app.get('/api/v1/health', healthPayload)

// Routes Docker (métriques directes depuis Docker)
app.use('/api/v1/docker', authenticateMetrics, dockerRoutes)

// Routes Persistence (accès aux données historiques)
app.use('/api/v1/persistence', authenticateMetrics, persistenceRoutes)

app.get('/api/v1/metrics', authenticateMetrics, (req, res) => {
  if (lastMetricsData) {
    return res.json(lastMetricsData)
  }
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
try {
  const fs = require('fs')
  const procMounted = fs.existsSync('/host/proc/self')
  console.log('[SERVER] /host/proc monté:', procMounted ? 'oui (métriques par conteneur depuis /proc)' : 'non (fallback Docker stats)')
} catch (e) { console.log('[SERVER] /host/proc: non disponible') }
console.log(
  '[SERVER] Source monitoring prioritaire:',
  process.env.MONITORING_AGENT_URL || process.env.MONITORING_C_URL || 'http://monitoring-c:8015'
)

// Collecte immédiate au démarrage
collectAllMetrics()
if (ENABLE_DOCKER_LOGS_COLLECTION) {
  collectDockerLogs()
}

// Collecte des métriques (configurable): défaut 15 secondes pour limiter la charge continue
const metricsCollectionIntervalSec = Math.max(5, Number(process.env.METRICS_COLLECTION_INTERVAL_SECONDS || '15'))
const metricsCollectionCron = `*/${metricsCollectionIntervalSec} * * * * *`
cron.schedule(metricsCollectionCron, collectAllMetrics)
console.log(`[SERVER] ✅ Collecte métriques planifiée: toutes les ${metricsCollectionIntervalSec}s`)
if (
  process.env.METRICS_AGGREGATOR_PROFILE_COLLECT === '1' ||
  process.env.METRICS_AGGREGATOR_PROFILE_COLLECT === 'true'
) {
  console.log('[SERVER] Profilage collecte: METRICS_AGGREGATOR_PROFILE_COLLECT → ligne JSON [PROFILE_COLLECT] à chaque cycle')
}

// Collecte Docker logs désactivée par défaut: log-collector-c est la source dédiée.
if (ENABLE_DOCKER_LOGS_COLLECTION) {
  cron.schedule('*/2 * * * *', collectDockerLogs)
}

// Nettoyage des anciennes données tous les jours à 3h du matin
cron.schedule('0 3 * * *', async () => {
  console.log('[CLEANUP] Démarrage du nettoyage des anciennes données...')
  try {
    const deleted = await persistenceService.cleanOldData(30) // Garder 30 jours
    console.log(`[CLEANUP] ✅ ${deleted} enregistrements supprimés`)
  } catch (error) {
    console.error('[CLEANUP] ❌ Erreur nettoyage:', error.message)
  }
})

const PORT = process.env.PORT || 3014
server.listen(PORT, () => {
  console.log(`[SERVER] ✅ Service démarré sur le port ${PORT}`)
  console.log(`[SERVER] ✅ WebSocket activé pour les clients`)
  console.log(`[SERVER] ✅ Collecte métriques: toutes les ${metricsCollectionIntervalSec} secondes`)
  console.log(`[SERVER] ✅ Collecte logs Docker aggregator: ${ENABLE_DOCKER_LOGS_COLLECTION ? 'activée toutes les 2 minutes' : 'désactivée (log-collector-c)'}`)
  console.log(`[SERVER] ✅ Nettoyage automatique: tous les jours à 3h`)
})

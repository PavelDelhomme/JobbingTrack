const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const cron = require('node-cron');

const cadvisorCollector = require('./collectors/cadvisor');
const dockerCollector = require('./collectors/docker');
const systemCollector = require('./collectors/system');
const metricsRoutes = require('./routes/metrics');
const WebSocketHandler = require('./websocket/handler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3014;
const CADVISOR_URL = process.env.CADVISOR_URL || 'http://cadvisor:8080';

// Middleware
app.use(cors());
app.use(express.json());

// Stockage des métriques en mémoire
global.metricsCache = {
  containers: new Map(),
  system: {},
  timestamp: null
};

// ============================================
// ROUTES REST API
// ============================================
app.use('/api/v1/metrics', metricsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    containers: global.metricsCache.containers.size
  });
});

// ============================================
// WEBSOCKET POUR TEMPS RÉEL
// ============================================
const wsHandler = new WebSocketHandler(wss);
wsHandler.setup();

// Broadcast aux clients WebSocket
function broadcastMetrics(data) {
  wsHandler.broadcastUpdate();
}

// ============================================
// COLLECTE DES MÉTRIQUES
// ============================================
async function collectAndBroadcast() {
  try {
    console.log('[Metrics] Collecte des métriques...');

    // 1. Collecter depuis cAdvisor (prioritaire)
    let containerMetrics;
    try {
      containerMetrics = await cadvisorCollector.collect(CADVISOR_URL);
      console.log(`[Metrics] ${containerMetrics.size} conteneurs depuis cAdvisor`);
    } catch (err) {
      console.error('[Metrics] Erreur cAdvisor, fallback Docker API:', err.message);
      // Fallback sur Docker API
      containerMetrics = await dockerCollector.collect();
    }

    // 2. Collecter métriques système
    const systemMetrics = await systemCollector.collect();

    // 3. Mettre à jour le cache
    global.metricsCache = {
      containers: containerMetrics,
      system: systemMetrics,
      timestamp: new Date().toISOString()
    };

    // 4. Broadcaster aux clients WebSocket
    broadcastMetrics({
      containers: Array.from(containerMetrics.values()),
      system: systemMetrics,
      timestamp: global.metricsCache.timestamp
    });

    console.log('[Metrics] Collecte terminée');
  } catch (err) {
    console.error('[Metrics] Erreur collecte:', err);
  }
}

// ============================================
// TÂCHES PLANIFIÉES
// ============================================

// Collecte toutes les 5 secondes
cron.schedule('*/5 * * * * *', () => {
  collectAndBroadcast();
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
server.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   Metrics Aggregator Service - JobbingTrack           ║
╠════════════════════════════════════════════════════════╣
║  HTTP Server:  http://localhost:${PORT}                     ║
║  WebSocket:    ws://localhost:${PORT}                       ║
║  cAdvisor URL: ${CADVISOR_URL}                 ║
╚════════════════════════════════════════════════════════╝
  `);

  // Collecte initiale
  await collectAndBroadcast();
  console.log('[Metrics] Service prêt !');
});

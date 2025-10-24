const http = require('http');

const PORT = process.env.PORT || 3007;

console.log(`🚀 Démarrage du dashboard-service sur le port ${PORT}...`);

const server = http.createServer();

server.on('request', (req, res) => {
  console.log(`📡 REQUEST: ${req.method} ${req.url} de ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  console.log(`🔍 URL: ${req.url}`);
  console.log(`📝 Headers: ${JSON.stringify(req.headers)}`);

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    console.log(`📡 /health appelé`);
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'OK',
      service: 'dashboard-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      port: PORT
    }));
  } else if (req.url === '/test') {
    console.log(`📡 /test appelé`);
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Test endpoint fonctionne'
    }));
  } else {
    console.log(`🚨 Route non trouvée: ${req.method} ${req.url}`);
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Route not found',
      method: req.method,
      path: req.url,
      availableRoutes: ['/health', '/test']
    }));
  }
});

server.on('connection', (socket) => {
  console.log(`🔗 Nouvelle connexion de ${socket.remoteAddress}:${socket.remotePort}`);
});

server.on('error', (error) => {
  console.error(`❌ Erreur serveur:`, error);
});

server.listen(PORT, () => {
  const address = server.address();
  console.log(`✅ dashboard-service démarré avec succès sur le port ${PORT}`);
  console.log(`🌐 Service accessible sur http://${address.address}:${address.port}`);
  console.log(`🔗 Mapping externe: localhost:3007 -> container:${PORT}`);
  console.log(`📊 Adresse d'écoute: ${JSON.stringify(address)}`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

console.log('📋 Serveur HTTP natif configuré et en cours d\'écoute...');

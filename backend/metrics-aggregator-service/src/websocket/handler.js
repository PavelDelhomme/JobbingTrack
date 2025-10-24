/**
 * Gestionnaire WebSocket pour les connexions temps réel
 */

class WebSocketHandler {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Set();
  }

  // Configuration des événements WebSocket
  setup() {
    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
  }

  // Gestion d'une nouvelle connexion
  handleConnection(ws) {
    console.log('[WebSocket] Client connecté');
    this.clients.add(ws);

    // Envoyer les données initiales
    this.sendInitialData(ws);

    // Configurer les événements du client
    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Erreur:', error);
      this.clients.delete(ws);
    });
  }

  // Envoyer les données initiales au client
  sendInitialData(ws) {
    const initialData = {
      type: 'initial',
      data: {
        containers: Array.from(global.metricsCache.containers.values()),
        system: global.metricsCache.system,
        timestamp: global.metricsCache.timestamp
      }
    };

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(initialData));
    }
  }

  // Gestion des messages du client
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      switch (data.command) {
        case 'refresh':
          this.broadcastUpdate();
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.log('[WebSocket] Commande inconnue:', data.command);
      }
    } catch (err) {
      console.error('[WebSocket] Erreur parsing message:', err);
    }
  }

  // Gestion de la déconnexion
  handleDisconnection(ws) {
    console.log('[WebSocket] Client déconnecté');
    this.clients.delete(ws);
  }

  // Broadcast des métriques mises à jour à tous les clients
  broadcastUpdate() {
    const updateData = {
      type: 'update',
      data: {
        containers: Array.from(global.metricsCache.containers.values()),
        system: global.metricsCache.system,
        timestamp: global.metricsCache.timestamp
      }
    };

    const message = JSON.stringify(updateData);

    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  }

  // Obtenir le nombre de clients connectés
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Fermer toutes les connexions
  closeAll() {
    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.close();
      }
    });
    this.clients.clear();
  }
}

module.exports = WebSocketHandler;

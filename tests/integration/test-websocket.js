const WebSocket = require('ws');

// Test de connexion WebSocket au service metrics-aggregator
const ws = new WebSocket('ws://localhost:3015');

console.log('[TEST] Connexion WebSocket en cours...');

ws.on('open', () => {
  console.log('[TEST] ✅ WebSocket connecté !');

  // Envoyer un message de test
  ws.send(JSON.stringify({ command: 'refresh' }));
  console.log('[TEST] Message de refresh envoyé');

  // Attendre 2 secondes puis fermer
  setTimeout(() => {
    console.log('[TEST] Fermeture de la connexion...');
    ws.close();
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('[TEST] 📊 Message reçu:', message.type);
    if (message.data) {
      console.log('[TEST] Données système:', {
        cpu: message.data.system?.cpu?.percent + '%',
        memory: message.data.system?.memory?.percent + '%',
        containers: message.data.containers?.length || 0
      });
    }
  } catch (err) {
    console.log('[TEST] Message brut:', data.toString());
  }
});

ws.on('close', () => {
  console.log('[TEST] WebSocket fermé');
});

ws.on('error', (err) => {
  console.error('[TEST] ❌ Erreur WebSocket:', err.message);
});
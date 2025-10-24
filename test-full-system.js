const WebSocket = require('ws');
const http = require('http');

// Test du système complet
async function testFullSystem() {
  console.log('🧪 TEST COMPLET DU SYSTÈME DE MÉTRIQUES');
  console.log('=====================================');

  // 1. Test API REST
  console.log('\n📡 Test API REST:');
  try {
    const response = await new Promise((resolve, reject) => {
      http.get('http://localhost:3014/health', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      }).on('error', reject);
    });
    console.log('✅ API Health:', response.data);
  } catch (err) {
    console.log('❌ API Health:', err.message);
  }

  // 2. Test Métriques système
  console.log('\n📊 Test Métriques système:');
  try {
    const response = await new Promise((resolve, reject) => {
      http.get('http://localhost:3014/api/v1/metrics', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      }).on('error', reject);
    });
    const metrics = response.data;
    console.log('✅ CPU:', metrics.system?.cpu?.percent + '%', metrics.system?.cpu?.cores + ' cœurs');
    console.log('✅ Mémoire:', metrics.system?.memory?.percent + '%', `(${Math.round(metrics.system?.memory?.used / 1024)}GB/${Math.round(metrics.system?.memory?.total / 1024)}GB)`);
    console.log('✅ Conteneurs:', metrics.containers?.length || 0);
  } catch (err) {
    console.log('❌ Métriques système:', err.message);
  }

  // 3. Test WebSocket
  console.log('\n🔌 Test WebSocket:');
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3014');
    let connected = false;
    let receivedData = false;

    ws.on('open', () => {
      console.log('✅ WebSocket connecté');
      connected = true;
      ws.send(JSON.stringify({ command: 'refresh' }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'initial' || message.type === 'update') {
          console.log('✅ Données reçues:', {
            cpu: message.data.system?.cpu?.percent + '%',
            memory: message.data.system?.memory?.percent + '%',
            containers: message.data.containers?.length || 0
          });
          receivedData = true;
        }
      } catch (err) {
        console.log('⚠️ Message non-JSON:', data.toString().substring(0, 100));
      }
    });

    ws.on('error', (err) => {
      console.log('❌ WebSocket erreur:', err.message);
    });

    setTimeout(() => {
      if (connected && receivedData) {
        console.log('✅ WebSocket fonctionne parfaitement');
      } else if (connected) {
        console.log('⚠️ WebSocket connecté mais pas de données');
      } else {
        console.log('❌ WebSocket non connecté');
      }
      ws.close();
      resolve();
    }, 3000);
  });
}

testFullSystem().then(() => {
  console.log('\n🎉 TEST TERMINÉ');
});

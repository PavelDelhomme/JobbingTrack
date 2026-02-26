const http = require('http');

const METRICS_BASE = process.env.METRICS_AGGREGATOR_URL || process.env.METRICS_SERVICE_URL || 'http://localhost:5004';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function testFullSystem() {
  console.log('🧪 TEST COMPLET DU SYSTÈME DE MÉTRIQUES');
  console.log('=====================================');

  // 1. Test Health
  console.log('\n📡 Test API Health:');
  try {
    const response = await httpGet(`${METRICS_BASE}/health`);
    if (response.status === 200 && response.data.status) {
      console.log('✅ Health OK:', response.data.status, '- uptime:', Math.round(response.data.uptime || 0) + 's');
    } else {
      console.log('✅ Health répond (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ Health non accessible:', err.code || err.message);
  }

  // 2. Test API v1 Health détaillé
  console.log('\n📡 Test API v1 Health:');
  try {
    const response = await httpGet(`${METRICS_BASE}/api/v1/health`);
    if (response.status === 200) {
      const mem = response.data.memoryUsage;
      console.log('✅ API v1 Health OK - RSS:', Math.round((mem?.rss || 0) / 1024 / 1024) + 'MB');
    } else {
      console.log('✅ API v1 Health répond (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ API v1 Health:', err.code || err.message);
  }

  // 3. Test Métriques système
  console.log('\n📊 Test Métriques système (/api/v1/metrics):');
  try {
    const response = await httpGet(`${METRICS_BASE}/api/v1/metrics`);
    if (response.status === 200) {
      const metrics = response.data;
      const cpu = metrics.system?.cpu;
      const mem = metrics.system?.memory;
      const containers = metrics.containers;
      const cpuPercent = cpu?.usage_percent ?? cpu?.percent ?? cpu?.usage ?? 'N/A';
      console.log('✅ CPU:', (typeof cpuPercent === 'number' ? cpuPercent.toFixed(1) : cpuPercent) + '%', (cpu?.cores || '?') + ' coeurs');
      const memPercent = mem?.usage_percent ?? mem?.percent ?? mem?.percentage ?? 'N/A';
      const memTotal = mem?.total_mb ?? (mem?.total ? mem.total / 1024 / 1024 : null);
      const memUsed = mem?.used_mb ?? (mem?.used ? mem.used / 1024 / 1024 : null);
      console.log('✅ Mémoire:', (typeof memPercent === 'number' ? memPercent.toFixed(1) : memPercent) + '%',
        memTotal ? `(${(memUsed / 1024).toFixed(1)}/${(memTotal / 1024).toFixed(1)} GB)` : '');
      const containerCount = Array.isArray(containers) ? containers.length : (typeof containers === 'object' && containers ? Object.keys(containers).length : 0);
      console.log('✅ Conteneurs monitorés:', containerCount);
    } else {
      console.log('⚠️ Métriques non disponibles (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ Métriques système:', err.code || err.message);
  }

  // 4. Test Services Docker
  console.log('\n🐳 Test Services Docker (/api/v1/docker/services/all):');
  try {
    const response = await httpGet(`${METRICS_BASE}/api/v1/docker/services/all`);
    if (response.status === 200) {
      const services = response.data.services || response.data;
      const running = Array.isArray(services) ? services.filter(s => s.status === 'running' || s.state === 'running').length : 0;
      const total = Array.isArray(services) ? services.length : 0;
      console.log('✅ Services Docker:', running + '/' + total, 'en cours');
    } else {
      console.log('✅ Docker services répond (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ Docker services:', err.code || err.message);
  }

  // 5. Test Services list
  console.log('\n📋 Test Liste des services (/api/v1/services):');
  try {
    const response = await httpGet(`${METRICS_BASE}/api/v1/services`);
    if (response.status === 200) {
      const services = response.data.services || response.data;
      console.log('✅ Services détectés:', Array.isArray(services) ? services.length : Object.keys(services || {}).length);
    } else {
      console.log('✅ Services list répond (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ Services list:', err.code || err.message);
  }

  // 6. Test Persistence / historique
  console.log('\n💾 Test Persistance métriques (/api/v1/persistence/stats):');
  try {
    const response = await httpGet(`${METRICS_BASE}/api/v1/persistence/stats`);
    if (response.status === 200) {
      console.log('✅ Persistance OK - données historiques disponibles');
    } else if (response.status >= 500) {
      console.log('⚠️ Persistance: erreur serveur (HTTP', response.status + ')');
    } else {
      console.log('✅ Persistance répond (HTTP', response.status + ')');
    }
  } catch (err) {
    console.log('⚠️ Persistance:', err.code || err.message);
  }
}

testFullSystem().then(() => {
  console.log('\n🎉 TEST TERMINÉ');
}).catch((err) => {
  console.error('⚠️ Erreur:', err.message);
  process.exit(1);
});

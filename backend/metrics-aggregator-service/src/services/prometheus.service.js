const axios = require('axios');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

// ============================================
// MÉTRIQUES SYSTÈME HÔTE (via Node Exporter)
// ============================================

async function getSystemMetrics() {
  try {
    const queries = {
      // CPU
      cpu_cores: 'count(node_cpu_seconds_total{mode="idle"})',
      cpu_usage_percent: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
      
      // Mémoire
      memory_total_bytes: 'node_memory_MemTotal_bytes',
      memory_available_bytes: 'node_memory_MemAvailable_bytes',
      memory_used_bytes: 'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes',
      memory_used_percent: '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))',
      
      // Disque
      disk_total_bytes: 'node_filesystem_size_bytes{mountpoint="/"}',
      disk_used_bytes: 'node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}',
      disk_used_percent: '100 * (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}))',
      
      // Load average
      load_1min: 'node_load1',
      load_5min: 'node_load5',
      load_15min: 'node_load15'
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      
      const data = response.data.data.result;
      results[key] = data.length > 0 ? parseFloat(data[0].value[1]) : null;
    }

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error fetching system metrics:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// MÉTRIQUES CONTENEURS JOBBINGTRACK UNIQUEMENT
// ============================================

async function getJobbingTrackContainersMetrics() {
  try {
    // Filtre UNIQUEMENT les conteneurs du projet JobbingTrack
    const projectLabel = 'com.docker.compose.project';
    const projectName = 'jobbingtrack'; // OU récupère dynamiquement depuis env
    
    const queries = {
      // CPU par conteneur (filtré JobbingTrack)
      cpu_usage: `sum by (name, container_label_${projectLabel.replace(/\./g, '_')}) (rate(container_cpu_usage_seconds_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m]))`,
      
      // Mémoire par conteneur
      memory_usage: `container_memory_usage_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}`,
      memory_limit: `container_spec_memory_limit_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}`,
      
      // Réseau par conteneur
      network_rx: `rate(container_network_receive_bytes_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m])`,
      network_tx: `rate(container_network_transmit_bytes_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m])`,
      
      // Filesystem par conteneur
      fs_usage: `container_fs_usage_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}`,
      fs_limit: `container_fs_limit_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}`,
      
      // Nombre de conteneurs actifs JobbingTrack
      containers_count: `count(container_last_seen{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""})`
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      
      results[key] = response.data.data.result;
    }

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error fetching JobbingTrack containers metrics:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// MÉTRIQUES D'UN CONTENEUR SPÉCIFIQUE
// ============================================

async function getContainerMetrics(containerName) {
  try {
    const queries = {
      cpu_usage: `rate(container_cpu_usage_seconds_total{name=~".*${containerName}.*"}[5m])`,
      cpu_usage_percent: `100 * rate(container_cpu_usage_seconds_total{name=~".*${containerName}.*"}[5m])`,
      
      memory_usage: `container_memory_usage_bytes{name=~".*${containerName}.*"}`,
      memory_limit: `container_spec_memory_limit_bytes{name=~".*${containerName}.*"}`,
      memory_usage_percent: `100 * (container_memory_usage_bytes{name=~".*${containerName}.*"} / container_spec_memory_limit_bytes{name=~".*${containerName}.*"})`,
      
      network_rx: `rate(container_network_receive_bytes_total{name=~".*${containerName}.*"}[5m])`,
      network_tx: `rate(container_network_transmit_bytes_total{name=~".*${containerName}.*"}[5m])`,
      
      fs_usage: `container_fs_usage_bytes{name=~".*${containerName}.*"}`,
      fs_limit: `container_fs_limit_bytes{name=~".*${containerName}.*"}`
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      
      results[key] = response.data.data.result;
    }

    return {
      success: true,
      container: containerName,
      data: results
    };
  } catch (error) {
    console.error(`Error fetching container ${containerName} metrics:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// STATISTIQUES AGRÉGÉES JOBBINGTRACK
// ============================================

async function getJobbingTrackStats() {
  try {
    const projectLabel = 'com.docker.compose.project';
    const projectName = 'jobbingtrack';
    
    const queries = {
      // CPU total utilisé par JobbingTrack (en cores)
      total_cpu_usage: `sum(rate(container_cpu_usage_seconds_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m]))`,
      
      // CPU moyen par conteneur
      avg_cpu_usage: `avg(rate(container_cpu_usage_seconds_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m]))`,
      
      // CPU max parmi les conteneurs
      max_cpu_usage: `max(rate(container_cpu_usage_seconds_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m]))`,
      
      // CPU min parmi les conteneurs
      min_cpu_usage: `min(rate(container_cpu_usage_seconds_total{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""}[5m]))`,
      
      // Mémoire totale utilisée par JobbingTrack
      total_memory_usage: `sum(container_memory_usage_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""})`,
      
      // Mémoire moyenne par conteneur
      avg_memory_usage: `avg(container_memory_usage_bytes{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""})`,
      
      // Nombre de conteneurs actifs
      active_containers: `count(container_last_seen{container_label_${projectLabel.replace(/\./g, '_')}="${projectName}", name!=""})`
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      
      const data = response.data.data.result;
      results[key] = data.length > 0 ? parseFloat(data[0].value[1]) : null;
    }

    return {
      success: true,
      project: projectName,
      data: results
    };
  } catch (error) {
    console.error('Error fetching JobbingTrack stats:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// RANGE QUERY (historique)
// ============================================

async function getHistoryMetrics(query, start, end, step = '1m') {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step },
      timeout: 10000
    });

    return {
      success: true,
      data: response.data.data.result
    };
  } catch (error) {
    console.error('Error fetching history metrics:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getSystemMetrics,
  getJobbingTrackContainersMetrics,
  getContainerMetrics,
  getJobbingTrackStats,
  getHistoryMetrics
};

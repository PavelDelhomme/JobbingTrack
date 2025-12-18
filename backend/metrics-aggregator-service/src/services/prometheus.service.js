const axios = require('axios');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

// ✅ OPTIMISATION: Cache des métriques système avec TTL
const systemMetricsCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 secondes de cache
};

// ============================================
// MÉTRIQUES SYSTÈME HÔTE (via Node Exporter)
// ============================================

async function getSystemMetrics() {
  // ✅ OPTIMISATION: Vérifier le cache avant de faire la requête
  const now = Date.now();
  if (systemMetricsCache.data && (now - systemMetricsCache.timestamp) < systemMetricsCache.ttl) {
    console.log('[PROMETHEUS] Utilisation du cache pour les métriques système');
    return systemMetricsCache.data;
  }

  try {
    const queries = {
      // CPU - Nombre de cœurs
      cpu_cores: 'count(node_cpu_seconds_total{mode="idle"})',
      
      // CPU - Utilisation système (%)
      cpu_usage_percent: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)',
      
      // Mémoire totale machine (bytes)
      memory_total: 'node_memory_MemTotal_bytes',
      
      // Mémoire disponible (bytes)
      memory_available: 'node_memory_MemAvailable_bytes',
      
      // Mémoire utilisée (bytes)
      memory_used: 'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes',
      
      // Mémoire utilisée (%)
      memory_used_percent: '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))',
      
      // Espace disque total (bytes) - tous les filesystems
      disk_total: 'sum(node_filesystem_size_bytes{fstype=~"ext4|xfs|btrfs"})',
      
      // Espace disque utilisé (bytes)
      disk_used: 'sum(node_filesystem_size_bytes{fstype=~"ext4|xfs|btrfs"}) - sum(node_filesystem_avail_bytes{fstype=~"ext4|xfs|btrfs"})',
      
      // Espace disque utilisé (%)
      disk_used_percent: '100 * (1 - (sum(node_filesystem_avail_bytes{fstype=~"ext4|xfs|btrfs"}) / sum(node_filesystem_size_bytes{fstype=~"ext4|xfs|btrfs"})))',
      
      // Load average
      load_1min: 'node_load1',
      load_5min: 'node_load5',
      load_15min: 'node_load15',
      
      // Nombre de conteneurs actifs JobbingTrack
      containers_jobbingtrack: 'count(container_last_seen{container_label_com_docker_compose_project=~"jobbingtrack.*", name!=""})',
      
      // Nombre total de conteneurs (tous projets)
      containers_total: 'count(container_last_seen{name!=""})'
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        
        const data = response.data.data.result;
        results[key] = data.length > 0 ? parseFloat(data[0].value[1]) : null;
      } catch (error) {
        console.error(`Erreur query ${key}:`, error.message);
        results[key] = null;
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: results
    };
    
    // ✅ OPTIMISATION: Mettre en cache le résultat
    systemMetricsCache.data = result;
    systemMetricsCache.timestamp = now;
    
    return result;
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
    const queries = {
      // CPU par conteneur JobbingTrack (rate sur 1 min)
      cpu_usage: `
        rate(container_cpu_usage_seconds_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m])
      `,
      
      // Mémoire utilisée par conteneur (bytes)
      memory_usage: `
        container_memory_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }
      `,
      
      // Limite mémoire par conteneur (bytes)
      memory_limit: `
        container_spec_memory_limit_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }
      `,
      
      // Pourcentage mémoire par conteneur
      memory_percent: `
        100 * (
          container_memory_usage_bytes{container_label_com_docker_compose_project=~"jobbingtrack.*", name!=""} /
          container_spec_memory_limit_bytes{container_label_com_docker_compose_project=~"jobbingtrack.*", name!=""}
        )
      `,
      
      // Réseau RX (bytes/sec)
      network_rx: `
        rate(container_network_receive_bytes_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m])
      `,
      
      // Réseau TX (bytes/sec)
      network_tx: `
        rate(container_network_transmit_bytes_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m])
      `,
      
      // Filesystem usage (bytes)
      fs_usage: `
        container_fs_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }
      `,
      
      // Filesystem limit (bytes)
      fs_limit: `
        container_fs_limit_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }
      `,
      
      // Nombre de conteneurs actifs
      containers_count: `
        count(container_last_seen{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        })
      `
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        results[key] = response.data.data.result;
      } catch (error) {
        console.error(`Erreur query JobbingTrack containers ${key}:`, error.message);
        results[key] = [];
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
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
      // CPU usage (rate)
      cpu_usage: `rate(container_cpu_usage_seconds_total{name=~".*${containerName}.*"}[1m])`,
      
      // CPU usage en pourcentage
      cpu_usage_percent: `100 * rate(container_cpu_usage_seconds_total{name=~".*${containerName}.*"}[1m])`,
      
      // Mémoire utilisée (bytes)
      memory_usage: `container_memory_usage_bytes{name=~".*${containerName}.*"}`,
      
      // Limite mémoire (bytes)
      memory_limit: `container_spec_memory_limit_bytes{name=~".*${containerName}.*"}`,
      
      // Pourcentage mémoire
      memory_usage_percent: `100 * (container_memory_usage_bytes{name=~".*${containerName}.*"} / container_spec_memory_limit_bytes{name=~".*${containerName}.*"})`,
      
      // Réseau RX (bytes/sec)
      network_rx: `rate(container_network_receive_bytes_total{name=~".*${containerName}.*"}[1m])`,
      
      // Réseau TX (bytes/sec)
      network_tx: `rate(container_network_transmit_bytes_total{name=~".*${containerName}.*"}[1m])`,
      
      // Filesystem usage (bytes)
      fs_usage: `container_fs_usage_bytes{name=~".*${containerName}.*"}`,
      
      // Filesystem limit (bytes)
      fs_limit: `container_fs_limit_bytes{name=~".*${containerName}.*"}`,
      
      // Filesystem usage percent
      fs_usage_percent: `100 * (container_fs_usage_bytes{name=~".*${containerName}.*"} / container_fs_limit_bytes{name=~".*${containerName}.*"})`,
      
      // Uptime (seconds)
      uptime: `time() - container_start_time_seconds{name=~".*${containerName}.*"}`
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        results[key] = response.data.data.result;
      } catch (error) {
        console.error(`Erreur query conteneur ${containerName} ${key}:`, error.message);
        results[key] = [];
      }
    }

    return {
      success: true,
      container: containerName,
      timestamp: new Date().toISOString(),
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
    const queries = {
      // CPU total utilisé par TOUS les conteneurs JobbingTrack
      total_cpu_usage: `
        sum(rate(container_cpu_usage_seconds_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]))
      `,
      
      // CPU moyen par conteneur JobbingTrack
      avg_cpu_usage: `
        avg(rate(container_cpu_usage_seconds_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]))
      `,
      
      // CPU max parmi les conteneurs JobbingTrack
      max_cpu_usage: `
        max(rate(container_cpu_usage_seconds_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]))
      `,
      
      // CPU min parmi les conteneurs JobbingTrack
      min_cpu_usage: `
        min(rate(container_cpu_usage_seconds_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]) > 0)
      `,
      
      // Mémoire totale utilisée par JobbingTrack (bytes)
      total_memory_usage: `
        sum(container_memory_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        })
      `,
      
      // Mémoire moyenne par conteneur (bytes)
      avg_memory_usage: `
        avg(container_memory_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        })
      `,
      
      // Mémoire max parmi les conteneurs
      max_memory_usage: `
        max(container_memory_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        })
      `,
      
      // Mémoire min parmi les conteneurs
      min_memory_usage: `
        min(container_memory_usage_bytes{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        } > 0)
      `,
      
      // Pourcentage mémoire JobbingTrack / mémoire totale système
      memory_percent_of_system: `
        100 * (
          sum(container_memory_usage_bytes{container_label_com_docker_compose_project=~"jobbingtrack.*", name!=""})
          / node_memory_MemTotal_bytes
        )
      `,
      
      // Réseau total RX JobbingTrack (bytes/sec)
      total_network_rx: `
        sum(rate(container_network_receive_bytes_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]))
      `,
      
      // Réseau total TX JobbingTrack (bytes/sec)
      total_network_tx: `
        sum(rate(container_network_transmit_bytes_total{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        }[1m]))
      `,
      
      // Nombre de conteneurs actifs
      active_containers: `
        count(container_last_seen{
          container_label_com_docker_compose_project=~"jobbingtrack.*",
          name!=""
        })
      `
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        
        const data = response.data.data.result;
        results[key] = data.length > 0 ? parseFloat(data[0].value[1]) : null;
      } catch (error) {
        console.error(`Erreur query agrégation ${key}:`, error.message);
        results[key] = null;
      }
    }

    return {
      success: true,
      project: 'jobbingtrack',
      timestamp: new Date().toISOString(),
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

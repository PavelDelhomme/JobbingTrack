/**
 * Network Monitor - Collecte des métriques réseau
 * Lit /proc/net/tcp et /proc/net/udp pour collecter les statistiques réseau
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('./utils/logger');

const execAsync = promisify(exec);

/**
 * Parser une ligne de /proc/net/tcp ou /proc/net/udp
 */
function parseConnectionLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;

  // Format: sl local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode
  const localAddr = parts[1];
  const remoteAddr = parts[2];
  const state = parts[3];

  // Parser les adresses (format: 0100007F:1F90 = 127.0.0.1:8080)
  const parseAddress = (addr) => {
    const [ipHex, portHex] = addr.split(':');
    if (!ipHex || !portHex) return null;

    const port = parseInt(portHex, 16);
    const ipParts = [];
    for (let i = 0; i < 8; i += 2) {
      ipParts.push(parseInt(ipHex.substr(i, 2), 16));
    }
    const ip = ipParts.reverse().join('.');

    return { ip, port };
  };

  const local = parseAddress(localAddr);
  const remote = parseAddress(remoteAddr);

  if (!local || !remote) return null;

  return {
    localIp: local.ip,
    localPort: local.port,
    remoteIp: remote.ip,
    remotePort: remote.port,
    state: parseInt(state, 16)
  };
}

/**
 * Lire les connexions TCP depuis /proc/net/tcp
 */
async function readTcpConnections() {
  try {
    const content = await fs.readFile('/proc/net/tcp', 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header

    const connections = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const conn = parseConnectionLine(line);
      if (conn) {
        connections.push({
          ...conn,
          protocol: 'TCP'
        });
      }
    }

    return connections;
  } catch (error) {
    logger.error('Erreur lecture /proc/net/tcp:', error);
    return [];
  }
}

/**
 * Lire les connexions UDP depuis /proc/net/udp
 */
async function readUdpConnections() {
  try {
    const content = await fs.readFile('/proc/net/udp', 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header

    const connections = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const conn = parseConnectionLine(line);
      if (conn) {
        connections.push({
          ...conn,
          protocol: 'UDP'
        });
      }
    }

    return connections;
  } catch (error) {
    logger.error('Erreur lecture /proc/net/udp:', error);
    return [];
  }
}

/**
 * Obtenir le conteneur Docker associé à une connexion
 */
async function getContainerForConnection(localPort) {
  try {
    // Utiliser docker ps pour trouver le conteneur qui expose ce port
    const { stdout } = await execAsync('docker ps --format "{{.ID}} {{.Ports}}"');
    const lines = stdout.split('\n');

    for (const line of lines) {
      if (line.includes(`:${localPort}->`)) {
        const containerId = line.split(' ')[0];
        const { stdout: name } = await execAsync(`docker inspect --format '{{.Name}}' ${containerId}`);
        return {
          containerId,
          containerName: name.trim().replace(/^\//, '')
        };
      }
    }

    return null;
  } catch (error) {
    // Ignorer les erreurs (docker peut ne pas être disponible)
    return null;
  }
}

/**
 * Collecter toutes les métriques réseau
 */
async function collectNetworkMetrics() {
  const tcpConnections = await readTcpConnections();
  const udpConnections = await readUdpConnections();
  const allConnections = [...tcpConnections, ...udpConnections];

  // Enrichir avec les informations de conteneurs et convertir les états
  const enrichedConnections = await Promise.all(
    allConnections.map(async (conn) => {
      const container = await getContainerForConnection(conn.localPort);
      return {
        ...conn,
        state: getStateName(conn.state), // Convertir l'état en nom lisible
        containerId: container?.containerId || null,
        containerName: container?.containerName || null
      };
    })
  );

  // Calculer les statistiques
  const stats = {
    totalConnections: allConnections.length,
    tcpConnections: tcpConnections.length,
    udpConnections: udpConnections.length,
    connectionsByState: {},
    connectionsByContainer: {},
    topSourceIps: {},
    topDestinationPorts: {}
  };

  // Statistiques par état
  for (const conn of allConnections) {
    const stateName = getStateName(conn.state);
    stats.connectionsByState[stateName] = (stats.connectionsByState[stateName] || 0) + 1;
  }

  // Statistiques par conteneur
  for (const conn of enrichedConnections) {
    if (conn.containerName) {
      stats.connectionsByContainer[conn.containerName] = 
        (stats.connectionsByContainer[conn.containerName] || 0) + 1;
    }
  }

  // Top IPs sources
  for (const conn of allConnections) {
    stats.topSourceIps[conn.remoteIp] = (stats.topSourceIps[conn.remoteIp] || 0) + 1;
  }

  // Top ports destination
  for (const conn of allConnections) {
    stats.topDestinationPorts[conn.localPort] = 
      (stats.topDestinationPorts[conn.localPort] || 0) + 1;
  }

  return {
    connections: enrichedConnections,
    stats,
    timestamp: new Date().toISOString()
  };
}

/**
 * Convertir l'état TCP en nom lisible
 */
function getStateName(state) {
  const states = {
    0x01: 'ESTABLISHED',
    0x02: 'SYN_SENT',
    0x03: 'SYN_RECV',
    0x04: 'FIN_WAIT1',
    0x05: 'FIN_WAIT2',
    0x06: 'TIME_WAIT',
    0x07: 'CLOSE',
    0x08: 'CLOSE_WAIT',
    0x09: 'LAST_ACK',
    0x0A: 'LISTEN',
    0x0B: 'CLOSING'
  };
  return states[state] || 'UNKNOWN';
}

/**
 * Détecter les anomalies (SYN flood, port scanning)
 */
function detectAnomalies(connections, previousConnections = []) {
  const anomalies = [];

  // Détection SYN flood (trop de connexions SYN depuis une IP)
  const synByIp = {};
  for (const conn of connections) {
    const state = typeof conn.state === 'string' ? 
      (conn.state === 'SYN_SENT' || conn.state === 'SYN_RECV' ? 0x02 : null) : 
      conn.state;
    if (state === 0x02 || state === 0x03) { // SYN_SENT ou SYN_RECV
      synByIp[conn.remoteIp] = (synByIp[conn.remoteIp] || 0) + 1;
    }
  }

  // ✅ CORRECTION : Ignorer les IPs privées et localhost pour éviter les fausses alertes
  const isPrivateIP = (ip) => {
    // IPs privées (RFC 1918) : 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    // Localhost : 127.0.0.0/8
    if (ip.startsWith('127.') || ip === 'localhost' || ip === '::1') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31) return true;
    if (ip.startsWith('192.168.')) return true;
    return false;
  };

  for (const [ip, count] of Object.entries(synByIp)) {
    // Ignorer les IPs privées en développement (sauf si count > 500 pour vraies menaces internes)
    if (isPrivateIP(ip) && count < 500 && process.env.NODE_ENV !== 'production') {
      logger.debug(`[THREAT] IP privée ${ip} ignorée (${count} connexions SYN, seuil: 500)`);
      continue;
    }
    
    if (count > 50) { // Seuil réduit pour détecter plus tôt
      anomalies.push({
        type: 'SYN_FLOOD',
        severity: count > 200 ? 'CRITICAL' : 'HIGH',
        sourceIp: ip,
        count,
        message: `SYN flood détecté: ${count} connexions SYN depuis ${ip}`
      });
    }
  }

  // Détection port scanning : une IP qui se connecte à PLUSIEURS PORTS DESTINATION différents (scan de nos services).
  // Exclure le faux positif : beaucoup de connexions d'une IP vers UN SEUL port (ex. app → postgres 5432) = trafic normal.
  const localPortsByRemoteIp = {};
  const remotePortsByRemoteIp = {};
  for (const conn of connections) {
    const state = typeof conn.state === 'string' ?
      (conn.state === 'SYN_SENT' || conn.state === 'TIME_WAIT' ? 0x02 : null) :
      conn.state;
    if (state === 0x02 || state === 0x06) { // SYN_SENT ou TIME_WAIT
      if (!localPortsByRemoteIp[conn.remoteIp]) {
        localPortsByRemoteIp[conn.remoteIp] = new Set();
        remotePortsByRemoteIp[conn.remoteIp] = new Set();
      }
      localPortsByRemoteIp[conn.remoteIp].add(conn.localPort);
      remotePortsByRemoteIp[conn.remoteIp].add(conn.remotePort);
    }
  }

  for (const [ip, localPorts] of Object.entries(localPortsByRemoteIp)) {
    const remotePorts = remotePortsByRemoteIp[ip] || new Set();
    // Éviter faux positif : une IP avec plein de connexions vers UN SEUL port (ex. app→postgres 5432) = normal
    const singleDestinationPort = remotePorts.size <= 1;
    // Vrai port scan = une IP touche au moins 3 ports différents côté nous (ex. 22, 80, 443)
    const manyDistinctLocalPorts = localPorts.size >= 3;
    if (manyDistinctLocalPorts && !singleDestinationPort) {
      anomalies.push({
        type: 'PORT_SCAN',
        severity: localPorts.size > 20 ? 'HIGH' : localPorts.size > 10 ? 'MEDIUM' : 'LOW',
        sourceIp: ip,
        portCount: localPorts.size,
        ports: Array.from(localPorts),
        message: `Port scanning détecté: ${localPorts.size} ports différents depuis ${ip} (ports: ${Array.from(localPorts).slice(0, 10).join(', ')})`
      });
    }
  }
  
  // Détection brute force (trop de connexions échouées depuis une IP)
  const failedByIp = {};
  for (const conn of connections) {
    const state = typeof conn.state === 'string' ? conn.state : getStateName(conn.state);
    if (state === 'TIME_WAIT' || state === 'CLOSE' || state === 'CLOSING') {
      failedByIp[conn.remoteIp] = (failedByIp[conn.remoteIp] || 0) + 1;
    }
  }
  
  for (const [ip, count] of Object.entries(failedByIp)) {
    if (count > 20) {
      anomalies.push({
        type: 'BRUTE_FORCE',
        severity: count > 50 ? 'HIGH' : 'MEDIUM',
        sourceIp: ip,
        count,
        message: `Brute force détecté: ${count} connexions échouées depuis ${ip}`
      });
    }
  }

  return anomalies;
}

module.exports = {
  collectNetworkMetrics,
  detectAnomalies,
  readTcpConnections,
  readUdpConnections,
  getStateName
};


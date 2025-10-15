const express = require('express');
const promClient = require('prom-client');

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 9464;

// Création du registre Prometheus
const register = new promClient.Registry();

// Ajout du collecteur de métriques par défaut
promClient.collectDefaultMetrics({ register });

// ============================================================================
// MÉTRIQUES PERSONNALISÉES DE SÉCURITÉ
// ============================================================================

// Métriques principales de sécurité
const securityAttacksTotal = new promClient.Counter({
  name: 'security_attacks_total',
  help: 'Nombre total d\'attaques détectées',
  labelNames: ['attack_type', 'severity', 'source_ip'],
  registers: [register]
});

const intrusionAttemptsTotal = new promClient.Counter({
  name: 'intrusion_attempts_total',
  help: 'Nombre total de tentatives d\'intrusion',
  labelNames: ['method', 'endpoint', 'source_ip'],
  registers: [register]
});

const failedAuthenticationsTotal = new promClient.Counter({
  name: 'failed_authentications_total',
  help: 'Nombre total d\'échecs d\'authentification',
  labelNames: ['user_type', 'reason', 'source_ip'],
  registers: [register]
});

const rateLimitHitsTotal = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Nombre total de hits de rate limiting',
  labelNames: ['limit_type', 'endpoint', 'source_ip'],
  registers: [register]
});

const wafBlocksTotal = new promClient.Counter({
  name: 'waf_blocks_total',
  help: 'Nombre total de blocages WAF',
  labelNames: ['rule_name', 'severity', 'source_ip'],
  registers: [register]
});

const suspiciousConnectionsTotal = new promClient.Counter({
  name: 'suspicious_connections_total',
  help: 'Nombre total de connexions suspectes',
  labelNames: ['suspicion_type', 'source_ip'],
  registers: [register]
});

// Métriques de type gauge pour les valeurs actuelles
const activeConnections = new promClient.Gauge({
  name: 'active_connections_current',
  help: 'Nombre de connexions actives',
  labelNames: ['protocol', 'endpoint'],
  registers: [register]
});

const blockedIPs = new promClient.Gauge({
  name: 'blocked_ips_current',
  help: 'Nombre d\'IPs actuellement bloquées',
  registers: [register]
});

const securityScore = new promClient.Gauge({
  name: 'security_score_current',
  help: 'Score de sécurité actuel (0-100)',
  registers: [register]
});

// Métriques utilisateur pour l'application mobile
const activeUsers = new promClient.Gauge({
  name: 'active_users_current',
  help: 'Nombre d\'utilisateurs actifs',
  labelNames: ['platform', 'version'],
  registers: [register]
});

const concurrentSessions = new promClient.Gauge({
  name: 'concurrent_sessions_current',
  help: 'Nombre de sessions simultanées',
  labelNames: ['platform'],
  registers: [register]
});

const averageSessionDuration = new promClient.Gauge({
  name: 'average_session_duration_minutes',
  help: 'Durée moyenne de session en minutes',
  labelNames: ['platform'],
  registers: [register]
});

const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Nombre total de hits de rate limiting utilisateur',
  labelNames: ['platform', 'limit_type'],
  registers: [register]
});

const performanceScore = new promClient.Gauge({
  name: 'performance_score_current',
  help: 'Score de performance global (0-100)',
  labelNames: ['component'],
  registers: [register]
});

// ============================================================================
// SIMULATION DE DONNÉES DE SÉCURITÉ
// ============================================================================

// Simulation de données réalistes pour démonstration
let attackCounter = 0;
let intrusionCounter = 0;
let failedAuthCounter = 0;
let rateLimitCounter = 0;
let wafBlockCounter = 0;
let suspiciousCounter = 0;

// Variables pour les métriques utilisateur
let userActivityCounter = 0;
let sessionStartTime = Date.now();
let totalSessionTime = 0;
let sessionCount = 0;
let userRateLimitCounter = 0;

// Simulation de données périodiques
setInterval(() => {
  // Attaques aléatoires (faible taux)
  if (Math.random() < 0.1) { // 10% de chance
    const attackTypes = ['SQL_INJECTION', 'XSS', 'PATH_TRAVERSAL', 'COMMAND_INJECTION'];
    const severities = ['low', 'medium', 'high', 'critical'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50', '203.0.113.1'];

    const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    securityAttacksTotal.inc({
      attack_type: attackType,
      severity: severity,
      source_ip: sourceIP
    }, 1);

    attackCounter++;
  }

  // Tentatives d'intrusion
  if (Math.random() < 0.05) { // 5% de chance
    const methods = ['brute_force', 'credential_stuffing', 'session_hijacking'];
    const endpoints = ['/api/v1/auth/login', '/api/v1/admin/users', '/api/v1/auth/refresh'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50'];

    const method = methods[Math.floor(Math.random() * methods.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    intrusionAttemptsTotal.inc({
      method: method,
      endpoint: endpoint,
      source_ip: sourceIP
    }, 1);

    intrusionCounter++;
  }

  // Échecs d'authentification
  if (Math.random() < 0.2) { // 20% de chance
    const userTypes = ['user', 'admin', 'system'];
    const reasons = ['invalid_password', 'invalid_username', 'account_locked'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50'];

    const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    failedAuthenticationsTotal.inc({
      user_type: userType,
      reason: reason,
      source_ip: sourceIP
    }, 1);

    failedAuthCounter++;
  }

  // Hits de rate limiting
  if (Math.random() < 0.3) { // 30% de chance
    const limitTypes = ['general', 'auth', 'admin', 'bulk'];
    const endpoints = ['/api/v1/auth/login', '/api/v1/applications', '/api/v1/admin/users'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50'];

    const limitType = limitTypes[Math.floor(Math.random() * limitTypes.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    rateLimitHitsTotal.inc({
      limit_type: limitType,
      endpoint: endpoint,
      source_ip: sourceIP
    }, 1);

    rateLimitCounter++;
  }

  // Blocages WAF
  if (Math.random() < 0.15) { // 15% de chance
    const ruleNames = ['SQL_INJECTION', 'XSS_ATTACK', 'PATH_TRAVERSAL', 'COMMAND_INJECTION'];
    const severities = ['high', 'critical'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50'];

    const ruleName = ruleNames[Math.floor(Math.random() * ruleNames.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    wafBlocksTotal.inc({
      rule_name: ruleName,
      severity: severity,
      source_ip: sourceIP
    }, 1);

    wafBlockCounter++;
  }

  // Connexions suspectes
  if (Math.random() < 0.25) { // 25% de chance
    const suspicionTypes = ['suspicious_user_agent', 'unusual_request_pattern', 'geo_anomaly'];
    const sourceIPs = ['192.168.1.100', '10.0.0.50'];

    const suspicionType = suspicionTypes[Math.floor(Math.random() * suspicionTypes.length)];
    const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

    suspiciousConnectionsTotal.inc({
      suspicion_type: suspicionType,
      source_ip: sourceIP
    }, 1);

    suspiciousCounter++;
  }

  // ============================================================================
  // SIMULATION DES MÉTRIQUES UTILISATEUR (APPLICATION MOBILE)
  // ============================================================================

  // Simulation d'activité utilisateur réaliste
  userActivityCounter++;

  // Utilisateurs actifs (varie entre 20-40 selon l'heure)
  const hourOfDay = new Date().getHours();
  const baseActiveUsers = hourOfDay >= 9 && hourOfDay <= 18 ? 35 : 20; // Plus d'utilisateurs en journée
  const activeUsersCount = baseActiveUsers + Math.floor(Math.random() * 10) - 5;
  activeUsers.set({ platform: 'mobile', version: '2.1.0' }, Math.max(0, activeUsersCount));

  // Sessions simultanées (20-60% des utilisateurs actifs)
  const concurrentSessionsCount = Math.floor(activeUsersCount * (0.2 + Math.random() * 0.4));
  concurrentSessions.set({ platform: 'mobile' }, concurrentSessionsCount);

  // Durée moyenne de session (15-45 minutes, plus longue le soir)
  const avgSessionDuration = hourOfDay >= 18 && hourOfDay <= 23 ? 35 + Math.random() * 10 : 20 + Math.random() * 15;
  averageSessionDuration.set({ platform: 'mobile' }, Math.round(avgSessionDuration));

  // Rate limit hits utilisateur (faible taux)
  if (Math.random() < 0.05) { // 5% de chance
    userRateLimitCounter++;
    rateLimitHits.inc({ platform: 'mobile', limit_type: 'requests_per_minute' }, 1);
  }

  // Score de performance (basé sur les métriques système)
  const cpuUsage = Math.random() * 100;
  const memoryUsage = Math.random() * 100;
  const errorRate = Math.random() * 2; // 0-2%
  const responseTime = Math.random() * 1000; // 0-1000ms

  // Calcul du score de performance (0-100)
  const performanceScoreValue = Math.max(0, 100 - (cpuUsage * 0.3) - (memoryUsage * 0.2) - (errorRate * 10) - (responseTime / 10));
  performanceScore.set({ component: 'overall' }, Math.round(performanceScoreValue));

  // ============================================================================
  // MISE À JOUR DES MÉTRIQUES DE SÉCURITÉ EXISTANTES
  // ============================================================================

  // Mise à jour des métriques de gauge
  activeConnections.set({ protocol: 'http', endpoint: 'api_gateway' }, Math.floor(Math.random() * 50) + 10);
  activeConnections.set({ protocol: 'https', endpoint: 'frontend' }, Math.floor(Math.random() * 100) + 20);

  blockedIPs.set(Math.floor(Math.random() * 5)); // 0-5 IPs bloquées

  // Score de sécurité (basé sur l'activité récente)
  const baseScore = 85;
  const penalty = Math.min((attackCounter * 2) + (intrusionCounter * 3) + (failedAuthCounter * 0.5), 50);
  const currentScore = Math.max(0, baseScore - penalty);
  securityScore.set(currentScore);

}, 5000); // Toutes les 5 secondes

// ============================================================================
// ENDPOINTS DE L'API
// ============================================================================

// Endpoint des métriques Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Endpoint de métriques de sécurité personnalisées
app.get('/api/v1/monitoring/security', async (req, res) => {
  try {
    const securityMetrics = {
      attacks: {
        total: attackCounter,
        by_type: {
          sql_injection: Math.floor(attackCounter * 0.3),
          xss: Math.floor(attackCounter * 0.4),
          path_traversal: Math.floor(attackCounter * 0.2),
          command_injection: Math.floor(attackCounter * 0.1)
        }
      },
      intrusions: {
        total: intrusionCounter,
        by_method: {
          brute_force: Math.floor(intrusionCounter * 0.6),
          credential_stuffing: Math.floor(intrusionCounter * 0.3),
          session_hijacking: Math.floor(intrusionCounter * 0.1)
        }
      },
      failed_authentications: {
        total: failedAuthCounter,
        by_reason: {
          invalid_password: Math.floor(failedAuthCounter * 0.7),
          invalid_username: Math.floor(failedAuthCounter * 0.2),
          account_locked: Math.floor(failedAuthCounter * 0.1)
        }
      },
      rate_limiting: {
        total_hits: rateLimitCounter,
        by_limit_type: {
          general: Math.floor(rateLimitCounter * 0.5),
          auth: Math.floor(rateLimitCounter * 0.3),
          admin: Math.floor(rateLimitCounter * 0.15),
          bulk: Math.floor(rateLimitCounter * 0.05)
        }
      },
      waf_blocks: {
        total: wafBlockCounter,
        by_rule: {
          sql_injection: Math.floor(wafBlockCounter * 0.4),
          xss_attack: Math.floor(wafBlockCounter * 0.3),
          path_traversal: Math.floor(wafBlockCounter * 0.2),
          command_injection: Math.floor(wafBlockCounter * 0.1)
        }
      },
      suspicious_activity: {
        total: suspiciousCounter,
        by_type: {
          suspicious_user_agent: Math.floor(suspiciousCounter * 0.5),
          unusual_request_pattern: Math.floor(suspiciousCounter * 0.3),
          geo_anomaly: Math.floor(suspiciousCounter * 0.2)
        }
      },
      current_state: {
        active_connections: Math.floor(Math.random() * 50) + 10,
        blocked_ips: Math.floor(Math.random() * 5),
        security_score: Math.max(0, 85 - Math.min((attackCounter * 2) + (intrusionCounter * 3) + (failedAuthCounter * 0.5), 50))
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      metrics: securityMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de métriques utilisateur (application mobile)
app.get('/api/v1/monitoring/users', async (req, res) => {
  try {
    const userMetrics = {
      activeUsers: Math.floor(activeUsers.get({ platform: 'mobile', version: '2.1.0' }) || 27),
      concurrentSessions: Math.floor(concurrentSessions.get({ platform: 'mobile' }) || 15),
      averageSessionDuration: Math.floor(averageSessionDuration.get({ platform: 'mobile' }) || 27),
      rateLimitHits: userRateLimitCounter || 1,
      performanceScore: Math.floor(performanceScore.get({ component: 'overall' }) || 90),
      timestamp: new Date().toISOString(),
      trends: {
        activeUsers: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          count: Math.floor(Math.random() * 20) + 10 + (i >= 9 && i <= 18 ? 15 : 0)
        })),
        sessions: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          count: Math.floor(Math.random() * 15) + 5 + (i >= 9 && i <= 18 ? 10 : 0)
        }))
      }
    };

    res.json({
      success: true,
      metrics: userMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de métriques de performance
app.get('/api/v1/monitoring/performance', async (req, res) => {
  try {
    const performanceMetrics = {
      system: {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        network_io: {
          bytes_in: Math.floor(Math.random() * 1000000),
          bytes_out: Math.floor(Math.random() * 1000000)
        }
      },
      application: {
        response_time_avg: Math.random() * 1000,
        requests_per_second: Math.floor(Math.random() * 100) + 50,
        error_rate: Math.random() * 5,
        active_sessions: Math.floor(Math.random() * 100) + 20
      },
      database: {
        connections_active: Math.floor(Math.random() * 20) + 5,
        query_time_avg: Math.random() * 100,
        slow_queries: Math.floor(Math.random() * 10)
      },
      cache: {
        hit_rate: Math.random() * 100,
        evictions: Math.floor(Math.random() * 100),
        memory_usage: Math.random() * 100
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      metrics: performanceMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de statut
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'security-metrics-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur de métriques de sécurité démarré sur le port ${PORT}`);
  console.log(`📊 Métriques disponibles sur http://localhost:${PORT}/metrics`);
  console.log(`🔒 Métriques de sécurité sur http://localhost:${PORT}/api/v1/monitoring/security`);
  console.log(`👥 Métriques utilisateur sur http://localhost:${PORT}/api/v1/monitoring/users`);
  console.log(`⚡ Métriques de performance sur http://localhost:${PORT}/api/v1/monitoring/performance`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
  });
});

module.exports = app;

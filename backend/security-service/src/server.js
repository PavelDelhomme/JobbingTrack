const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const morgan = require('morgan');

const securityRoutes = require('./routes/securityRoutes');
const logsRoutes = require('./routes/logsRoutes');
const vulnerabilitiesRoutes = require('./routes/vulnerabilitiesRoutes');
const intrusionRoutes = require('./routes/intrusionRoutes');
const ddosRoutes = require('./routes/ddosRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const firewallRoutes = require('./routes/firewallRoutes');
const wafRoutes = require('./routes/wafRoutes');

const { errorHandler } = require('./middleware/errorHandler');
const { securityMiddleware } = require('./middleware/securityMiddleware');
const { requireFirewallWafAccess } = require('./middleware/firewallWafAuth');
const { logger } = require('./utils/logger');
const { requestContextMiddleware } = require('./utils/requestContext');
const { initializeDatabase } = require('./config/database');
const securityScheduler = require('./services/securityScheduler');

const app = express();
const PORT = process.env.PORT || 3017;

// Trust proxy: 1 = un seul proxy (ex. API Gateway). Évite ERR_ERL_PERMISSIVE_TRUST_PROXY de express-rate-limit.
app.set('trust proxy', 1);

// Configuration de sécurité renforcée
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Configuration CORS restrictive
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Secret', 'X-Request-Id', 'X-Correlation-Id']
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limite chaque IP à 1000 requêtes par fenêtre
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Slow down pour les API sensibles
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // permettre 100 requêtes par fenêtre
  delayMs: 500 // ajouter 500ms de délai par requête après la limite
});
app.use('/api/v1/security/sensitive', speedLimiter);

// Logging des requêtes HTTP
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) }
}));
app.use(requestContextMiddleware);

// Middleware de sécurité personnalisé (lier le contexte avec bind)
app.use((req, res, next) => {
  securityMiddleware.analyzeRequest.bind(securityMiddleware)(req, res, next).catch(err => {
    logger.error('Erreur dans le middleware de sécurité:', err);
    next(); // Continuer même en cas d'erreur
  });
});

// Body parsing avec limite
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes de santé (pas de limite de taux)
app.use('/health', healthRoutes);

// Préfixes les plus spécifiques en premier (firewall/waf) pour éviter toute ambiguïté avec /api/v1/security
app.use('/api/v1/security/firewall', requireFirewallWafAccess, firewallRoutes);
app.use('/api/v1/security/waf', requireFirewallWafAccess, wafRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/logs', logsRoutes);
app.use('/api/v1/vulnerabilities', vulnerabilitiesRoutes);
app.use('/api/v1/intrusion', intrusionRoutes);
app.use('/api/v1/ddos', ddosRoutes);
app.use('/api/v1/alerts', alertsRoutes);

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt gracieux...');
  securityScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt gracieux...');
  securityScheduler.stop();
  process.exit(0);
});

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    logger.info('Base de données de sécurité initialisée avec succès');

    // Démarrer le planificateur de sécurité
    securityScheduler.start();
    logger.info('Planificateur de sécurité démarré');

    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`🔒 Service de sécurité démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔍 Surveillance de sécurité active`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur de sécurité:', error);
    process.exit(1);
  }
}

// Démarrer le serveur si le fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;

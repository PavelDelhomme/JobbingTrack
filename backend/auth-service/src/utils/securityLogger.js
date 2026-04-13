const axios = require('axios');
const logger = require('./logger');

const SECURITY_SERVICE_URL = process.env.SECURITY_SERVICE_URL || 'http://security-service:3017';

function securityInternalHeaders() {
  const secret =
    process.env.SECURITY_INTERNAL_SECRET ||
    (process.env.NODE_ENV === 'production' ? undefined : 'jobbingtrack-internal-security-dev');
  if (!secret) return {};
  return { 'X-Internal-Secret': secret };
}

/**
 * Enregistre un événement de sécurité
 */
async function logSecurityEvent({
  level = 'info',
  category = 'authentication',
  eventType,
  message,
  sourceIP = null,
  userAgent = null,
  userId = null,
  endpoint = null,
  method = null,
  statusCode = null,
  responseTime = null,
  metadata = {}
}) {
  try {
    // Calculer un score de risque basique
    let riskScore = 0;
    
    if (level === 'error') riskScore = 70;
    else if (level === 'warning') riskScore = 40;
    else if (level === 'critical') riskScore = 100;
    else riskScore = 10;

    // Augmenter le score pour certains types d'événements
    if (eventType === 'login_failed' || eventType === 'unauthorized_access') {
      riskScore += 20;
    }

    const logData = {
      level,
      category,
      eventType,
      message,
      sourceIP,
      userAgent,
      userId,
      endpoint,
      method,
      statusCode,
      responseTime,
      riskScore: Math.min(riskScore, 100),
      metadata
    };

    // Envoyer au service de sécurité de manière asynchrone
    axios.post(`${SECURITY_SERVICE_URL}/api/v1/security/logs`, logData, {
      headers: { 'Content-Type': 'application/json', ...securityInternalHeaders() }
    })
      .catch(error => {
        // Logger l'erreur mais ne pas bloquer le flux
        logger.error('Erreur lors de l\'envoi du log de sécurité:', error.message);
      });

    // Logger localement aussi
    logger.info(`[SECURITY] ${eventType}: ${message}`, { userId, sourceIP });
  } catch (error) {
    logger.error('Erreur dans logSecurityEvent:', error.message);
  }
}

/**
 * Enregistre une tentative de connexion réussie
 */
async function logLoginSuccess(userId, email, req) {
  return logSecurityEvent({
    level: 'info',
    category: 'authentication',
    eventType: 'login_success',
    message: `Connexion réussie pour ${email}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 200,
    metadata: { email }
  });
}

/**
 * Enregistre une tentative de connexion échouée
 */
async function logLoginFailure(email, reason, req) {
  return logSecurityEvent({
    level: 'warning',
    category: 'authentication',
    eventType: 'login_failed',
    message: `Échec de connexion pour ${email}: ${reason}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: null,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 401,
    metadata: { email, reason }
  });
}

/**
 * Enregistre une déconnexion
 */
async function logLogout(userId, email, req) {
  return logSecurityEvent({
    level: 'info',
    category: 'authentication',
    eventType: 'logout',
    message: `Déconnexion de ${email}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 200,
    metadata: { email }
  });
}

/**
 * Enregistre un accès non autorisé
 */
async function logUnauthorizedAccess(req, userId = null) {
  return logSecurityEvent({
    level: 'error',
    category: 'authentication',
    eventType: 'unauthorized_access',
    message: `Tentative d'accès non autorisé à ${req.originalUrl}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 403,
    metadata: { token: req.headers.authorization ? 'present' : 'missing' }
  });
}

/**
 * Enregistre un changement de mot de passe
 */
async function logPasswordChange(userId, email, req) {
  return logSecurityEvent({
    level: 'info',
    category: 'authentication',
    eventType: 'password_change',
    message: `Changement de mot de passe pour ${email}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 200,
    metadata: { email }
  });
}

/**
 * Enregistre un rafraîchissement de token
 */
async function logTokenRefresh(userId, email, req) {
  return logSecurityEvent({
    level: 'info',
    category: 'authentication',
    eventType: 'token_refresh',
    message: `Rafraîchissement du token pour ${email}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 200,
    metadata: { email }
  });
}

/**
 * Enregistre une activité suspecte
 */
async function logSuspiciousActivity(description, req, userId = null) {
  return logSecurityEvent({
    level: 'error',
    category: 'intrusion',
    eventType: 'suspicious_activity',
    message: `Activité suspecte détectée: ${description}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: req.statusCode || 400,
    metadata: { description }
  });
}

/**
 * Enregistre une limite de taux atteinte
 */
async function logRateLimitHit(req, userId = null) {
  return logSecurityEvent({
    level: 'warning',
    category: 'rate_limit',
    eventType: 'rate_limit_exceeded',
    message: `Limite de taux atteinte pour ${req.originalUrl}`,
    sourceIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: 429,
    metadata: {}
  });
}

module.exports = {
  logSecurityEvent,
  logLoginSuccess,
  logLoginFailure,
  logLogout,
  logUnauthorizedAccess,
  logPasswordChange,
  logTokenRefresh,
  logSuspiciousActivity,
  logRateLimitHit
};


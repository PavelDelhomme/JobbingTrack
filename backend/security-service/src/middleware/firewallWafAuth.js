/**
 * Accès aux routes firewall / WAF : JWT utilisateur (Bearer) ou secret machine (X-Internal-Secret).
 * Les appels internes (gateway, auth-service, scripts live-check) passent le header X-Internal-Secret.
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

function requireFirewallWafAccess(req, res, next) {
  const internalSecret =
    process.env.SECURITY_INTERNAL_SECRET ||
    (process.env.NODE_ENV === 'production' ? undefined : 'jobbingtrack-internal-security-dev');
  const internalHeader = req.get('X-Internal-Secret') || req.get('x-internal-secret');

  if (internalSecret && internalHeader === internalSecret) {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token d\'authentification requis'
    });
  }

  const token = String(authHeader).slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token d\'authentification requis'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET manquant: validation JWT impossible pour firewall/waf');
    return res.status(503).json({
      success: false,
      error: 'Service de sécurité mal configuré (JWT_SECRET)'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.userId || decoded.id || decoded.sub || null
    };
    return next();
  } catch (e) {
    return res.status(403).json({
      success: false,
      error: 'Token invalide ou expiré'
    });
  }
}

module.exports = { requireFirewallWafAccess };

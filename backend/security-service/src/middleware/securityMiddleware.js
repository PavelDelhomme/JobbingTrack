const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const validator = require('validator');
const { logSecurityEvent } = require('../utils/logger');
const { prisma } = require('../config/database');

class SecurityMiddleware {
  constructor() {
    this.suspiciousIPs = new Set();
    this.failedAttempts = new Map(); // IP -> nombre de tentatives échouées
    this.blockedIPs = new Set();
    this.attackPatterns = new Map(); // Pattern -> nombre d'occurrences
    this.requestHistory = new Map(); // IP -> historique des requêtes
    this.ddosTracker = new Map(); // IP -> {count, windowStart, totalBytes}
  }

  // Middleware principal d'analyse de sécurité
  async analyzeRequest(req, res, next) {
    try {
      // Gérer le cas où getClientIP n'est pas disponible
      const clientIP = this?.getClientIP ? this.getClientIP(req) : (
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown'
      );
      const userAgent = req.get('User-Agent') || '';
      const endpoint = req.originalUrl;
      const method = req.method;
      const contentLength = parseInt(req.get('content-length') || '0');
      const referer = req.get('referer') || '';

      // Analyser l'IP et la géolocalisation
      const geo = geoip.lookup(clientIP);
      const country = geo ? geo.country : 'Unknown';
      const city = geo ? geo.city : 'Unknown';

      // Analyser l'User-Agent
      const uaParser = new UAParser(userAgent);
      const browser = uaParser.getBrowser().name || 'Unknown';
      const os = uaParser.getOS().name || 'Unknown';

      // Stocker les informations dans la requête pour une utilisation ultérieure
      req.securityInfo = {
        clientIP,
        country,
        city,
        userAgent,
        browser,
        os,
        endpoint,
        method,
        contentLength,
        referer,
        timestamp: new Date()
      };

      // Vérifier si l'IP est bloquée
      if (this.blockedIPs.has(clientIP)) {
        await this.logSecurityEvent('critical', 'intrusion', 'blocked_ip_access', `Accès refusé à IP bloquée: ${clientIP}`, {
          ip: clientIP,
          endpoint,
          method,
          userAgent
        });

        return res.status(403).json({
          success: false,
          message: 'Accès refusé: IP bloquée',
          code: 'IP_BLOCKED'
        });
      }

      // Mettre à jour l'historique des requêtes pour cette IP
      this.updateRequestHistory(clientIP, req);

      // Détecter les tentatives d'intrusion
      const intrusionRisk = await this.detectIntrusionAttempts(req);
      if (intrusionRisk > 80) {
        this.blockIP(clientIP, 'High intrusion risk detected');
        return res.status(403).json({
          success: false,
          message: 'Accès refusé: Activité suspecte détectée',
          code: 'INTRUSION_DETECTED'
        });
      }

      // Analyser les payloads suspects
      const payloadRisk = await this.analyzePayload(req);
      if (payloadRisk > 70) {
        this.blockIP(clientIP, 'Suspicious payload detected');
        return res.status(400).json({
          success: false,
          message: 'Requête rejetée: Payload suspect',
          code: 'SUSPICIOUS_PAYLOAD'
        });
      }

      // Vérifier les patterns d'attaque DDoS
      const ddosRisk = await this.detectDDoSPatterns(req);
      if (ddosRisk > 90) {
        this.blockIP(clientIP, 'DDoS pattern detected');
        return res.status(429).json({
          success: false,
          message: 'Trop de requêtes: Limite de taux atteinte',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de sécurité:', error);
      next();
    }
  }

  // Récupérer la vraie IP du client
  getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  // Mettre à jour l'historique des requêtes pour une IP
  updateRequestHistory(clientIP, req) {
    const now = Date.now();
    const windowMs = 60000; // Fenêtre de 1 minute

    if (!this.requestHistory.has(clientIP)) {
      this.requestHistory.set(clientIP, []);
    }

    const history = this.requestHistory.get(clientIP);

    // Nettoyer les anciennes entrées
    const validHistory = history.filter(entry => now - entry.timestamp < windowMs);
    validHistory.push({
      timestamp: now,
      endpoint: req.originalUrl,
      method: req.method,
      contentLength: parseInt(req.get('content-length') || '0'),
      userAgent: req.get('User-Agent') || ''
    });

    this.requestHistory.set(clientIP, validHistory);
  }

  // Détecter les tentatives d'intrusion
  async detectIntrusionAttempts(req) {
    const { clientIP, endpoint, method, userAgent, contentLength } = req.securityInfo;
    let riskScore = 0;

    // Patterns d'intrusion avancés
    const intrusionPatterns = {
      sql_injection: [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|declare|cast|set|declare)\b)/i,
        /(\bor\b|\band\b).*(\b1=1\b|\b1=2\b)/i,
        /('|(\\')|(;)|(\|)|(\*)|(%))/,
        /(\-\-|\#|\/\*|\*\/)/
      ],
      xss: [
        /(<script[^>]*>.*?<\/script>)/gi,
        /(javascript:|vbscript:|data:)/i,
        /(<iframe[^>]*>.*?<\/iframe>)/gi,
        /(onload|onerror|onclick|onmouseover)/i
      ],
      path_traversal: [
        /(\.\.\/|\.\.\\)/,
        /(%2e%2e%2f|%2e%2e%5c)/i,
        /(\/etc\/|\/proc\/|\/sys\/|\/dev\/)/i,
        /(\.\.%2f|\.\.%5c)/i
      ],
      command_injection: [
        /(\||;|&|\$\(|\`)/,
        /(\bor\b|\band\b).*(\bcat\b|\bnet\b|\bwget\b|\bcurl\b)/i,
        /(\.\.\/|\.\.\\).*(\.sh|\.bat|\.exe|\.cmd)/i
      ]
    };

    const body = req.body ? JSON.stringify(req.body) : '';
    const query = req.query ? JSON.stringify(req.query) : '';
    const fullPayload = `${body} ${query} ${userAgent}`;

    // Analyser chaque type d'attaque
    for (const [attackType, patterns] of Object.entries(intrusionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(fullPayload) || pattern.test(endpoint)) {
          riskScore += 25;

          await this.logSecurityEvent('error', 'intrusion', attackType, `Tentative d'intrusion détectée: ${attackType}`, {
            ip: clientIP,
            endpoint,
            method,
            pattern: pattern.source,
            payload: fullPayload.substring(0, 500),
            attackType
          });

          // Enregistrer la tentative d'intrusion
          await this.recordIntrusionAttempt(clientIP, attackType, endpoint, method, riskScore);

          break;
        }
      }
    }

    // Analyser les headers suspects
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto'];
    for (const header of suspiciousHeaders) {
      const value = req.get(header);
      if (value && !validator.isIP(value) && value.length > 100) {
        riskScore += 15;
        await this.logSecurityEvent('warning', 'intrusion', 'suspicious_header', `Header suspect détecté: ${header}`, {
          ip: clientIP,
          header,
          value: value.substring(0, 200)
        });
      }
    }

    // Vérifier la fréquence des requêtes
    const history = this.requestHistory.get(clientIP) || [];
    if (history.length > 50) { // Plus de 50 requêtes en 1 minute
      riskScore += 20;
    }

    return riskScore;
  }

  // Analyser les payloads suspects
  async analyzePayload(req) {
    const { clientIP, endpoint, method, contentLength, userAgent } = req.securityInfo;
    let riskScore = 0;

    // Vérifier les tailles de payload anormales
    if (contentLength > 10 * 1024 * 1024) { // 10MB
      riskScore += 30;
      await this.logSecurityEvent('warning', 'intrusion', 'large_payload', `Payload anormalement volumineux: ${contentLength} bytes`, {
        ip: clientIP,
        endpoint,
        method,
        contentLength
      });
    }

    // Vérifier les payloads trop fréquents avec le même pattern
    const history = this.requestHistory.get(clientIP) || [];
    const recentRequests = history.filter(entry => entry.endpoint === endpoint && entry.method === method);

    if (recentRequests.length > 10) { // Plus de 10 requêtes identiques en 1 minute
      riskScore += 25;
    }

    // Analyser les User-Agents suspects
    const suspiciousUserAgents = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /python-requests/i, /curl/i, /wget/i,
      /postman/i, /insomnia/i
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        riskScore += 10;
        break;
      }
    }

    // Vérifier les headers suspects
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto'];
    for (const header of suspiciousHeaders) {
      const value = req.get(header);
      if (value && !validator.isIP(value) && value.length > 100) {
        riskScore += 15;
        await this.logSecurityEvent('warning', 'intrusion', 'suspicious_header', `Header suspect détecté: ${header}`, {
          ip: clientIP,
          header,
          value: value.substring(0, 200)
        });
      }
    }

    return riskScore;
  }

  // Détecter les patterns d'attaque DDoS
  async detectDDoSPatterns(req) {
    const { clientIP, endpoint, contentLength } = req.securityInfo;
    const now = Date.now();
    const windowMs = 60000; // Fenêtre de 1 minute
    let riskScore = 0;

    // Initialiser le tracker DDoS pour cette IP
    if (!this.ddosTracker.has(clientIP)) {
      this.ddosTracker.set(clientIP, {
        count: 0,
        windowStart: now,
        totalBytes: 0,
        endpoints: new Set()
      });
    }

    const tracker = this.ddosTracker.get(clientIP);

    // Réinitialiser si la fenêtre a expiré
    if (now - tracker.windowStart > windowMs) {
      tracker.count = 0;
      tracker.totalBytes = 0;
      tracker.endpoints.clear();
      tracker.windowStart = now;
    }

    // Mettre à jour les métriques
    tracker.count++;
    tracker.totalBytes += contentLength || 0;
    tracker.endpoints.add(endpoint);

    // Détecter les patterns DDoS
    if (tracker.count > 100) { // Plus de 100 requêtes par minute
      riskScore += 40;

      // Créer une alerte DDoS si nécessaire
      if (tracker.count > 200) {
        await this.logSecurityEvent('critical', 'ddos', 'high_traffic', `Trafic anormalement élevé détecté depuis ${clientIP}`, {
          ip: clientIP,
          requestCount: tracker.count,
          totalBytes: tracker.totalBytes,
          uniqueEndpoints: tracker.endpoints.size
        });
      }
    }

    // Détecter les attaques par inondation de données
    if (tracker.totalBytes > 50 * 1024 * 1024) { // Plus de 50MB en 1 minute
      riskScore += 50;
    }

    // Détecter les attaques distribuées (même endpoint depuis plusieurs IPs)
    const endpointRequests = Array.from(tracker.endpoints).filter(ep => ep === endpoint).length;
    if (endpointRequests > 20 && tracker.endpoints.size === 1) {
      riskScore += 30;
    }

    return riskScore;
  }

  // Enregistrer une tentative d'intrusion
  async recordIntrusionAttempt(clientIP, attackType, endpoint, method, riskScore) {
    try {
      const geo = geoip.lookup(clientIP);

      await prisma.intrusionAttempt.create({
        data: {
          sourceIP: clientIP,
          country: geo ? geo.country : null,
          city: geo ? geo.city : null,
          attackType,
          targetEndpoint: endpoint,
          method,
          riskScore,
          isBlocked: riskScore > 70
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la tentative d\'intrusion:', error);
    }
  }

  // Logger une requête pour analyse DDoS
  async logRequestForDDoSAnalysis(req) {
    try {
      // Calculer le score de risque basé sur l'analyse
      const riskScore = await this.calculateRequestRisk(req);

      // Enregistrer la requête dans la base de données pour analyse
      await prisma.securityLog.create({
        data: {
          level: riskScore > 70 ? 'warning' : 'info',
          category: 'monitoring',
          eventType: 'api_request',
          message: `Requête API: ${req.method} ${req.originalUrl}`,
          sourceIP: req.securityInfo.clientIP,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200, // Sera mis à jour par le middleware de réponse
          responseTime: 0, // Sera calculé
          country: req.securityInfo.country,
          city: req.securityInfo.city,
          userAgent: req.securityInfo.userAgent,
          riskScore: riskScore,
          metadata: {
            browser: req.securityInfo.browser,
            os: req.securityInfo.os,
            contentLength: req.securityInfo.contentLength,
            referer: req.securityInfo.referer
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors du logging de la requête:', error);
    }
  }

  // Calculer le score de risque d'une requête
  async calculateRequestRisk(req) {
    let riskScore = 5; // Score de base pour les requêtes normales

    const { userAgent, endpoint, method, contentLength } = req.securityInfo;

    // Analyser l'User-Agent
    const suspiciousUserAgents = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /python-requests/i, /curl/i, /wget/i,
      /postman/i, /insomnia/i
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        riskScore += 10;
        break;
      }
    }

    // Analyser les endpoints sensibles
    const sensitiveEndpoints = ['/admin', '/api/v1/admin', '/api/v1/security'];
    if (sensitiveEndpoints.some(pattern => endpoint.includes(pattern))) {
      riskScore += 15;
    }

    // Analyser la méthode HTTP
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      riskScore += 5;
    }

    // Analyser la taille du payload
    if (contentLength > 1024 * 1024) { // > 1MB
      riskScore += 20;
    }

    return Math.min(riskScore, 100);
  }

  // Bloquer une IP
  blockIP(ip, reason) {
    this.blockedIPs.add(ip);

    logSecurityEvent('critical', 'intrusion', 'ip_blocked', `IP bloquée: ${ip} - ${reason}`, {
      ip,
      reason
    });

    // En production, on sauvegarderait cette information en base
    // et on nettoierait périodiquement la liste
  }

  // Middleware pour capturer la réponse et logger les métriques finales
  async captureResponse(req, res, next) {
    const startTime = Date.now();

    // Capturer la réponse originale
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - startTime;

      // Logger la réponse si nécessaire
      if (req.securityInfo) {
        // Mettre à jour le log existant avec le temps de réponse
        // Cette logique serait asynchrone en production
      }

      originalSend.call(this, data);
    };

    next();
  }
}

// Créer une instance du middleware
const securityMiddleware = new SecurityMiddleware();

// Middleware d'analyse de sécurité (avec gestion d'erreur)
const analyzeRequest = async (req, res, next) => {
  try {
    await securityMiddleware.analyzeRequest(req, res, next);
  } catch (error) {
    console.error('Erreur dans le middleware de sécurité:', error);
    next(); // Continuer même en cas d'erreur pour ne pas bloquer les requêtes
  }
};

// Middleware de capture de réponse
const captureResponse = (req, res, next) => {
  securityMiddleware.captureResponse(req, res, next);
};

module.exports = {
  analyzeRequest,
  captureResponse,
  securityMiddleware
};

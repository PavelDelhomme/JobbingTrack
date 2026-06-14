const logger = require('../utils/logger');
const axios = require('axios');
const { isDevTestBypassRequest } = require('../utils/devTestBypassRequest');
const { forwardCorrelationHeaders } = require('./requestCorrelation');

// Configuration des règles WAF OWASP
const WAF_RULES = {
  // Règles de base OWASP
  SQL_INJECTION: {
    patterns: [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(union(?:\s|%20|\+)+select)/gi,
      /(select(?:\s|%20|\+)+.+(?:\s|%20|\+)+from)/gi,
      /((or|and)(?:\s|%20|\+)+\d+(?:\s|%20|\+)*=(?:\s|%20|\+)*\d+)/gi,
      /(\b(and|or|not)\b\s*\w+\s*[\=\<\>])/gi,
      /--/,
      /\/\*/,
      /\*\//,
      // Patterns plus spécifiques pour éviter les faux positifs
      /(\bunion\s+select\b)/gi,
      /(\bselect\s+\*\s+from\b)/gi,
      /(\bdrop\s+table\b)/gi,
      /(\binsert\s+into\b)/gi,
      /(\bupdate\s+\w+\s+set\b)/gi,
      /(\bdelete\s+from\b)/gi,
      /(\bexec\s*\()/gi,
      /(\bexecute\s*\()/gi
    ],
    severity: 'high',
    message: 'Injection SQL détectée'
  },

  XSS: {
    patterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /%3cscript/gi,
      /%3c\/script%3e/gi,
      /javascript:/gi,
      // Évite les faux positifs sur des query params (ex. consolidated=true → « on…= »).
      /(?<![a-zA-Z0-9])on[a-z]+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<img[^>]+src\s*=\s*["'][^"']*javascript:/gi
    ],
    severity: 'high',
    message: 'Attaque XSS détectée'
  },

  PATH_TRAVERSAL: {
    patterns: [
      /\.\.\//g,
      /\.\.\\\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e\\/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /%252e%252e%252f/gi,
      /%c0%ae%c0%ae%c0%af/gi,
      /\.\.\/|\.\.\\/gi,
    ],
    severity: 'critical',
    message: 'Path Traversal détecté'
  },

  COMMAND_INJECTION: {
    patterns: [
      /(\||\$\(|\`)/g,
      /(;|%3b)\s*(rm|del|format|shutdown|wget|curl|nc|netcat|telnet|ssh|cat|whoami|id|uname)\b/gi,
      /(&&|%26%26)\s*(rm|del|format|shutdown|wget|curl|nc|netcat|telnet|ssh|cat|whoami|id|uname)\b/gi,
      /(\||%7c)\s*(rm|del|format|shutdown|wget|curl|nc|netcat|telnet|ssh|cat|whoami|id|uname)\b/gi,
      /(\b(cmd|powershell|bash|sh|\/bin\/sh|\/bin\/bash)\s+(-c|\/c)\b)/gi,
      /(\$IFS|%24IFS)/gi,
      /(\/etc\/passwd|%2fetc%2fpasswd|c:\\\\windows\\\\win.ini)/gi
    ],
    severity: 'critical',
    message: 'Command Injection détectée'
  },

  REMOTE_HOST_ACCESS: {
    patterns: [
      /(https?:\/\/|%2f%2f)(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1|host\.docker\.internal)/gi,
      /(https?:\/\/|%2f%2f)(169\.254\.169\.254|metadata\.google\.internal)/gi,
      /(https?:\/\/|%2f%2f)(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})/gi,
      /(\burl\b|\btarget\b|\bcallback\b|\bredirect\b|\bnext\b|\bhost\b)=.*(localhost|127\.0\.0\.1|169\.254\.169\.254|host\.docker\.internal)/gi
    ],
    severity: 'critical',
    message: 'Tentative d’accès remote host/SSRF interne détectée'
  },

  URL_INJECTION: {
    patterns: [
      /(\bredirect\b|\bnext\b|\breturnUrl\b|\bcallback\b|\burl\b)=\s*(https?:)?\/\/[^&\s]+/gi,
      /(\bredirect\b|\bnext\b|\breturnUrl\b|\bcallback\b|\burl\b)=.*(%0d|%0a|%250d|%250a)/gi,
      /(%2f%2e%2e|%5c%2e%2e|%252f|%255c)/gi,
      /(file|gopher|dict|ftp|ldap):\/\//gi
    ],
    severity: 'high',
    message: 'Injection URL détectée'
  },

  HOST_HEADER_SPOOFING: {
    patterns: [
      /"x-forwarded-host"\s*:\s*"[^"]*,[^"]*"/gi,
      /"host"\s*:\s*"[^"]*(?:\/|\\|@|\s|%0d|%0a)[^"]*"/gi,
      /"x-forwarded-host"\s*:\s*"(localhost|127\.0\.0\.1|169\.254\.169\.254|metadata\.google\.internal|host\.docker\.internal)[^"]*"/gi,
      /"forwarded"\s*:\s*"[^"]*host=(?:localhost|127\.0\.0\.1|169\.254\.169\.254|metadata\.google\.internal|host\.docker\.internal)[^"]*"/gi
    ],
    severity: 'high',
    message: 'Host header spoofing détecté'
  },

  LDAP_INJECTION: {
    patterns: [
      /\(\s*[&|!]/g,
      /[&|!]\s*\([^)]+=[^)]+\)/g,
      /(\|&\w+\s*[\=\<\>])/gi,
      /(\b(and|or|not)\b\s*\w+\s*[\=\<\>])/gi
    ],
    severity: 'medium',
    message: 'LDAP Injection détectée'
  },

  // Règles avancées de sécurité
  SUSPICIOUS_USER_AGENTS: {
    patterns: [
      /sqlmap/gi,
      /nikto/gi,
      /nessus/gi,
      /openvas/gi,
      /nmap/gi,
      /masscan/gi,
      /dirbuster/gi,
      /gobuster/gi,
      /wpscan/gi,
      /joomlavs/gi,
      /w3af/gi,
      /skipfish/gi,
      /owasp/gi,
      /burpsuite/gi,
      /acunetix/gi,
      /havij/gi,
      /beef/gi,
      /metasploit/gi
    ],
    severity: 'high',
    message: 'User-Agent suspect détecté'
  },

  MALICIOUS_PATTERNS: {
    patterns: [
      /eval\s*\(/gi,
      /base64_decode\s*\(/gi,
      /str_rot13\s*\(/gi,
      /gzinflate\s*\(/gi,
      /gzuncompress\s*\(/gi,
      /strrev\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /exec\s*\(/gi,
      /passthru\s*\(/gi,
      /proc_open\s*\(/gi,
      /popen\s*\(/gi
    ],
    severity: 'critical',
    message: 'Pattern malveillant détecté'
  },

  // Headers suspects
  SUSPICIOUS_HEADERS: {
    patterns: [
      /x-forwarded-for:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-real-ip:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-client-ip:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-originating-ip:\s*[^,\s]+,\s*[^,\s]+/gi
    ],
    severity: 'low',
    message: 'Headers suspects détectés'
  }
};

// Liste noire d'IPs connues pour être malveillantes
const BLACKLISTED_IPS = [
  // Ajouter des IPs blacklistées ici
  // '192.168.1.100',
  // '10.0.0.50'
];

// Liste blanche d'IPs de confiance
const WHITELISTED_IPS = [
  // IPs de confiance (serveurs de monitoring, etc.)
  // '127.0.0.1',
  // '10.0.0.1'
];

const DEFAULT_INTERNAL_BYPASS_CIDRS = [
  '127.0.0.0/8',
  '::1/128',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16'
];

function normalizeIp(ip) {
  let value = String(ip || '').trim();
  if (!value) return '';
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value.includes(',') && !value.includes(':')) value = value.split(',')[0].trim();
  return value;
}

function ipv4ToNumber(ip) {
  const parts = normalizeIp(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((parts[0] * 256 ** 3) + (parts[1] * 256 ** 2) + (parts[2] * 256) + parts[3]) >>> 0;
}

function isIpInCidr(ip, cidr) {
  const normalizedIp = normalizeIp(ip);
  const normalizedCidr = String(cidr || '').trim();
  if (!normalizedIp || !normalizedCidr) return false;
  if (!normalizedCidr.includes('/')) return normalizedIp === normalizeIp(normalizedCidr);
  const [rangeIp, prefixRaw] = normalizedCidr.split('/');
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix)) return false;
  if (normalizedIp === '::1' && normalizeIp(rangeIp) === '::1') return true;
  const ipNum = ipv4ToNumber(normalizedIp);
  const rangeNum = ipv4ToNumber(rangeIp);
  if (ipNum == null || rangeNum == null || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function getInternalBypassCidrs() {
  const configured = process.env.WAF_INTERNAL_BYPASS_CIDRS;
  if (!configured) return DEFAULT_INTERNAL_BYPASS_CIDRS;
  return configured.split(',').map((x) => x.trim()).filter(Boolean);
}

function getObservedClientIp(req) {
  return normalizeIp(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress);
}

function hasTrustedInternalSecret(req) {
  const expected = process.env.SECURITY_INTERNAL_SECRET;
  if (!expected) return false;
  return String(req.get('X-Internal-Secret') || '') === String(expected);
}

function hasForwardedEdgeHeaders(req) {
  return Boolean(
    req.get('X-Forwarded-For') ||
    req.get('X-Forwarded-Host') ||
    req.get('X-Forwarded-Proto')
  );
}

function isInternalWafBypassRequest(req) {
  if (String(process.env.WAF_INTERNAL_BYPASS_ENABLED || 'true').toLowerCase() === 'false') return false;
  // Un reverse proxy Docker a une IP interne, mais il transporte du trafic navigateur externe.
  // Sans secret machine, ce trafic doit rester inspecté par le WAF.
  if (hasForwardedEdgeHeaders(req) && !hasTrustedInternalSecret(req)) return false;
  const clientIp = getObservedClientIp(req);
  return getInternalBypassCidrs().some((cidr) => isIpInCidr(clientIp, cidr));
}

// Fonction de détection des attaques
const detectAttack = (input, rules) => {
  const detections = [];

  for (const [ruleName, rule] of Object.entries(rules)) {
    for (const pattern of rule.patterns) {
      if (typeof pattern.lastIndex === 'number') {
        pattern.lastIndex = 0;
      }
      if (pattern.test(input)) {
        detections.push({
          rule: ruleName,
          pattern: pattern.source,
          severity: rule.severity,
          message: rule.message,
          input: input.substring(0, 100) // Tronquer pour le log
        });
      }
    }
  }

  return detections;
};

function redactSensitiveEvidence(text) {
  return String(text || '')
    .replace(/\b(bearer)\s+[a-z0-9._-]+/gi, '$1 [REDACTED]')
    .replace(/("?(?:password|token|secret|authorization)"?\s*:\s*")([^"]+)(")/gi, '$1[REDACTED]$3')
    .slice(0, 500);
}

function mapSeverityToRiskScore(severity) {
  switch (severity) {
    case 'critical': return 95;
    case 'high': return 80;
    case 'medium': return 55;
    case 'low': return 25;
    default: return 40;
  }
}

async function reportWafDetections(req, detections, clientIP, url, method, userAgent, blocked) {
  const securityServiceUrl = process.env.SECURITY_SERVICE_URL || 'http://security-service:3017';
  const maxSeverity = detections.reduce((max, detection) => {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return Math.max(max, severityLevels[detection.severity] || 0);
  }, 0);
  const primaryDetection = detections.find((d) => d.severity === 'critical') || detections[0];
  const riskScore = mapSeverityToRiskScore(primaryDetection?.severity);

  try {
    await axios.post(`${securityServiceUrl}/api/v1/logs`, {
      level: maxSeverity >= 4 ? 'critical' : 'error',
      category: 'intrusion',
      eventType: 'waf_blocked_request',
      message: primaryDetection?.message || 'Requête bloquée par le WAF',
      sourceIP: clientIP,
      endpoint: url,
      method,
      userAgent,
      riskScore,
      isBlocked: blocked,
      metadata: {
        source: 'api-gateway-waf',
        detections: detections.map((detection) => ({
          rule: detection.rule,
          severity: detection.severity,
          message: detection.message,
          pattern: detection.pattern,
          evidence: redactSensitiveEvidence(detection.input)
        })),
        requestId: req?.requestId,
        correlationId: req?.correlationId,
        timestamp: new Date().toISOString()
      }
    }, {
      timeout: 1500,
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'api-gateway-waf',
        ...forwardCorrelationHeaders(req)
      }
    });
  } catch (error) {
    logger.debug('Impossible de journaliser la détection WAF dans security-service:', error.message);
  }
}

// Fonction principale de vérification WAF
const wafCheck = async (req, res, next) => {
  try {
    // Contournement WAF réservé au non-prod : en-tête secret (jamais X-Test-Mode / User-Agent Playwright).
    if (isDevTestBypassRequest(req)) {
      res.set({
        'X-WAF-Status': 'DEV_TEST_BYPASS',
        'X-Protected-By': 'JobbingTrack-WAF',
        'X-OWASP-Protection': 'DISABLED_FOR_DEV_TEST_TOKEN'
      });
      return next();
    }

    const clientIP = getObservedClientIp(req);
    const userAgent = req.get('User-Agent') || '';
    const url = req.url || '';
    const method = req.method || '';
    const headers = req.headers || {};

    if (isInternalWafBypassRequest(req)) {
      logger.debug('WAF bypass trafic interne', {
        ip: clientIP,
        url,
        method,
        bypass: 'internal_network'
      });
      res.set({
        'X-WAF-Status': 'BYPASSED_INTERNAL',
        'X-Protected-By': 'JobbingTrack-WAF',
        'X-OWASP-Protection': 'BYPASSED_FOR_INTERNAL_TRAFFIC'
      });
      return next();
    }

    // Vérification de la liste noire
    if (BLACKLISTED_IPS.includes(clientIP)) {
      logger.warn('IP blacklistée détectée', {
        ip: clientIP,
        url: url,
        userAgent: userAgent,
        method: method
      });

      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Votre adresse IP est temporairement bloquée pour des raisons de sécurité.'
      });
    }

    // Vérification de la liste blanche (si définie)
    if (WHITELISTED_IPS.length > 0 && !WHITELISTED_IPS.includes(clientIP)) {
      // Continuer les vérifications normales
    }

    // Analyser séparément les différentes parties de la requête
    const urlAndBody = [
      url,
      req.body ? JSON.stringify(req.body) : '',
      url.includes('?') ? url.split('?')[1] : ''
    ].join(' ');

    const headerString = JSON.stringify(headers);

    // User-Agents légitimes à ne pas analyser avec les patterns SQL
    const legitimateUserAgents = [
      /curl\/\d+\.\d+/i,
      /Mozilla\/\d+\.\d+/i,
      /PostmanRuntime\/\d+\.\d+/i,
      /axios\/\d+\.\d+/i
    ];

    const isLegitimateUserAgent = legitimateUserAgents.some(pattern => pattern.test(userAgent));

    // Analyser l'URL et le body avec tous les patterns
    const urlDetections = detectAttack(urlAndBody, WAF_RULES);

    // Analyser les headers seulement avec des patterns spécifiques (pas SQL injection)
    const headerRules = { ...WAF_RULES };
    delete headerRules.SQL_INJECTION;
    delete headerRules.XSS;
    const headerDetections = detectAttack(headerString, headerRules);

    // Analyser le User-Agent seulement si ce n'est pas un User-Agent légitime
    let userAgentDetections = [];
    if (!isLegitimateUserAgent) {
      userAgentDetections = detectAttack(userAgent, {
        SUSPICIOUS_USER_AGENTS: WAF_RULES.SUSPICIOUS_USER_AGENTS,
        MALICIOUS_PATTERNS: WAF_RULES.MALICIOUS_PATTERNS
      });
    }

    const detections = [...urlDetections, ...headerDetections, ...userAgentDetections];

    if (detections.length > 0) {
      // Log de l'incident de sécurité
      logger.warn('Attaque détectée par WAF', {
        ip: clientIP,
        url: url,
        method: method,
        userAgent: userAgent,
        detections: detections,
        timestamp: new Date().toISOString()
      });

      // Réponse basée sur la sévérité
      const maxSeverity = detections.reduce((max, detection) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        return Math.max(max, severityLevels[detection.severity]);
      }, 0);

      if (maxSeverity >= 3) { // high ou critical
        await reportWafDetections(req, detections, clientIP, url, method, userAgent, true);
        // Bloquer immédiatement les attaques graves
        return res.status(403).json({
          success: false,
          error: 'Requête bloquée',
          message: 'Votre requête a été identifiée comme potentiellement malveillante et a été bloquée.',
          code: 'WAF_BLOCKED'
        });
      } else {
        await reportWafDetections(req, detections, clientIP, url, method, userAgent, false);
        // Log seulement pour les menaces modérées
        logger.info('Activité suspecte détectée', {
          ip: clientIP,
          url: url,
          detections: detections
        });
      }
    }

    // Vérifications spécifiques par endpoint
    if (url.includes('/api/') || url.includes('/auth/')) {
      // Vérifications supplémentaires pour les APIs sensibles

      // Vérifier les headers de sécurité
      const suspiciousHeaders = detectAttack(JSON.stringify(headers), {
        SUSPICIOUS_HEADERS: WAF_RULES.SUSPICIOUS_HEADERS
      });

      if (suspiciousHeaders.length > 0) {
        logger.warn('Headers suspects détectés', {
          ip: clientIP,
          headers: suspiciousHeaders
        });
      }

      // Vérifier les paramètres de requête pour les injections
      if (url.includes('?')) {
        const queryParams = url.split('?')[1];
        const queryDetections = detectAttack(queryParams, {
          SQL_INJECTION: WAF_RULES.SQL_INJECTION,
          XSS: WAF_RULES.XSS
        });

        if (queryDetections.length > 0) {
          logger.warn('Injection détectée dans les paramètres', {
            ip: clientIP,
            url: url,
            detections: queryDetections
          });

          return res.status(400).json({
            success: false,
            error: 'Paramètres invalides',
            message: 'Les paramètres de votre requête contiennent des caractères non autorisés.'
          });
        }
      }
    }

    // Ajout des headers de sécurité
    res.set({
      'X-WAF-Status': 'PASSED',
      'X-Protected-By': 'JobbingTrack-WAF',
      'X-OWASP-Protection': 'ENABLED'
    });

    next();
  } catch (error) {
    logger.error('Erreur WAF:', error);

    // En cas d'erreur, continuer (fail open) mais logger l'incident
    res.set({
      'X-WAF-Status': 'ERROR',
      'X-WAF-Error': 'Internal WAF error'
    });

    next();
  }
};

// Fonction pour ajouter une IP à la liste noire temporairement
const blacklistIP = async (ip, durationMinutes = 60) => {
  try {
    // Dans un environnement réel, utiliser Redis pour stocker la blacklist temporaire
    logger.warn(`IP ajoutée à la blacklist temporaire: ${ip} pour ${durationMinutes} minutes`);
    // Implémentation Redis à ajouter selon les besoins
  } catch (error) {
    logger.error('Erreur ajout IP blacklist:', error);
  }
};

// Fonction pour vérifier le statut WAF
const getWAFStats = async () => {
  try {
    // Récupérer les statistiques depuis Redis ou un système de logs
    return {
      timestamp: new Date().toISOString(),
      status: 'active',
      rules: Object.keys(WAF_RULES).length,
      blacklistedIPs: BLACKLISTED_IPS.length,
      whitelistedIPs: WHITELISTED_IPS.length,
      internalBypassEnabled: String(process.env.WAF_INTERNAL_BYPASS_ENABLED || 'true').toLowerCase() !== 'false',
      internalBypassCidrs: getInternalBypassCidrs(),
      realTimeData: true
    };
  } catch (error) {
    logger.error('Erreur récupération stats WAF:', error);
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      rules: 0,
      blacklistedIPs: 0,
      whitelistedIPs: 0,
      realTimeData: false
    };
  }
};

// Middleware pour les endpoints d'administration WAF
const adminWAFMiddleware = async (req, res, next) => {
  // Vérification supplémentaire pour les endpoints admin
  const clientIP = req.ip;

  // Liste blanche stricte pour l'administration
  const ADMIN_WHITELIST = process.env.ADMIN_WHITELIST_IPS ?
    process.env.ADMIN_WHITELIST_IPS.split(',') : [];

  if (ADMIN_WHITELIST.length > 0 && !ADMIN_WHITELIST.includes(clientIP)) {
    logger.warn('Tentative d\'accès admin depuis IP non autorisée', {
      ip: clientIP,
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: 'Accès refusé',
      message: 'Accès administrateur refusé depuis cette adresse IP.'
    });
  }

  next();
};

module.exports = {
  wafCheck,
  adminWAFMiddleware,
  blacklistIP,
  getWAFStats,
  WAF_RULES,
  BLACKLISTED_IPS,
  WHITELISTED_IPS,
  isInternalWafBypassRequest,
  isIpInCidr,
  getObservedClientIp
};

/**
 * Contrôleur pour la gestion du WAF (Web Application Firewall)
 * Expose les mêmes endpoints que l'API Gateway pour la configuration WAF
 */

const { logger, logSecurityEvent } = require('../utils/logger');
const securityService = require('../services/securityService');

// Configuration des règles WAF (identique à api-gateway)
const WAF_RULES = {
  SQL_INJECTION: {
    patterns: [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /('|(\\')|(;)|(\|)|(\*)|(%)|(\+)|(\-)|(\=)|(\^)|(\{)|(\})|(\[)|(\])|(\()|(\)))/g,
      /(\b(and|or|not)\b\s*\w+\s*[\=\<\>])/gi,
      /--/,
      /\/\*/,
      /\*\//,
      /(\b(script|javascript|vbscript|onload|onerror|onclick|onsubmit|onreset|onfocus|onblur)\b)/gi,
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
    message: 'Injection SQL détectée',
    enabled: true
  },
  XSS: {
    patterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<img[^>]+src\s*=\s*["'][^"']*javascript:/gi
    ],
    severity: 'high',
    message: 'Attaque XSS détectée',
    enabled: true
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
    message: 'Path Traversal détecté',
    enabled: true
  },
  COMMAND_INJECTION: {
    patterns: [
      /[;&|`$\(\){}<>]/g,
      /(\||\$\(|\`)/g,
      /(rm\s|del\s|format\s|shutdown\s)/gi,
      /(wget|curl|nc|netcat|telnet|ssh)/gi,
      /(cmd|powershell|bash|sh)\s/gi
    ],
    severity: 'critical',
    message: 'Command Injection détectée',
    enabled: true
  },
  LDAP_INJECTION: {
    patterns: [
      /(\*|\(|\))/g,
      /(\|&\w+\s*[\=\<\>])/gi,
      /(\b(and|or|not)\b\s*\w+\s*[\=\<\>])/gi
    ],
    severity: 'medium',
    message: 'LDAP Injection détectée',
    enabled: true
  },
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
    severity: 'medium',
    message: 'User-Agent suspect détecté',
    enabled: true
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
    message: 'Pattern malveillant détecté',
    enabled: true
  },
  SUSPICIOUS_HEADERS: {
    patterns: [
      /x-forwarded-for:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-real-ip:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-client-ip:\s*[^,\s]+,\s*[^,\s]+/gi,
      /x-originating-ip:\s*[^,\s]+,\s*[^,\s]+/gi
    ],
    severity: 'low',
    message: 'Headers suspects détectés',
    enabled: true
  }
};

// Liste noire d'IPs (peut être étendue avec Redis)
const BLACKLISTED_IPS = [];
const WHITELISTED_IPS = [];

// État du WAF (peut être stocké en base de données)
let wafEnabled = process.env.WAF_ENABLED === 'true';

/**
 * GET /api/v1/security/waf/config
 * Récupérer la configuration WAF
 */
async function getWafConfig(req, res) {
  try {
    const rules = Object.keys(WAF_RULES).map(ruleName => ({
      name: ruleName,
      enabled: WAF_RULES[ruleName].enabled !== false,
      severity: WAF_RULES[ruleName].severity,
      description: WAF_RULES[ruleName].message,
      patternsCount: WAF_RULES[ruleName].patterns.length
    }));

    res.json({
      success: true,
      data: {
        enabled: wafEnabled,
        rules
      }
    });
  } catch (error) {
    logger.error('Erreur récupération config WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration WAF'
    });
  }
}

/**
 * PUT /api/v1/security/waf/toggle
 * Activer/désactiver le WAF
 */
async function toggleWaf(req, res) {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre enabled doit être un booléen'
      });
    }

    const oldState = wafEnabled;
    wafEnabled = enabled;
    // TODO: Sauvegarder en base de données ou dans un fichier de configuration
    
    logger.info(`WAF ${enabled ? 'activé' : 'désactivé'}`);
    
    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    await securityService.createSecurityLog({
      level: enabled ? 'info' : 'warning',
      category: 'waf',
      eventType: 'waf_toggled',
      message: `WAF ${enabled ? 'activé' : 'désactivé'}${enabled ? '' : ' - ATTENTION: Protection désactivée'}`,
      sourceIP: clientIP,
      userAgent: userAgent,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      riskScore: enabled ? 10 : 60,
      isBlocked: false,
      metadata: {
        oldState: oldState,
        newState: enabled,
        toggledBy: clientIP,
        toggledByUser: req.user?.id || null,
        toggledAt: new Date().toISOString()
      }
    }).catch(err => {
      logger.error('Erreur création log sécurité pour toggle WAF:', err);
    });
    
    res.json({
      success: true,
      message: `WAF ${enabled ? 'activé' : 'désactivé'}`,
      data: { enabled: wafEnabled }
    });
  } catch (error) {
    logger.error('Erreur toggle WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'activation/désactivation du WAF'
    });
  }
}

/**
 * PUT /api/v1/security/waf/rules/:ruleName
 * Activer/désactiver une règle WAF spécifique
 */
async function toggleWafRule(req, res) {
  try {
    const { ruleName } = req.params;
    const { enabled } = req.body;

    if (!WAF_RULES[ruleName]) {
      return res.status(404).json({
        success: false,
        error: 'Règle WAF non trouvée'
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre enabled doit être un booléen'
      });
    }

    const oldState = WAF_RULES[ruleName].enabled;
    WAF_RULES[ruleName].enabled = enabled;
    // TODO: Sauvegarder en base de données
    
    logger.info(`Règle WAF ${ruleName} ${enabled ? 'activée' : 'désactivée'}`);
    
    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const ruleSeverity = WAF_RULES[ruleName].severity;
    const riskScore = enabled ? 10 : (ruleSeverity === 'critical' ? 70 : ruleSeverity === 'high' ? 50 : 30);
    
    await securityService.createSecurityLog({
      level: enabled ? 'info' : 'warning',
      category: 'waf',
      eventType: 'waf_rule_toggled',
      message: `Règle WAF ${ruleName} ${enabled ? 'activée' : 'désactivée'} (${ruleSeverity})`,
      sourceIP: clientIP,
      userAgent: userAgent,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      riskScore: riskScore,
      isBlocked: false,
      metadata: {
        ruleName: ruleName,
        ruleSeverity: ruleSeverity,
        oldState: oldState,
        newState: enabled,
        patternsCount: WAF_RULES[ruleName].patterns.length,
        toggledBy: clientIP,
        toggledByUser: req.user?.id || null,
        toggledAt: new Date().toISOString()
      }
    }).catch(err => {
      logger.error('Erreur création log sécurité pour toggle règle WAF:', err);
    });
    
    res.json({
      success: true,
      message: `Règle ${ruleName} ${enabled ? 'activée' : 'désactivée'}`,
      data: {
        ruleName,
        enabled: WAF_RULES[ruleName].enabled
      }
    });
  } catch (error) {
    logger.error('Erreur toggle règle WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'activation/désactivation de la règle WAF'
    });
  }
}

/**
 * GET /api/v1/security/waf/stats
 * Récupérer les statistiques WAF
 */
async function getWafStats(req, res) {
  try {
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        status: wafEnabled ? 'active' : 'disabled',
        rules: Object.keys(WAF_RULES).length,
        enabledRules: Object.values(WAF_RULES).filter(r => r.enabled !== false).length,
        blacklistedIPs: BLACKLISTED_IPS.length,
        whitelistedIPs: WHITELISTED_IPS.length,
        realTimeData: true
      }
    });
  } catch (error) {
    logger.error('Erreur récupération stats WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques WAF'
    });
  }
}

module.exports = {
  getWafConfig,
  toggleWaf,
  toggleWafRule,
  getWafStats
};


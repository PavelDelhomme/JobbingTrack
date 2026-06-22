/**
 * Filtre Winston pour ignorer les erreurs P2021 (table non trouvée) en développement
 * À utiliser dans tous les services pour éviter le spam de logs
 */
const winston = require('winston');

const filterP2021Errors = winston.format((info) => {
  // En développement, ignorer TOUTES les erreurs P2021 (table non trouvée)
  if (process.env.NODE_ENV === 'development') {
    // Vérifier dans le message
    if (info.message && typeof info.message === 'string') {
      const message = info.message.toLowerCase();
      if (message.includes('p2021') || 
          message.includes('does not exist') ||
          message.includes('table') && (message.includes('not exist') || message.includes('does not exist')) ||
          message.includes('invalid') && message.includes('invocation') ||
          message.includes('prismaclientknownrequesterror') ||
          message.includes('security_metrics') ||
          message.includes('table user non trouvée') ||
          message.includes('table company non trouvée') ||
          message.includes('table application non trouvée')) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier dans les métadonnées
    if (info.meta) {
      if (info.meta.code === 'P2021' || 
          (info.meta.table && (info.meta.table.includes('security_metrics') || 
                               info.meta.table.includes('User') || 
                               info.meta.table.includes('Company') || 
                               info.meta.table.includes('Application'))) ||
          (typeof info.meta === 'string' && info.meta.includes('does not exist'))) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier dans l'erreur
    if (info.error) {
      if (info.error.code === 'P2021' || 
          (info.error.message && info.error.message.includes('does not exist')) ||
          (info.error.meta && info.error.meta.code === 'P2021')) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier le code directement
    if (info.code === 'P2021') {
      return false; // Ne pas logger
    }
    
    // Vérifier dans la stack trace
    if (info.stack && typeof info.stack === 'string') {
      const stack = info.stack.toLowerCase();
      if (stack.includes('p2021') || 
          stack.includes('does not exist') ||
          stack.includes('security_metrics') ||
          stack.includes('prismaclientknownrequesterror')) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier dans l'objet error complet
    if (info.err && typeof info.err === 'object') {
      if (info.err.code === 'P2021' || 
          (info.err.message && info.err.message.includes('does not exist'))) {
        return false; // Ne pas logger
      }
    }
  }
  return info;
});

/**
 * Format printf personnalisé pour filtrer les erreurs P2021 dans la console
 */
const filterP2021InPrintf = winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
  // Filtrer les erreurs P2021 dans le printf aussi
  if (process.env.NODE_ENV === 'development') {
    const msg = (message || '').toLowerCase();
    if (msg.includes('p2021') || 
        msg.includes('does not exist') || 
        msg.includes('security_metrics') ||
        msg.includes('table') && msg.includes('not exist') ||
        msg.includes('invalid') && msg.includes('invocation') ||
        msg.includes('table user non trouvée') ||
        msg.includes('table company non trouvée') ||
        msg.includes('table application non trouvée')) {
      return ''; // Ne pas afficher
    }
    
    // Vérifier dans meta
    try {
      const metaStr = JSON.stringify(meta).toLowerCase();
      if (metaStr.includes('p2021') || 
          metaStr.includes('does not exist') ||
          metaStr.includes('security_metrics') ||
          metaStr.includes('prismaclientknownrequesterror')) {
        return ''; // Ne pas afficher
      }
    } catch (e) {
      // Ignorer les erreurs de sérialisation
    }
    
    if (meta && (meta.code === 'P2021' || (meta.error && meta.error.code === 'P2021'))) {
      return ''; // Ne pas afficher
    }
  }
  const serviceLabel = service || process.env.SERVICE_NAME || process.env.npm_package_name || 'app';
  let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${serviceLabel}] ${level}: ${message}${metaStr}`;
});

module.exports = {
  filterP2021Errors,
  filterP2021InPrintf
};


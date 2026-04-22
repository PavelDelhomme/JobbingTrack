'use strict';

/**
 * Erreurs réseau typiques quand la stack n’est pas démarrée (make up-full) ou mauvais port (.env).
 */
function isApiConnectionError(error) {
  if (!error) return false;
  const code = error.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT'
  );
}

function warnApiDown(context, error) {
  // eslint-disable-next-line no-console
  console.warn(
    `⚠ API injoignable (${context}) — ${error.code || 'erreur'}: ${error.message || error}. ` +
      'Lancez la stack (make up-full) et vérifiez API_GATEWAY_URL / API_GATEWAY_PORT (ex. 5002).'
  );
}

module.exports = { isApiConnectionError, warnApiDown };

/**
 * URL du frontend utilisée dans les liens des emails (vérification, reset password, etc.).
 * Si FRONTEND_URL contient localhost ou 127.0.0.1 et que HOST_IP est défini,
 * remplace par HOST_IP pour que les liens fonctionnent depuis un autre appareil (ex. téléphone).
 */
function getPublicFrontendUrl() {
  let url = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
  const hostIp = process.env.HOST_IP;
  if (hostIp && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    url = url.replace(/localhost|127\.0\.0\.1/g, hostIp.trim());
  }
  return url;
}

module.exports = { getPublicFrontendUrl };

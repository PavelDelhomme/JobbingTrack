function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim() === '') {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

function isEmailTriageIntegrationEnabled() {
  return String(process.env.TEST_EMAIL_TRIAGE_ENABLED || '').toLowerCase() === 'true';
}

module.exports = {
  requireEnv,
  isEmailTriageIntegrationEnabled,
};

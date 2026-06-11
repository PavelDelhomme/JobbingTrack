const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const VALIDATOR = path.join(ROOT, 'scripts/env/env-validate-runtime.cjs');

function writeEnv(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-env-prod-'));
  const file = path.join(dir, '.env.production');
  const values = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://jobbingtrack:StrongPostgresPass12345@postgres:5432/jobbingtrack?schema=public',
    JWT_SECRET: 'strong-jwt-secret-prod-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_REFRESH_SECRET: 'strong-refresh-secret-prod-64-chars-bbbbbbbbbbbbbbbbbbbbbbbb',
    SECURITY_INTERNAL_SECRET: 'strong-internal-secret-prod-64-chars-cccccccccccccccc',
    POSTGRES_USER: 'jobbingtrack',
    POSTGRES_PASSWORD: 'StrongPostgresPass12345',
    POSTGRES_DB: 'jobbingtrack',
    ALLOWED_ORIGINS: 'https://app.example.com,https://api.example.com',
    WAF_ENABLED: 'true',
    ENABLE_METRICS_AUTH: 'true',
    METRICS_API_KEY: 'strong-metrics-api-key-1234567890',
    SECURITY_ALERT_EMAIL_ENABLED: 'true',
    SECURITY_ALERT_EMAIL: 'security@example.com',
    NOTIFICATION_SERVICE_URL: 'http://notification-service:3008',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'noreply@example.com',
    SMTP_PASS: 'smtp-secret-prod-value-Z9vQ7mL4rT8nK2pX',
    SMTP_FROM: 'JobbingTrack <noreply@example.com>',
    SMTP_SECURE: 'true',
    SMTP_USE_SSL: 'false',
    DEV_AUTH_BYPASS_TOKEN: '',
    ...overrides,
  };

  fs.writeFileSync(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n',
  );

  return { dir, file };
}

function runValidator(file) {
  return spawnSync(process.execPath, [VALIDATOR, '--production', '--file', file], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function expectSuccess(result) {
  if (result.status !== 0) {
    throw new Error([
      `Expected validator success, received status ${result.status}`,
      '--- stdout ---',
      result.stdout,
      '--- stderr ---',
      result.stderr,
    ].join('\n'));
  }
}

describe('env-validate-runtime production SMTP', () => {
  test('accepte un SMTP fournisseur réel en production', () => {
    const { file } = writeEnv();

    const result = runValidator(file);

    expectSuccess(result);
    expect(result.stdout).toContain('Configuration runtime acceptable');
  });

  test('refuse MailHog comme SMTP principal en production', () => {
    const { file } = writeEnv({ SMTP_HOST: 'mailhog' });

    const result = runValidator(file);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('SMTP_HOST doit pointer vers un fournisseur SMTP réel');
  });

  test('refuse de forcer MailHog sur notification-service en production', () => {
    const { file } = writeEnv({ NOTIFICATION_SMTP_HOST: 'mailhog' });

    const result = runValidator(file);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('NOTIFICATION_SMTP_HOST ne doit pas forcer MailHog');
  });
});

#!/usr/bin/env node
/**
 * Diagnostic boîtes mail inscription vs agent — sans afficher de secrets.
 * Usage: node scripts/mobile/setup/diagnose-registration-email.js
 * @used-by docs/mobile/BOITE_MAIL_INSCRIPTION_TESTS.md, VALIDATION_ETAPE_1_INSCRIPTION.md
 */

const { loadRootEnv, GATEWAY_URL } = require('../lib/resolve-admin-credentials');
const { resolveEmailTriageEnv } = require('../lib/resolve-email-triage-env');
const { resolveBaseTestEmail, uniqueTestEmail } = require('../lib/resolve-test-email-env');

function maskEmail(email) {
  if (!email || !email.includes('@')) return '(absent)';
  const [local, domain] = email.split('@');
  const show = local.length <= 4 ? local[0] + '***' : local.slice(0, 4) + '***';
  return `${show}@${domain}`;
}

async function main() {
  loadRootEnv();
  const cfg = resolveEmailTriageEnv();
  let base;
  try {
    base = resolveBaseTestEmail();
  } catch (e) {
    base = null;
  }

  console.log('\n=== Diagnostic mail inscription mobile ===\n');
  console.log('Gateway:', GATEWAY_URL);

  try {
    const h = await fetch(`${GATEWAY_URL}/api/v1/health`);
    console.log('Health:', h.status === 200 ? 'OK' : `HTTP ${h.status}`);
  } catch (e) {
    console.log('Health: KO —', e.message);
  }

  console.log('\n--- Inscription (vérif email compte) ---');
  console.log('TEST_REAL_EMAIL (.env):     ', maskEmail(process.env.TEST_REAL_EMAIL));
  console.log('Base smokes inscription:    ', maskEmail(base));
  if (base) {
    console.log('Exemple alias smoke API:    ', maskEmail(uniqueTestEmail(base)));
  }
  console.log('Où lire le mail porteur:    ', maskEmail(base), '(webmail OVH — les alias +mob arrivent sur la boîte de base)');
  console.log('PAS pour inscription:       ', maskEmail(cfg.readAccount), '(agent email / triage uniquement)');

  console.log('\n--- Agent email (hors inscription) ---');
  console.log('EMAIL_TRIAGE_READ_ACCOUNT:  ', maskEmail(cfg.readAccount));
  console.log('Forward / digest (Gmail pro):', maskEmail(cfg.forwardAddress));
  console.log('IMAP Gmail prêt:            ', cfg.gmailImap ? 'oui' : 'non');
  console.log('IMAP OVH agent prêt:        ', cfg.ovhImap ? 'oui' : 'non');

  console.log('\n--- Rappel ---');
  console.log('• Inscription mobile → mail envoyé à l\'adresse SAISIE dans le formulaire.');
  console.log('• candidatures@… = boîte agent, pas la boîte des vérifs inscription.');
  console.log('• Voir docs/mobile/BOITE_MAIL_INSCRIPTION_TESTS.md\n');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

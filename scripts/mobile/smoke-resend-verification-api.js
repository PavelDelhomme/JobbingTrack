#!/usr/bin/env node
/**
 * Smoke API : inscription → renvoi email vérification → nouveau token utilisable.
 *
 *   node scripts/mobile/smoke-resend-verification-api.js
 */

const {
  uniqueTestEmail,
  resolveVerificationPassword,
  resolveBaseTestEmail,
  registerUser,
  GATEWAY_URL,
} = require('./resolve-test-email-env');
const { resolveVerificationToken, fetchPostgresToken } = require('./extract-verification-token');

async function resendVerification(email) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function verifyEmailToken(token) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/verify-email/${token}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, status: res.status, data };
}

(async () => {
  console.log(`=== Smoke resend verification API — ${GATEWAY_URL} ===`);

  const baseEmail = resolveBaseTestEmail();
  const { password } = resolveVerificationPassword();
  const email = uniqueTestEmail(baseEmail);
  console.log(`Compte test : ${email}`);

  const reg = await registerUser(email, password);
  console.log(`✅ Inscription (${reg.created ? 'créé' : 'existant → renvoi initial'})`);

  await new Promise((r) => setTimeout(r, reg.created ? 5000 : 2000));
  const first = await resolveVerificationToken(email);
  console.log(`✅ Token initial (${first.source})`);

  const resend = await resendVerification(email);
  if (!resend.ok || resend.data.success === false) {
    throw new Error(
      resend.data.error || resend.data.message || `resend-verification HTTP ${resend.status}`,
    );
  }
  console.log('✅ POST /auth/resend-verification');

  await new Promise((r) => setTimeout(r, 2000));
  const second = fetchPostgresToken(email);
  if (!second?.token) throw new Error('Token après renvoi introuvable en BDD');
  if (second.token === first.token) {
    throw new Error('Le token BDD n’a pas changé après resend-verification');
  }
  console.log(`✅ Nouveau token après renvoi (${second.source})`);

  const verify = await verifyEmailToken(second.token);
  if (!verify.ok) {
    throw new Error(`verify-email HTTP ${verify.status}: ${JSON.stringify(verify.data)}`);
  }
  console.log('✅ GET /auth/verify-email/:token (token du renvoi)');

  const already = await resendVerification(email);
  if (already.status !== 400) {
    throw new Error(`Attendu 400 si déjà vérifié, reçu ${already.status}`);
  }
  console.log('✅ Renvoi refusé après vérification (400)');

  console.log('\nSmoke resend verification API OK');
})().catch((e) => {
  console.error('Smoke resend verification API KO:', e.message);
  process.exit(1);
});

/**
 * Destinataire effectif du digest agent email.
 * - Utilisateurs normaux : email d'inscription (user.email).
 * - Porteur / override (.env) : EMAIL_TRIAGE_DIGEST_RECIPIENT si user listé dans
 *   EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS (virgules).
 */

function extractEmailAddress(value) {
  if (!value) return '';
  const text = String(value).trim();
  const angle = text.match(/<([^>]+)>/);
  return (angle ? angle[1] : text).trim().toLowerCase();
}

function parseOverrideEmails(env = process.env) {
  const raw =
    env.EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS ||
    env.TEST_USER_EMAIL ||
    '';
  return String(raw)
    .split(',')
    .map((s) => extractEmailAddress(s))
    .filter(Boolean);
}

function resolveDigestRecipient(user, env = process.env) {
  const accountEmail = extractEmailAddress(user?.email);
  const overrideRecipient = extractEmailAddress(env.EMAIL_TRIAGE_DIGEST_RECIPIENT);
  const overrideEmails = parseOverrideEmails(env);

  if (overrideRecipient && overrideEmails.includes(accountEmail)) {
    return {
      to: overrideRecipient,
      accountEmail,
      source: 'env_override',
    };
  }

  return {
    to: accountEmail,
    accountEmail,
    source: 'user_email',
  };
}

module.exports = {
  extractEmailAddress,
  parseOverrideEmails,
  resolveDigestRecipient,
};

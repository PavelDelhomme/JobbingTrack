const JOBBINGTRACK_DOMAIN = 'jobbingtrack.com';
const DEFAULT_DIGEST_FROM = 'JobbingTrack <noreply@jobbingtrack.com>';

function extractEmailAddress(value) {
  if (!value) return '';
  const text = String(value).trim();
  const angle = text.match(/<([^>]+)>/);
  return (angle ? angle[1] : text).trim().toLowerCase();
}

function isJobbingTrackSender(value) {
  const address = extractEmailAddress(value);
  return address.endsWith(`@${JOBBINGTRACK_DOMAIN}`);
}

function isPlaceholderRecipient(value) {
  const address = extractEmailAddress(value);
  return (
    !address ||
    address.endsWith('@example.invalid') ||
    address.endsWith('@jobbingtrack.test')
  );
}

function resolveDigestIdentity(env = process.env) {
  const from =
    env.EMAIL_TRIAGE_DIGEST_FROM ||
    (isJobbingTrackSender(env.SMTP_FROM) ? env.SMTP_FROM : DEFAULT_DIGEST_FROM);
  const replyTo = env.EMAIL_TRIAGE_DIGEST_REPLY_TO || env.SMTP_REPLY_TO || '';
  const recipient = env.EMAIL_TRIAGE_DIGEST_RECIPIENT || env.TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT || '';

  const issues = [];
  if (!isJobbingTrackSender(from)) {
    issues.push({
      field: 'EMAIL_TRIAGE_DIGEST_FROM',
      reason: 'sender_must_use_jobbingtrack_domain',
    });
  }
  if (isPlaceholderRecipient(recipient)) {
    issues.push({
      field: 'EMAIL_TRIAGE_DIGEST_RECIPIENT',
      reason: 'recipient_must_be_configured_outside_git',
    });
  }

  return {
    valid: issues.length === 0,
    from,
    fromAddress: extractEmailAddress(from),
    replyTo,
    recipient,
    recipientAddress: extractEmailAddress(recipient),
    issues,
  };
}

module.exports = {
  DEFAULT_DIGEST_FROM,
  JOBBINGTRACK_DOMAIN,
  extractEmailAddress,
  isJobbingTrackSender,
  isPlaceholderRecipient,
  resolveDigestIdentity,
};

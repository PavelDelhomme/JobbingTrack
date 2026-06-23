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

function resolveDigestFrom(env = process.env) {
  const from =
    env.EMAIL_TRIAGE_DIGEST_FROM ||
    (isJobbingTrackSender(env.SMTP_FROM) ? env.SMTP_FROM : DEFAULT_DIGEST_FROM);
  const replyTo = env.EMAIL_TRIAGE_DIGEST_REPLY_TO || env.SMTP_REPLY_TO || '';

  if (!isJobbingTrackSender(from)) {
    return {
      valid: false,
      reason: 'sender_must_use_jobbingtrack_domain',
      from,
    };
  }

  return {
    valid: true,
    from,
    replyTo,
  };
}

module.exports = {
  DEFAULT_DIGEST_FROM,
  extractEmailAddress,
  isJobbingTrackSender,
  resolveDigestFrom,
};

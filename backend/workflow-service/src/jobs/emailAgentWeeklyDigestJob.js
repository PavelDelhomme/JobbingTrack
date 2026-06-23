const axios = require('axios');
const logger = require('../utils/logger');

async function runEmailAgentWeeklyDigestJob(options = {}) {
  const authUrl = process.env.AUTH_SERVICE_URL || 'http://jobbingtrack-auth-service:3001';
  const token = process.env.INTERNAL_CRON_TOKEN || process.env.JWT_SECRET;
  if (!token) {
    logger.warn('Email agent weekly digest skipped: INTERNAL_CRON_TOKEN/JWT_SECRET missing');
    return { skipped: true, reason: 'missing_token' };
  }

  try {
    const response = await axios.post(
      `${authUrl}/api/v1/email-agent/internal/cron-digest-weekly`,
      options,
      {
        headers: { 'X-Internal-Cron-Token': token },
        timeout: 120000,
      },
    );
    const payload = response.data || {};
    logger.info(
      `📬 Email agent weekly digest completed: sent=${payload.sent || 0} skipped=${payload.skipped || 0} failed=${payload.failed || 0}`,
    );
    return payload;
  } catch (error) {
    logger.error(`Email agent weekly digest failed: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

module.exports = {
  runEmailAgentWeeklyDigestJob,
};

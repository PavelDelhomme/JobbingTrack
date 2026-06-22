const axios = require('axios');
const logger = require('../utils/logger');

async function runEmailAgentSyncJob() {
  const authUrl = process.env.AUTH_SERVICE_URL || 'http://jobbingtrack-auth-service:3001';
  const token = process.env.INTERNAL_CRON_TOKEN || process.env.JWT_SECRET;
  if (!token) {
    logger.warn('Email agent sync skipped: INTERNAL_CRON_TOKEN/JWT_SECRET missing');
    return { skipped: true, reason: 'missing_token' };
  }

  try {
    const response = await axios.post(
      `${authUrl}/api/v1/email-agent/internal/cron-sync`,
      {},
      {
        headers: { 'X-Internal-Cron-Token': token },
        timeout: 120000,
      },
    );
    logger.info(`📬 Email agent sync completed: ${JSON.stringify(response.data?.results?.length || 0)} mailboxes`);
    return response.data;
  } catch (error) {
    logger.error(`Email agent sync failed: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

module.exports = {
  runEmailAgentSyncJob,
};

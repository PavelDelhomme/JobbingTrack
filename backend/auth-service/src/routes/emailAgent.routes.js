const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const emailAgentController = require('../controllers/emailAgent.controller');

router.get('/oauth/google/callback', emailAgentController.googleOAuthCallback);

router.post('/internal/cron-sync', async (req, res, next) => {
  try {
    const expected = process.env.INTERNAL_CRON_TOKEN || process.env.JWT_SECRET;
    const token = req.headers['x-internal-cron-token'];
    if (!expected || token !== expected) {
      return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const emailAgentService = require('../services/emailAgentService');
    const results = await emailAgentService.syncAllEnabledMailboxes();
    return res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.get('/status', emailAgentController.getStatus);
router.put('/consents', emailAgentController.updateConsents);
router.get('/oauth/google/start', emailAgentController.startGoogleOAuth);
router.post('/mailboxes/imap', emailAgentController.connectImap);
router.delete('/mailboxes/:mailboxId', emailAgentController.revokeMailboxHandler);
router.get('/triage', emailAgentController.listTriage);
router.patch('/triage/:messageId', emailAgentController.reviewTriage);
router.post('/sync', emailAgentController.syncNow);

router.put('/users/:userId/agent-enabled', requireAdmin, emailAgentController.setAgentFlag);

module.exports = router;

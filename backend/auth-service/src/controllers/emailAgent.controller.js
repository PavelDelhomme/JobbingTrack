const emailAgentService = require('../services/emailAgentService');
const emailAgentLinkService = require('../services/emailAgentLinkService');
const emailAgentActionService = require('../services/emailAgentActionService');
const { discoverImapSettings } = require('../services/imapDiscoveryService');
const { getAuthorizationUrl, parseStateToken } = require('../services/gmailOAuthService');
const logger = require('../utils/logger');

function handleError(res, error) {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    error: error.code || error.message || 'internal_error',
    message: error.message,
  });
}

function requestMeta(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

const getStatus = async (req, res) => {
  try {
    const status = await emailAgentService.getAgentStatus(req.user.id);
    res.json({ success: true, ...status });
  } catch (error) {
    handleError(res, error);
  }
};

const updateConsents = async (req, res) => {
  try {
    const consents = await emailAgentService.upsertConsents(
      req.user.id,
      req.body.consents || [],
      requestMeta(req),
    );
    res.json({ success: true, consents });
  } catch (error) {
    handleError(res, error);
  }
};

const startGoogleOAuth = async (req, res) => {
  try {
    await emailAgentService.getAgentStatus(req.user.id);
    const { url } = getAuthorizationUrl(req.user.id);
    res.json({ success: true, authorizationUrl: url });
  } catch (error) {
    handleError(res, error);
  }
};

const googleOAuthCallback = async (req, res) => {
  const frontendBase = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5003';
  const redirectOk = `${frontendBase}/agent?oauth=success`;
  const redirectKo = `${frontendBase}/agent?oauth=error`;

  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${redirectKo}&reason=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state) {
      return res.redirect(`${redirectKo}&reason=missing_code`);
    }
    const userId = parseStateToken(state);
    const oauthResult = await emailAgentService.exchangeCodeForTokens(String(code));
    await emailAgentService.connectGmailFromOAuth(userId, oauthResult);
    return res.redirect(redirectOk);
  } catch (err) {
    logger.error('Google OAuth callback error:', err);
    return res.redirect(`${redirectKo}&reason=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
};

const discoverImap = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) {
      return res.status(400).json({ success: false, error: 'email_required' });
    }
    const discovery = await discoverImapSettings(email);
    return res.json({ success: true, ...discovery });
  } catch (error) {
    handleError(res, error);
  }
};

const connectImap = async (req, res) => {
  try {
    const mailbox = await emailAgentService.connectImapMailbox(req.user.id, req.body || {});
    res.status(201).json({ success: true, mailbox: sanitizeMailbox(mailbox) });
  } catch (error) {
    handleError(res, error);
  }
};

const revokeMailboxHandler = async (req, res) => {
  try {
    await emailAgentService.revokeMailbox(req.user.id, req.params.mailboxId);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
};

const listTriage = async (req, res) => {
  try {
    const messages = await emailAgentService.listTriageMessages(req.user.id, {
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, messages });
  } catch (error) {
    handleError(res, error);
  }
};

const reviewTriage = async (req, res) => {
  try {
    const message = await emailAgentService.updateTriageReview(
      req.user.id,
      req.params.messageId,
      req.body || {},
    );
    res.json({ success: true, message });
  } catch (error) {
    handleError(res, error);
  }
};

const suggestLinks = async (req, res) => {
  try {
    const suggestions = await emailAgentLinkService.suggestApplicationLinks(
      req.user.id,
      req.params.messageId,
    );
    res.json({ success: true, suggestions });
  } catch (error) {
    handleError(res, error);
  }
};

const linkApplication = async (req, res) => {
  try {
    const message = await emailAgentLinkService.linkTriageToApplication(
      req.user.id,
      req.params.messageId,
      req.body.applicationId,
    );
    res.json({ success: true, message });
  } catch (error) {
    handleError(res, error);
  }
};

const proposedActions = async (req, res) => {
  try {
    const actions = await emailAgentActionService.getProposedActions(
      req.user.id,
      req.params.messageId,
    );
    res.json({ success: true, actions });
  } catch (error) {
    handleError(res, error);
  }
};

const createTask = async (req, res) => {
  try {
    const result = await emailAgentActionService.createGoogleTask(
      req.user.id,
      req.params.messageId,
      req.body || {},
    );
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
};

const createCalendarEvent = async (req, res) => {
  try {
    const result = await emailAgentActionService.createGoogleCalendarEvent(
      req.user.id,
      req.params.messageId,
      req.body || {},
    );
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
};

const syncNow = async (req, res) => {
  try {
    const results = await emailAgentService.syncUserMailboxes(req.user.id);
    res.json({ success: true, results });
  } catch (error) {
    handleError(res, error);
  }
};

const setAgentFlag = async (req, res) => {
  try {
    const user = await emailAgentService.setJobSearchAgentEnabled(
      req.user,
      req.params.userId,
      req.body.enabled === true,
    );
    res.json({ success: true, user });
  } catch (error) {
    handleError(res, error);
  }
};

function sanitizeMailbox(mailbox) {
  return {
    id: mailbox.id,
    emailAddress: mailbox.emailAddress,
    displayName: mailbox.displayName,
    provider: mailbox.provider,
    syncEnabled: mailbox.syncEnabled,
    lastSyncAt: mailbox.lastSyncAt,
    lastSyncStatus: mailbox.lastSyncStatus,
    status: mailbox.status,
    createdAt: mailbox.createdAt,
  };
}

module.exports = {
  getStatus,
  updateConsents,
  startGoogleOAuth,
  googleOAuthCallback,
  discoverImap,
  connectImap,
  revokeMailboxHandler,
  listTriage,
  reviewTriage,
  suggestLinks,
  linkApplication,
  proposedActions,
  createTask,
  createCalendarEvent,
  syncNow,
  setAgentFlag,
};

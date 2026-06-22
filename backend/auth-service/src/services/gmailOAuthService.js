const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.API_GATEWAY_PUBLIC_URL || 'http://localhost:5002'}/api/v1/email-agent/oauth/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

function createOAuthClient() {
  const cfg = getOAuthConfig();
  if (!cfg) return null;
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
}

function buildStateToken(userId) {
  return jwt.sign({ purpose: 'gmail_oauth', userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
}

function parseStateToken(state) {
  const decoded = jwt.verify(String(state), process.env.JWT_SECRET);
  if (decoded.purpose !== 'gmail_oauth' || !decoded.userId) {
    throw new Error('state_invalid');
  }
  return decoded.userId;
}

function getAuthorizationUrl(userId) {
  const client = createOAuthClient();
  if (!client) {
    throw new Error('google_oauth_not_configured');
  }
  const state = buildStateToken(userId);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  });
  return { url, state, scopes: GMAIL_SCOPES };
}

async function exchangeCodeForTokens(code) {
  const client = createOAuthClient();
  if (!client) {
    throw new Error('google_oauth_not_configured');
  }
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const profile = await oauth2.userinfo.get();
  const emailAddress = profile.data.email;

  return {
    emailAddress,
    tokens: {
      refreshToken: tokens.refresh_token || null,
      accessToken: tokens.access_token || null,
      expiryDate: tokens.expiry_date || null,
    },
    scopes: GMAIL_SCOPES,
  };
}

async function fetchRecentGmailMessages(credentials, maxCount = 20) {
  const client = createOAuthClient();
  if (!client) {
    throw new Error('google_oauth_not_configured');
  }
  client.setCredentials({
    refresh_token: credentials.refreshToken,
    access_token: credentials.accessToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: maxCount,
    q: 'newer_than:14d',
  });

  const messages = [];
  for (const item of list.data.messages || []) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: item.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date', 'Message-ID'],
      });
      const headers = full.data.payload?.headers || [];
      const getHeader = (name) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      messages.push({
        externalId: getHeader('Message-ID') || item.id,
        fromAddress: getHeader('From'),
        subject: getHeader('Subject') || '(sans objet)',
        receivedAt: getHeader('Date') ? new Date(getHeader('Date')) : new Date(),
        snippet: full.data.snippet || '',
      });
    } catch (err) {
      logger.warn(`Gmail fetch message ${item.id}: ${err.message}`);
    }
  }
  return messages;
}

module.exports = {
  GMAIL_SCOPES,
  getOAuthConfig,
  getAuthorizationUrl,
  parseStateToken,
  exchangeCodeForTokens,
  fetchRecentGmailMessages,
};

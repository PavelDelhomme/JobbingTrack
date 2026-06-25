const { prisma } = require('../utils/prismaClient');
const { encryptSecret, decryptSecret } = require('../utils/secretCrypto');
const {
  evaluateAgentAccess,
  hasRequiredConsents,
  CONSENT_TYPES,
} = require('../lib/agentAccessPolicy');
const { classifyEmail } = require('../lib/classificationRules');
const { testImapConnection, fetchRecentImapMessages } = require('./imapMinimalClient');
const {
  exchangeCodeForTokens,
  fetchRecentGmailMessages,
} = require('./gmailOAuthService');
const { autoLinkTriageMessage, linkTriageToApplication: linkTriageOnly } = require('./emailAgentLinkService');
const { applySuggestedStatusFromTriage } = require('./emailAgentApplicationStatusService');
const logger = require('../utils/logger');

const CONSENT_VERSION = '1.0';

async function loadAgentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      jobSearchAgentEnabled: true,
    },
  });
}

async function assertAgentAccess(userId, options = {}) {
  const user = await loadAgentUser(userId);
  if (!user) {
    const err = new Error('user_not_found');
    err.status = 404;
    throw err;
  }
  const access = evaluateAgentAccess({
    ...user,
    requestingPersonalEmailContent: options.requestingPersonalEmailContent === true,
    personalEmailConsentGranted: options.personalEmailConsentGranted === true,
  });
  if (!access.allowed && !options.connectOnly) {
    const err = new Error(access.reason);
    err.status = 403;
    err.code = access.reason;
    throw err;
  }
  return { user, access };
}

async function getAgentStatus(userId) {
  const { user, access } = await assertAgentAccess(userId, { connectOnly: true });
  const consents = await prisma.userAgentConsent.findMany({
    where: { userId, version: CONSENT_VERSION },
  });
  const mailboxes = await prisma.userMailbox.findMany({
    where: { userId, status: 'ACTIVE' },
    select: {
      id: true,
      emailAddress: true,
      provider: true,
      syncEnabled: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const pendingCount = await prisma.emailTriageMessage.count({
    where: { userId, reviewStatus: 'PENDING' },
  });

  return {
    agentEnabled: user.jobSearchAgentEnabled === true,
    emailVerified: user.emailVerified === true,
    access,
    consentVersion: CONSENT_VERSION,
    consentTypes: CONSENT_TYPES,
    consents: consents.map((c) => ({
      consentType: c.consentType,
      granted: c.granted,
      version: c.version,
      grantedAt: c.grantedAt,
      revokedAt: c.revokedAt,
    })),
    hasRequiredConsents: hasRequiredConsents(consents),
    mailboxes,
    pendingTriageCount: pendingCount,
  };
}

async function upsertConsents(userId, items = [], meta = {}) {
  await assertAgentAccess(userId);
  const results = [];
  for (const item of items) {
    if (!CONSENT_TYPES.includes(item.consentType)) continue;
    const granted = item.granted === true;
    const record = await prisma.userAgentConsent.upsert({
      where: {
        userId_consentType_version: {
          userId,
          consentType: item.consentType,
          version: CONSENT_VERSION,
        },
      },
      create: {
        userId,
        consentType: item.consentType,
        version: CONSENT_VERSION,
        granted,
        grantedAt: granted ? new Date() : null,
        revokedAt: granted ? null : new Date(),
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
      },
      update: {
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: granted ? null : new Date(),
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
      },
    });
    results.push(record);
  }
  return results;
}

async function assertMailboxConsent(userId) {
  const consents = await prisma.userAgentConsent.findMany({
    where: { userId, version: CONSENT_VERSION, granted: true },
  });
  if (!hasRequiredConsents(consents)) {
    const err = new Error('mailbox_consent_required');
    err.status = 403;
    err.code = 'mailbox_consent_required';
    throw err;
  }
}

async function connectGmailFromOAuth(userId, oauthResult) {
  await assertAgentAccess(userId);
  await assertMailboxConsent(userId);

  const credentialsEnc = encryptSecret(oauthResult.tokens);
  const mailbox = await prisma.userMailbox.upsert({
    where: {
      userId_emailAddress: {
        userId,
        emailAddress: oauthResult.emailAddress.toLowerCase(),
      },
    },
    create: {
      userId,
      emailAddress: oauthResult.emailAddress.toLowerCase(),
      displayName: oauthResult.emailAddress,
      provider: 'GMAIL_OAUTH',
      credentialsEnc,
      oauthScopes: oauthResult.scopes,
      status: 'ACTIVE',
      syncEnabled: true,
      revokedAt: null,
    },
    update: {
      credentialsEnc,
      oauthScopes: oauthResult.scopes,
      status: 'ACTIVE',
      syncEnabled: true,
      revokedAt: null,
      lastSyncError: null,
    },
  });
  return mailbox;
}

async function connectImapMailbox(userId, payload) {
  await assertAgentAccess(userId);
  await assertMailboxConsent(userId);

  const {
    emailAddress,
    password,
    imapHost,
    imapPort = 993,
    imapUseTls = true,
    smtpHost,
    smtpPort,
    smtpUseTls = true,
    displayName,
  } = payload;

  await testImapConnection({
    host: imapHost,
    port: Number(imapPort),
    email: emailAddress,
    password,
    useTls: imapUseTls,
  });

  const credentialsEnc = encryptSecret({ password });
  const mailbox = await prisma.userMailbox.upsert({
    where: {
      userId_emailAddress: {
        userId,
        emailAddress: emailAddress.toLowerCase(),
      },
    },
    create: {
      userId,
      emailAddress: emailAddress.toLowerCase(),
      displayName: displayName || emailAddress,
      provider: 'IMAP_GENERIC',
      credentialsEnc,
      imapHost,
      imapPort: Number(imapPort),
      imapUseTls: imapUseTls !== false,
      smtpHost: smtpHost || null,
      smtpPort: smtpPort ? Number(smtpPort) : null,
      smtpUseTls: smtpUseTls !== false,
      status: 'ACTIVE',
      syncEnabled: true,
    },
    update: {
      credentialsEnc,
      imapHost,
      imapPort: Number(imapPort),
      imapUseTls: imapUseTls !== false,
      smtpHost: smtpHost || null,
      smtpPort: smtpPort ? Number(smtpPort) : null,
      smtpUseTls: smtpUseTls !== false,
      status: 'ACTIVE',
      syncEnabled: true,
      revokedAt: null,
      lastSyncError: null,
    },
  });
  return mailbox;
}

async function revokeMailbox(userId, mailboxId) {
  await assertAgentAccess(userId);
  const mailbox = await prisma.userMailbox.findFirst({
    where: { id: mailboxId, userId },
  });
  if (!mailbox) {
    const err = new Error('mailbox_not_found');
    err.status = 404;
    throw err;
  }
  return prisma.userMailbox.update({
    where: { id: mailboxId },
    data: {
      status: 'REVOKED',
      syncEnabled: false,
      revokedAt: new Date(),
      credentialsEnc: encryptSecret({ revoked: true }),
    },
  });
}

async function listTriageMessages(userId, { status = 'PENDING', limit = 50 } = {}) {
  await assertAgentAccess(userId);
  return prisma.emailTriageMessage.findMany({
    where: {
      userId,
      ...(status ? { reviewStatus: status } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    take: Math.min(Number(limit) || 50, 200),
  });
}

const TRIAGE_REVIEW_STATUSES = new Set(['PENDING', 'ACCEPTED', 'REJECTED', 'DEFERRED']);

function normalizeTriageReviewStatus(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    const err = new Error('invalid_review_status');
    err.status = 400;
    throw err;
  }
  let status = raw.trim().toUpperCase();
  if (status === 'DISMISSED') status = 'REJECTED';
  if (!TRIAGE_REVIEW_STATUSES.has(status)) {
    const err = new Error('invalid_review_status');
    err.status = 400;
    throw err;
  }
  return status;
}

async function updateTriageReview(userId, messageId, payload = {}) {
  await assertAgentAccess(userId);
  const existing = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!existing) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  if (payload.applicationId) {
    const linked = await linkTriageToApplication(userId, messageId, payload.applicationId);
    return linked;
  }

  const reviewStatus = normalizeTriageReviewStatus(payload.reviewStatus);
  const updated = await prisma.emailTriageMessage.update({
    where: { id: messageId },
    data: { reviewStatus },
  });
  const statusApply =
    reviewStatus === 'ACCEPTED'
      ? await applySuggestedStatusFromTriage(userId, messageId)
      : { applied: false, reason: 'review_not_accepted' };
  return { message: updated, statusApply };
}

async function linkTriageToApplication(userId, messageId, applicationId) {
  const updated = await linkTriageOnly(userId, messageId, applicationId);
  const statusApply = await applySuggestedStatusFromTriage(userId, messageId);
  return { message: updated, statusApply };
}

async function syncMailbox(mailbox) {
  const credentials = decryptSecret(mailbox.credentialsEnc);
  let fetched = [];

  if (mailbox.provider === 'GMAIL_OAUTH') {
    fetched = await fetchRecentGmailMessages(credentials, 25);
  } else if (mailbox.provider === 'IMAP_GENERIC') {
    fetched = await fetchRecentImapMessages(
      {
        host: mailbox.imapHost,
        port: mailbox.imapPort,
        email: mailbox.emailAddress,
        password: credentials.password,
        useTls: mailbox.imapUseTls,
      },
      25,
    );
  }

  let imported = 0;
  for (const msg of fetched) {
    const result = classifyEmail({
      from: msg.fromAddress,
      subject: msg.subject,
      body: msg.snippet,
    });
    try {
      const upserted = await prisma.emailTriageMessage.upsert({
        where: {
          mailboxId_externalId: {
            mailboxId: mailbox.id,
            externalId: msg.externalId,
          },
        },
        create: {
          userId: mailbox.userId,
          mailboxId: mailbox.id,
          externalId: msg.externalId,
          fromAddress: msg.fromAddress,
          subject: msg.subject,
          snippet: msg.snippet || null,
          receivedAt: msg.receivedAt,
          classification: result.classification,
          confidence: result.confidence,
          suggestedStatus: result.suggestedStatus,
          labels: result.labels,
          proposedActions: result.proposedActions,
          reviewStatus: 'PENDING',
        },
        update: {
          fromAddress: msg.fromAddress,
          subject: msg.subject,
          snippet: msg.snippet || null,
          receivedAt: msg.receivedAt,
        },
      });
      imported += 1;
      if (!upserted.applicationId) {
        try {
          await autoLinkTriageMessage(mailbox.userId, upserted.id);
        } catch (linkErr) {
          logger.warn(`Auto-link skipped message=${upserted.id}: ${linkErr.message}`);
        }
      }
    } catch (err) {
      logger.warn(`Triage upsert failed mailbox=${mailbox.id}: ${err.message}`);
    }
  }

  await prisma.userMailbox.update({
    where: { id: mailbox.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: 'OK',
      lastSyncError: null,
    },
  });

  return { imported, fetched: fetched.length };
}

async function syncUserMailboxes(userId) {
  await assertAgentAccess(userId);
  const mailboxes = await prisma.userMailbox.findMany({
    where: { userId, status: 'ACTIVE', syncEnabled: true },
  });
  const results = [];
  for (const mailbox of mailboxes) {
    try {
      await prisma.userMailbox.update({
        where: { id: mailbox.id },
        data: { lastSyncStatus: 'SYNCING' },
      });
      const summary = await syncMailbox(mailbox);
      results.push({ mailboxId: mailbox.id, ok: true, ...summary });
    } catch (err) {
      await prisma.userMailbox.update({
        where: { id: mailbox.id },
        data: {
          lastSyncStatus: 'ERROR',
          lastSyncError: err.message,
          status: 'ERROR',
        },
      });
      results.push({ mailboxId: mailbox.id, ok: false, error: err.message });
    }
  }
  return results;
}

async function syncAllEnabledMailboxes() {
  const mailboxes = await prisma.userMailbox.findMany({
    where: {
      status: 'ACTIVE',
      syncEnabled: true,
      user: { jobSearchAgentEnabled: true, emailVerified: true, isActive: true },
    },
  });
  const summaries = [];
  for (const mailbox of mailboxes) {
    try {
      const summary = await syncMailbox(mailbox);
      summaries.push({ mailboxId: mailbox.id, userId: mailbox.userId, ok: true, ...summary });
    } catch (err) {
      await prisma.userMailbox.update({
        where: { id: mailbox.id },
        data: { lastSyncStatus: 'ERROR', lastSyncError: err.message },
      });
      summaries.push({ mailboxId: mailbox.id, userId: mailbox.userId, ok: false, error: err.message });
    }
  }
  return summaries;
}

async function setJobSearchAgentEnabled(adminUser, targetUserId, enabled) {
  const role = String(adminUser.role || '').toUpperCase();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    const err = new Error('admin_required');
    err.status = 403;
    throw err;
  }
  return prisma.user.update({
    where: { id: targetUserId },
    data: { jobSearchAgentEnabled: enabled === true },
    select: {
      id: true,
      email: true,
      jobSearchAgentEnabled: true,
    },
  });
}

module.exports = {
  CONSENT_VERSION,
  getAgentStatus,
  upsertConsents,
  connectGmailFromOAuth,
  connectImapMailbox,
  revokeMailbox,
  listTriageMessages,
  updateTriageReview,
  linkTriageToApplication,
  normalizeTriageReviewStatus,
  syncUserMailboxes,
  syncAllEnabledMailboxes,
  setJobSearchAgentEnabled,
  exchangeCodeForTokens,
};

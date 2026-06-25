const { prisma } = require('../utils/prismaClient');
const emailService = require('./emailService');
const { CONSENT_VERSION } = require('./emailAgentService');
const { renderDigestHtml, renderDigestText, countDigestItems } = require('../lib/digestRenderer');
const { resolveDigestFrom } = require('../lib/digestIdentity');
const { resolveDigestRecipient } = require('../lib/digestRecipient');
const { getPublicFrontendUrl } = require('../utils/frontendUrlForEmails');
const logger = require('../utils/logger');

const DIGEST_SUBJECT_PREFIX = 'Digest recherche emploi JobbingTrack';
const WEEKLY_DIGEST_SUBJECT_PREFIX = 'Récap hebdomadaire recherche emploi JobbingTrack';
const { isWeeklyDigestDay } = require('../lib/digestSchedulePolicy');
const { applicationStatusLabel } = require('../lib/applicationStatusLabels');

function statusChangeItem(row, appUrl) {
  const company = row.application?.company?.name || '';
  const position = row.application?.position || 'Candidature';
  const title = company ? `${company} — ${position}` : position;
  const from = applicationStatusLabel(row.previousStatus?.code);
  const to = applicationStatusLabel(row.newStatus?.code);
  const appId = row.application?.id;
  return {
    label: `${title} : ${from} → ${to}`,
    href: appId ? `${appUrl}/applications/applications/${appId}` : `${appUrl}/applications/applications`,
  };
}

async function fetchRecentStatusChanges(userId, appUrl, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.applicationStatusHistory.findMany({
    where: {
      changedAt: { gte: since },
      application: { userId, deletedAt: null },
    },
    include: {
      application: {
        select: {
          id: true,
          position: true,
          company: { select: { name: true } },
        },
      },
      previousStatus: { select: { code: true } },
      newStatus: { select: { code: true } },
    },
    orderBy: { changedAt: 'desc' },
    take: 12,
  });
  return rows.map((row) => statusChangeItem(row, appUrl));
}

function triageItem(message, appUrl) {
  const subject = String(message.subject || '(sans objet)').slice(0, 120);
  const from = String(message.fromAddress || 'expéditeur inconnu').slice(0, 80);
  return {
    label: `${subject} — ${from}`,
    href: `${appUrl}/agent`,
  };
}

function classifyForDigest(message) {
  const classification = String(message.classification || 'manual_review');
  const actions = Array.isArray(message.proposedActions) ? message.proposedActions : [];

  if (classification === 'follow_up_needed') {
    return 'recommendedFollowups';
  }
  if (classification === 'interview_request' || classification === 'technical_test') {
    return 'interviewsToPrepare';
  }
  if (classification === 'application_rejected' || actions.includes('add_digest_priority')) {
    return 'importantEmails';
  }
  if (message.reviewStatus === 'PENDING') {
    return 'needsConfirmation';
  }
  return null;
}

async function buildUserDigestSummary(userId) {
  const appUrl = getPublicFrontendUrl();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const messages = await prisma.emailTriageMessage.findMany({
    where: {
      userId,
      reviewStatus: 'PENDING',
      receivedAt: { gte: since },
    },
    orderBy: { receivedAt: 'desc' },
    take: 30,
  });

  const summary = {
    subject: `${DIGEST_SUBJECT_PREFIX} — ${new Date().toLocaleDateString('fr-FR')}`,
    appUrl,
    importantEmails: [],
    interviewsToPrepare: [],
    recommendedFollowups: [],
    needsConfirmation: [],
    statusChanges: [],
  };

  summary.statusChanges = await fetchRecentStatusChanges(userId, appUrl, 24);

  for (const message of messages) {
    const bucket = classifyForDigest(message);
    if (!bucket || summary[bucket].length >= 8) continue;
    summary[bucket].push(triageItem(message, appUrl));
  }

  return summary;
}

async function buildUserWeeklyDigestSummary(userId) {
  const appUrl = getPublicFrontendUrl();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const messages = await prisma.emailTriageMessage.findMany({
    where: { userId, receivedAt: { gte: since } },
    orderBy: { receivedAt: 'desc' },
    take: 80,
  });

  const stats = {
    total: messages.length,
    pending: messages.filter((m) => m.reviewStatus === 'PENDING').length,
    accepted: messages.filter((m) => m.reviewStatus === 'ACCEPTED').length,
    linked: messages.filter((m) => Boolean(m.applicationId)).length,
  };

  const summary = {
    subject: `${WEEKLY_DIGEST_SUBJECT_PREFIX} — semaine du ${since.toLocaleDateString('fr-FR')}`,
    appUrl,
    stats,
    importantEmails: [],
    interviewsToPrepare: [],
    recommendedFollowups: [],
    needsConfirmation: [],
    statusChanges: [],
  };

  summary.statusChanges = await fetchRecentStatusChanges(userId, appUrl, 24 * 7);

  for (const message of messages.filter((m) => m.reviewStatus === 'PENDING')) {
    const bucket = classifyForDigest(message);
    if (!bucket || summary[bucket].length >= 10) continue;
    summary[bucket].push(triageItem(message, appUrl));
  }

  return summary;
}

async function alreadySentThisWeek(userId) {
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.emailLog.findFirst({
    where: {
      userId,
      type: 'NOTIFICATION',
      status: 'SENT',
      subject: { startsWith: WEEKLY_DIGEST_SUBJECT_PREFIX },
      sentAt: { gte: start },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function sendUserWeeklyDigest(user) {
  if (!(await hasDigestConsent(user.id))) {
    return { userId: user.id, skipped: true, reason: 'digest_consent_missing' };
  }

  if (await alreadySentThisWeek(user.id)) {
    return { userId: user.id, skipped: true, reason: 'already_sent_this_week' };
  }

  const summary = await buildUserWeeklyDigestSummary(user.id);
  if (countDigestItems(summary) === 0 && summary.stats.total === 0) {
    return { userId: user.id, skipped: true, reason: 'empty_weekly_digest' };
  }

  const identity = resolveDigestFrom();
  if (!identity.valid) {
    return { userId: user.id, skipped: true, reason: identity.reason || 'invalid_digest_from' };
  }

  const recipient = resolveDigestRecipient(user);
  const html = renderDigestHtml(summary, { appUrl: summary.appUrl });
  const text = renderDigestText(summary, { appUrl: summary.appUrl });
  const subject = summary.subject;

  const emailLog = await emailService.logEmail({
    userId: user.id,
    to: recipient.to,
    from: identity.from,
    subject,
    type: 'NOTIFICATION',
    emailContent: html,
    metadata: {
      kind: 'email_agent_weekly_digest',
      accountEmail: recipient.accountEmail,
      recipientSource: recipient.source,
    },
  });

  try {
    await emailService.getProvider().sendEmail({
      to: recipient.to,
      subject,
      htmlContent: html,
      textContent: text,
      from: identity.from,
      replyTo: identity.replyTo || undefined,
    });
    if (emailLog?.id) {
      await emailService.updateEmailLogStatus(emailLog.id, 'SENT');
    }
    logger.info(`📬 Récap hebdomadaire agent email envoyé à ${recipient.to} (compte ${recipient.accountEmail})`);
    return {
      userId: user.id,
      ok: true,
      items: countDigestItems(summary),
      stats: summary.stats,
      to: recipient.to,
      accountEmail: recipient.accountEmail,
    };
  } catch (error) {
    if (emailLog?.id) {
      await emailService.updateEmailLogStatus(emailLog.id, 'FAILED', error);
    }
    logger.error(`Récap hebdo agent email échoué pour ${user.email}: ${error.message}`);
    return { userId: user.id, ok: false, error: error.message };
  }
}

async function sendWeeklyDigestsForEligibleUsers(options = {}) {
  const dayCheck = isWeeklyDigestDay(new Date(), process.env);
  if (!options.force && !dayCheck.allowed) {
    return { skipped: true, reason: dayCheck.reason, ...dayCheck };
  }

  if (process.env.EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED !== 'true' && !options.force) {
    return { skipped: true, reason: 'weekly_digest_disabled' };
  }

  const users = await prisma.user.findMany({
    where: {
      jobSearchAgentEnabled: true,
      emailVerified: true,
      isActive: true,
    },
    select: { id: true, email: true },
  });

  const results = [];
  for (const user of users) {
    results.push(await sendUserWeeklyDigest(user));
  }

  const sent = results.filter((row) => row.ok).length;
  const skipped = results.filter((row) => row.skipped).length;
  const failed = results.filter((row) => row.ok === false).length;

  return { total: users.length, sent, skipped, failed, results, day: dayCheck.day };
}

async function hasDigestConsent(userId) {
  const consent = await prisma.userAgentConsent.findFirst({
    where: {
      userId,
      consentType: 'DIGEST_NOTIFICATIONS',
      version: CONSENT_VERSION,
      granted: true,
    },
  });
  return Boolean(consent);
}

async function alreadySentToday(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.emailLog.findFirst({
    where: {
      userId,
      type: 'NOTIFICATION',
      status: 'SENT',
      subject: { startsWith: DIGEST_SUBJECT_PREFIX },
      sentAt: { gte: start },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function sendUserDigest(user) {
  if (!(await hasDigestConsent(user.id))) {
    return { userId: user.id, skipped: true, reason: 'digest_consent_missing' };
  }

  if (await alreadySentToday(user.id)) {
    return { userId: user.id, skipped: true, reason: 'already_sent_today' };
  }

  const summary = await buildUserDigestSummary(user.id);
  if (countDigestItems(summary) === 0) {
    return { userId: user.id, skipped: true, reason: 'empty_digest' };
  }

  const identity = resolveDigestFrom();
  if (!identity.valid) {
    return { userId: user.id, skipped: true, reason: identity.reason || 'invalid_digest_from' };
  }

  const recipient = resolveDigestRecipient(user);
  const html = renderDigestHtml(summary, { appUrl: summary.appUrl });
  const text = renderDigestText(summary, { appUrl: summary.appUrl });
  const subject = summary.subject;

  const emailLog = await emailService.logEmail({
    userId: user.id,
    to: recipient.to,
    from: identity.from,
    subject,
    type: 'NOTIFICATION',
    emailContent: html,
    metadata: {
      kind: 'email_agent_daily_digest',
      accountEmail: recipient.accountEmail,
      recipientSource: recipient.source,
    },
  });

  try {
    await emailService.getProvider().sendEmail({
      to: recipient.to,
      subject,
      htmlContent: html,
      textContent: text,
      from: identity.from,
      replyTo: identity.replyTo || undefined,
    });
    if (emailLog?.id) {
      await emailService.updateEmailLogStatus(emailLog.id, 'SENT');
    }
    logger.info(`📬 Digest agent email envoyé à ${recipient.to} (compte ${recipient.accountEmail})`);
    return {
      userId: user.id,
      ok: true,
      items: countDigestItems(summary),
      to: recipient.to,
      accountEmail: recipient.accountEmail,
    };
  } catch (error) {
    if (emailLog?.id) {
      await emailService.updateEmailLogStatus(emailLog.id, 'FAILED', error);
    }
    logger.error(`Digest agent email échoué pour ${user.email}: ${error.message}`);
    return { userId: user.id, ok: false, error: error.message };
  }
}

async function sendDailyDigestsForEligibleUsers() {
  if (process.env.EMAIL_TRIAGE_DIGEST_DAILY_ENABLED === 'false') {
    return { skipped: true, reason: 'daily_digest_disabled' };
  }

  const users = await prisma.user.findMany({
    where: {
      jobSearchAgentEnabled: true,
      emailVerified: true,
      isActive: true,
    },
    select: { id: true, email: true },
  });

  const results = [];
  for (const user of users) {
    results.push(await sendUserDigest(user));
  }

  const sent = results.filter((row) => row.ok).length;
  const skipped = results.filter((row) => row.skipped).length;
  const failed = results.filter((row) => row.ok === false).length;

  return { total: users.length, sent, skipped, failed, results };
}

module.exports = {
  buildUserDigestSummary,
  buildUserWeeklyDigestSummary,
  sendUserDigest,
  sendUserWeeklyDigest,
  sendDailyDigestsForEligibleUsers,
  sendWeeklyDigestsForEligibleUsers,
  classifyForDigest,
  DIGEST_SUBJECT_PREFIX,
  WEEKLY_DIGEST_SUBJECT_PREFIX,
};

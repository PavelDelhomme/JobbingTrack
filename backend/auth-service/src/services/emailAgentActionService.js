const { google } = require('googleapis');
const { prisma } = require('../utils/prismaClient');
const { decryptSecret } = require('../utils/secretCrypto');
const { createOAuthClient } = require('./gmailOAuthService');
const { evaluateCalendarSlot } = require('../lib/calendarTimePolicy');
const logger = require('../utils/logger');

async function loadGmailMailbox(userId) {
  return prisma.userMailbox.findFirst({
    where: { userId, status: 'ACTIVE', provider: 'GMAIL_OAUTH', syncEnabled: true },
  });
}

async function hasConsent(userId, consentType) {
  const row = await prisma.userAgentConsent.findFirst({
    where: { userId, consentType, version: '1.0', granted: true },
  });
  return Boolean(row);
}

async function getGoogleClient(userId) {
  const mailbox = await loadGmailMailbox(userId);
  if (!mailbox) {
    return { client: null, reason: 'gmail_mailbox_missing' };
  }
  const credentials = decryptSecret(mailbox.credentialsEnc);
  const oauth = createOAuthClient();
  if (!oauth) {
    return { client: null, reason: 'google_oauth_not_configured' };
  }
  oauth.setCredentials({
    refresh_token: credentials.refreshToken,
    access_token: credentials.accessToken,
  });
  return { client: oauth, mailbox };
}

function buildTaskTitle(message) {
  const prefix =
    message.classification === 'interview_request'
      ? 'Préparer entretien'
      : message.classification === 'follow_up_needed'
        ? 'Relancer candidature'
        : 'Traiter email';
  return `${prefix} — ${message.subject}`.slice(0, 180);
}

function buildCalendarProposal(message) {
  if (message.classification !== 'interview_request') {
    return {
      kind: 'calendar',
      decision: 'confirm',
      reason: 'not_interview_request',
      message: 'Proposition calendrier réservée aux emails entretien.',
    };
  }

  const slot = evaluateCalendarSlot({
    hasExplicitTime: false,
    ambiguousText: /(?:semaine prochaine|bientot|prochainement|des que possible)/i.test(
      `${message.subject} ${message.snippet || ''}`,
    ),
  });

  return {
    kind: 'calendar',
    title: `Entretien — ${message.subject}`.slice(0, 120),
    ...slot,
    message:
      slot.decision === 'schedule'
        ? 'Créneau exploitable — validation utilisateur requise avant création.'
        : 'Horaire non explicite — créer une tâche ou confirmer l’heure.',
  };
}

async function getProposedActions(userId, messageId) {
  const message = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!message) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  const taskAllowed = await hasConsent(userId, 'GOOGLE_TASKS');
  const calendarAllowed = await hasConsent(userId, 'GOOGLE_CALENDAR');

  return {
    messageId: message.id,
    classification: message.classification,
    task: taskAllowed
      ? {
          allowed: true,
          title: buildTaskTitle(message),
          notes: (message.snippet || message.subject).slice(0, 500),
        }
      : { allowed: false, reason: 'google_tasks_consent_required' },
    calendar: calendarAllowed
      ? buildCalendarProposal(message)
      : { allowed: false, reason: 'google_calendar_consent_required' },
  };
}

async function createGoogleTask(userId, messageId, overrides = {}) {
  if (!(await hasConsent(userId, 'GOOGLE_TASKS'))) {
    const err = new Error('google_tasks_consent_required');
    err.status = 403;
    throw err;
  }

  const message = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!message) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  const { client, reason } = await getGoogleClient(userId);
  if (!client) {
    const err = new Error(reason || 'google_client_unavailable');
    err.status = 400;
    throw err;
  }

  const tasks = google.tasks({ version: 'v1', auth: client });
  const title = overrides.title || buildTaskTitle(message);
  const notes = overrides.notes || message.snippet || message.subject;

  try {
    const list = await tasks.tasklists.list({ maxResults: 1 });
    const taskListId = list.data.items?.[0]?.id || '@default';
    const created = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: { title, notes: String(notes).slice(0, 8000) },
    });
    return {
      ok: true,
      taskId: created.data.id,
      taskListId,
      title,
    };
  } catch (error) {
    logger.warn(`Google Tasks create failed: ${error.message}`);
    const err = new Error('google_tasks_create_failed');
    err.status = 502;
    err.details = error.message;
    throw err;
  }
}

async function createGoogleCalendarEvent(userId, messageId, payload = {}) {
  if (!(await hasConsent(userId, 'GOOGLE_CALENDAR'))) {
    const err = new Error('google_calendar_consent_required');
    err.status = 403;
    throw err;
  }

  const message = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!message) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  const slot = evaluateCalendarSlot({
    hasExplicitTime: Boolean(payload.hasExplicitTime),
    hour: payload.hour,
    minute: payload.minute,
    allDayProposed: payload.allDay === true,
    ambiguousText: payload.ambiguousText === true,
  });

  if (slot.decision !== 'schedule') {
    return { ok: false, skipped: true, slot };
  }

  const { client, reason } = await getGoogleClient(userId);
  if (!client) {
    const err = new Error(reason || 'google_client_unavailable');
    err.status = 400;
    throw err;
  }

  const start = payload.startDateTime ? new Date(payload.startDateTime) : new Date();
  start.setHours(slot.hour, slot.minute, 0, 0);
  const end = new Date(start.getTime() + (payload.durationMinutes || 60) * 60 * 1000);

  const calendar = google.calendar({ version: 'v3', auth: client });
  try {
    const created = await calendar.events.insert({
      calendarId: payload.calendarId || 'primary',
      requestBody: {
        summary: payload.title || `Entretien — ${message.subject}`.slice(0, 120),
        description: (message.snippet || message.subject).slice(0, 4000),
        start: { dateTime: start.toISOString(), timeZone: process.env.EMAIL_TRIAGE_DIGEST_TIMEZONE || 'Europe/Paris' },
        end: { dateTime: end.toISOString(), timeZone: process.env.EMAIL_TRIAGE_DIGEST_TIMEZONE || 'Europe/Paris' },
      },
    });
    return { ok: true, eventId: created.data.id, htmlLink: created.data.htmlLink, start: start.toISOString() };
  } catch (error) {
    logger.warn(`Google Calendar create failed: ${error.message}`);
    const err = new Error('google_calendar_create_failed');
    err.status = 502;
    err.details = error.message;
    throw err;
  }
}

module.exports = {
  getProposedActions,
  createGoogleTask,
  createGoogleCalendarEvent,
  buildTaskTitle,
  buildCalendarProposal,
};

const { prisma } = require('../utils/prismaClient');
const logger = require('../utils/logger');

/** Codes proposés par classifyEmail → codes ApplicationStatus en BDD. */
const STATUS_CODE_ALIASES = {
  FOLLOW_UP_PENDING: 'RELANCED_PENDING',
};

function resolveStatusCode(suggestedStatus) {
  if (!suggestedStatus || typeof suggestedStatus !== 'string') return null;
  const code = suggestedStatus.trim().toUpperCase();
  return STATUS_CODE_ALIASES[code] || code;
}

/**
 * Applique suggestedStatus sur la candidature liée quand l'utilisateur a validé le triage.
 * Ne modifie rien si pas de lien candidature, pas de statut suggéré, ou statusEngineOptOut.
 */
async function applySuggestedStatusFromTriage(userId, messageId) {
  const message = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!message) {
    return { applied: false, reason: 'message_not_found' };
  }
  if (message.reviewStatus !== 'ACCEPTED') {
    return { applied: false, reason: 'review_not_accepted' };
  }
  if (!message.applicationId) {
    return { applied: false, reason: 'no_application_linked' };
  }

  const statusCode = resolveStatusCode(message.suggestedStatus);
  if (!statusCode) {
    return { applied: false, reason: 'no_suggested_status' };
  }

  const application = await prisma.application.findFirst({
    where: { id: message.applicationId, userId, deletedAt: null },
    include: { status: { select: { code: true } } },
  });
  if (!application) {
    return { applied: false, reason: 'application_not_found' };
  }
  if (application.statusEngineOptOut) {
    return { applied: false, reason: 'status_engine_opt_out' };
  }
  if (application.status?.code === statusCode) {
    return { applied: false, reason: 'already_at_status', statusCode };
  }

  const newStatusRow = await prisma.applicationStatus.findFirst({
    where: { code: statusCode },
  });
  if (!newStatusRow) {
    logger.warn(`email-agent: statut inconnu suggestedStatus=${message.suggestedStatus} → ${statusCode}`);
    return { applied: false, reason: 'unknown_status_code', statusCode };
  }

  const comment = `Agent email : ${message.classification || 'triage'} — « ${message.subject.slice(0, 120)} »`;

  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: application.id,
      previousStatusId: application.statusId || null,
      newStatusId: newStatusRow.id,
      comment,
    },
  });

  await prisma.application.update({
    where: { id: application.id },
    data: { statusId: newStatusRow.id },
  });

  if (typeof prisma.notification?.create === 'function') {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Statut mis à jour (agent email)',
          message: `Candidature « ${application.position} » → ${statusCode}`,
          type: 'STATUS_CHANGE',
          entityType: 'Application',
          entityId: application.id,
        },
      });
    } catch (err) {
      logger.warn(`notification status email-agent: ${err.message}`);
    }
  }

  return {
    applied: true,
    applicationId: application.id,
    statusCode,
    previousStatusCode: application.status?.code || null,
  };
}

module.exports = {
  applySuggestedStatusFromTriage,
  resolveStatusCode,
  STATUS_CODE_ALIASES,
};

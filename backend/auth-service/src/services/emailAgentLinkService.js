const { prisma } = require('../utils/prismaClient');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function scoreApplicationMatch(message, application) {
  const haystack = normalizeText(`${message.subject} ${message.snippet || ''} ${message.fromAddress}`);
  const companyName = normalizeText(application.company?.name);
  const position = normalizeText(application.position);
  let score = 0;

  if (companyName.length > 2 && haystack.includes(companyName)) {
    score += 10;
  }
  if (position.length > 3 && haystack.includes(position)) {
    score += 5;
  }

  const domain = String(message.fromAddress || '').split('@')[1]?.toLowerCase() || '';
  if (domain && companyName.replace(/\s+/g, '').includes(domain.split('.')[0])) {
    score += 3;
  }

  return score;
}

async function suggestApplicationLinks(userId, messageId) {
  const message = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!message) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  const applications = await prisma.application.findMany({
    where: { userId, deletedAt: null, isArchived: false },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 150,
  });

  return applications
    .map((application) => ({
      applicationId: application.id,
      companyId: application.companyId,
      companyName: application.company?.name || null,
      position: application.position,
      score: scoreApplicationMatch(message, application),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

async function linkTriageToApplication(userId, messageId, applicationId) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId, deletedAt: null },
    select: { id: true, companyId: true },
  });
  if (!application) {
    const err = new Error('application_not_found');
    err.status = 404;
    throw err;
  }

  const existing = await prisma.emailTriageMessage.findFirst({
    where: { id: messageId, userId },
  });
  if (!existing) {
    const err = new Error('message_not_found');
    err.status = 404;
    throw err;
  }

  return prisma.emailTriageMessage.update({
    where: { id: messageId },
    data: {
      applicationId: application.id,
      companyId: application.companyId,
    },
  });
}

async function autoLinkTriageMessage(userId, messageId) {
  const suggestions = await suggestApplicationLinks(userId, messageId);
  if (suggestions.length !== 1 || suggestions[0].score < 10) {
    return { linked: false, suggestions };
  }
  const updated = await linkTriageToApplication(userId, messageId, suggestions[0].applicationId);
  return { linked: true, applicationId: updated.applicationId, score: suggestions[0].score };
}

module.exports = {
  suggestApplicationLinks,
  linkTriageToApplication,
  autoLinkTriageMessage,
  scoreApplicationMatch,
};

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Service pour gérer l'automatisation des candidatures
 * Désactive automatiquement les logiques pour les éléments archivés
 */

// VÉRIFIER SI UN ÉLÉMENT EST ARCHIVÉ AVANT D'APPLIQUER DES LOGIQUES AUTOMATIQUES
const isElementArchived = async (elementType, elementId) => {
  try {
    switch (elementType) {
      case 'application':
        const application = await prisma.application.findUnique({
          where: { id: elementId },
          select: { isArchived: true }
        });
        return application?.isArchived || false;

      case 'interview':
        const interview = await prisma.interview.findUnique({
          where: { id: elementId },
          select: { isArchived: true }
        });
        return interview?.isArchived || false;

      case 'followup':
        const followup = await prisma.followUp.findUnique({
          where: { id: elementId },
          select: { isArchived: true }
        });
        return followup?.isArchived || false;

      case 'contact':
        const contact = await prisma.contact.findUnique({
          where: { id: elementId },
          select: { isArchived: true }
        });
        return contact?.isArchived || false;

      case 'call':
        const call = await prisma.call.findUnique({
          where: { id: elementId },
          select: { isArchived: true }
        });
        return call?.isArchived || false;

      default:
        return false;
    }
  } catch (error) {
    logger.error(`Erreur vérification archivage ${elementType}:`, error);
    return false;
  }
};

// VÉRIFIER SI UNE CANDIDATURE EST ARCHIVÉE AVANT D'APPLIQUER DES LOGIQUES
const shouldProcessApplication = async (applicationId) => {
  const archived = await isElementArchived('application', applicationId);
  if (archived) {
    logger.info(`Candidature archivée ignorée pour automatisation: ${applicationId}`);
    return false;
  }
  return true;
};

// VÉRIFIER SI UNE RELANCE EST ARCHIVÉE AVANT D'APPLIQUER DES LOGIQUES
const shouldProcessFollowUp = async (followUpId) => {
  const archived = await isElementArchived('followup', followUpId);
  if (archived) {
    logger.info(`Relance archivée ignorée pour automatisation: ${followUpId}`);
    return false;
  }
  return true;
};

// VÉRIFIER SI UN ENTRETIEN EST ARCHIVÉ AVANT D'APPLIQUER DES LOGIQUES
const shouldProcessInterview = async (interviewId) => {
  const archived = await isElementArchived('interview', interviewId);
  if (archived) {
    logger.info(`Entretien archivé ignoré pour automatisation: ${interviewId}`);
    return false;
  }
  return true;
};

// OBTENIR LES CANDIDATURES ACTIVES UNIQUEMENT
const getActiveApplications = async (userId) => {
  try {
    return await prisma.application.findMany({
      where: {
        userId,
        isArchived: false
      },
      include: {
        company: true,
        interviews: {
          where: { isArchived: false }
        },
        followUps: {
          where: { isArchived: false }
        },
        calls: {
          where: { isArchived: false }
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération candidatures actives:', error);
    return [];
  }
};

// OBTENIR LES RELANCES ACTIVES UNIQUEMENT
const getActiveFollowUps = async (userId) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId, isArchived: false },
      select: { id: true }
    });
    const applicationIds = applications.map(app => app.id);

    return await prisma.followUp.findMany({
      where: {
        applicationId: { in: applicationIds },
        isArchived: false
      },
      include: {
        application: {
          include: { company: true }
        },
        contact: true
      }
    });
  } catch (error) {
    logger.error('Erreur récupération relances actives:', error);
    return [];
  }
};

// OBTENIR LES ENTRETIENS ACTIFS UNIQUEMENT
const getActiveInterviews = async (userId) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId, isArchived: false },
      select: { id: true }
    });
    const applicationIds = applications.map(app => app.id);

    return await prisma.interview.findMany({
      where: {
        applicationId: { in: applicationIds },
        isArchived: false
      },
      include: {
        application: {
          include: { company: true }
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération entretiens actifs:', error);
    return [];
  }
};

// OBTENIR LES APPELS ACTIFS UNIQUEMENT
const getActiveCalls = async (userId) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId, isArchived: false },
      select: { id: true }
    });
    const applicationIds = applications.map(app => app.id);

    return await prisma.call.findMany({
      where: {
        applicationId: { in: applicationIds },
        isArchived: false
      },
      include: {
        application: {
          include: { company: true }
        },
        contact: true
      }
    });
  } catch (error) {
    logger.error('Erreur récupération appels actifs:', error);
    return [];
  }
};

// FILTRE POUR EXCLURE LES ÉLÉMENTS ARCHIVÉS DANS LES REQUÊTES
const getActiveElementsFilter = () => {
  return {
    archived: false
  };
};

// VÉRIFIER SI UN CONTACT EST UTILISÉ DANS DES CANDIDATURES ACTIVES
const isContactUsedInActiveApplications = async (contactId) => {
  try {
    const count = await prisma.application.count({
      where: {
        OR: [
          { userId: await getUserIdFromContact(contactId) },
          // Vérifier si le contact est lié à des candidatures via ApplicationContact
          {
            applicationContacts: {
              some: {
                contactId,
                application: {
                  isArchived: false
                }
              }
            }
          }
        ]
      }
    });
    return count > 0;
  } catch (error) {
    logger.error('Erreur vérification utilisation contact:', error);
    return false;
  }
};

// FONCTION UTILITAIRE POUR OBTENIR L'USER ID D'UN CONTACT
const getUserIdFromContact = async (contactId) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { userId: true }
    });
    return contact?.userId;
  } catch (error) {
    logger.error('Erreur récupération userId du contact:', error);
    return null;
  }
};

module.exports = {
  isElementArchived,
  shouldProcessApplication,
  shouldProcessFollowUp,
  shouldProcessInterview,
  getActiveApplications,
  getActiveFollowUps,
  getActiveInterviews,
  getActiveCalls,
  getActiveElementsFilter,
  isContactUsedInActiveApplications
};

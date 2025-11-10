const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const mapEvent = (event) => ({
  ...event,
  startDate: event.startDate?.toISOString(),
  endDate: event.endDate?.toISOString(),
  createdAt: event.createdAt?.toISOString(),
  updatedAt: event.updatedAt?.toISOString()
});

const ensureApplicationOwnership = async (userId, applicationId) => {
  if (!applicationId) return null;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { company: true }
  });
  if (!application) {
    throw new Error('APPLICATION_NOT_FOUND');
  }
  return application;
};

const ensureContactOwnership = async (userId, contactId) => {
  if (!contactId) return null;
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  return contact;
};

const getTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entityType, entityId } = req.params;

    const where = {
      userId,
      ...(entityType === 'application' && { applicationId: entityId }),
      ...(entityType === 'contact' && { contactId: entityId }),
      ...(entityType === 'followup' && { followUpId: entityId }),
      ...(entityType === 'interview' && { interviewId: entityId })
    };

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' }
    });

    res.json({
      success: true,
      timeline: events.map(mapEvent),
      total: events.length
    });
  } catch (error) {
    logger.error('Erreur récupération timeline:', error);
    next(error);
  }
};

const getAllEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.event.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      events: events.map(mapEvent),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération événements:', error);
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      title,
      description,
      startDate,
      endDate,
      allDay = false,
      applicationId,
      contactId,
      followUpId,
      interviewId
    } = req.body;

    try {
      const application = await ensureApplicationOwnership(userId, applicationId);
      await ensureContactOwnership(userId, contactId);

      const event = await prisma.event.create({
        data: {
          userId,
          title,
          description: description || null,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          allDay: Boolean(allDay),
          applicationId: applicationId || null,
          interviewId: interviewId || null,
          followUpId: followUpId || null,
          contactId: contactId || null,
          companyId: application?.companyId || null
        }
      });

      logger.info(`Événement ${event.id} créé pour l'utilisateur ${userId}`);

      res.status(201).json({ success: true, event: mapEvent(event) });
    } catch (ownershipError) {
      if (ownershipError.message === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      if (ownershipError.message === 'CONTACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
      throw ownershipError;
    }
  } catch (error) {
    logger.error('Erreur création événement:', error);
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingEvent = await prisma.event.findFirst({ where: { id, userId } });

    if (!existingEvent) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé' });
    }

    try {
      const application = await ensureApplicationOwnership(userId, req.body.applicationId);
      await ensureContactOwnership(userId, req.body.contactId);

      const event = await prisma.event.update({
        where: { id },
        data: {
          title: req.body.title ?? existingEvent.title,
          description: req.body.description ?? existingEvent.description,
          startDate: req.body.startDate ? new Date(req.body.startDate) : existingEvent.startDate,
          endDate: req.body.endDate ? new Date(req.body.endDate) : existingEvent.endDate,
          allDay: req.body.allDay !== undefined ? Boolean(req.body.allDay) : existingEvent.allDay,
          applicationId: req.body.applicationId ?? existingEvent.applicationId,
          interviewId: req.body.interviewId ?? existingEvent.interviewId,
          followUpId: req.body.followUpId ?? existingEvent.followUpId,
          contactId: req.body.contactId ?? existingEvent.contactId,
          companyId: application?.companyId ?? existingEvent.companyId
        }
      });

      logger.info(`Événement ${id} mis à jour par ${userId}`);

      res.json({ success: true, event: mapEvent(event) });
    } catch (ownershipError) {
      if (ownershipError.message === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      if (ownershipError.message === 'CONTACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
      throw ownershipError;
    }
  } catch (error) {
    logger.error('Erreur mise à jour événement:', error);
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingEvent = await prisma.event.findFirst({ where: { id, userId } });

    if (!existingEvent) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé' });
    }

    await prisma.event.delete({ where: { id } });

    logger.info(`Événement ${id} supprimé pour l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Événement supprimé' });
  } catch (error) {
    logger.error('Erreur suppression événement:', error);
    next(error);
  }
};

const exportTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entityType, entityId, format = 'json' } = req.query;

    const where = {
      userId,
      ...(entityType === 'application' && { applicationId: entityId }),
      ...(entityType === 'contact' && { contactId: entityId }),
      ...(entityType === 'followup' && { followUpId: entityId }),
      ...(entityType === 'interview' && { interviewId: entityId })
    };

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' }
    });

    if (format === 'csv') {
      const csv = [
        ['Titre', 'Début', 'Fin', 'Toute la journée', 'Description'].join(','),
        ...events.map((event) => [
          event.title.replace(/,/g, ';'),
          event.startDate.toISOString(),
          event.endDate ? event.endDate.toISOString() : '',
          event.allDay ? 'oui' : 'non',
          (event.description || '').replace(/,/g, ';')
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=timeline_${entityId || 'global'}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, events: events.map(mapEvent), exportedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('Erreur export timeline:', error);
    next(error);
  }
};

const getEventStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const upcoming = await prisma.event.count({
      where: {
        userId,
        startDate: { gte: now }
      }
    });

    const pastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const createdThisWeek = await prisma.event.count({
      where: {
        userId,
        createdAt: {
          gte: pastWeekStart
        }
      }
    });

    const total = await prisma.event.count({ where: { userId } });

    res.json({
      success: true,
      stats: {
        total,
        upcoming,
        createdThisWeek
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques événements:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des événements opérationnelle',
    service: 'event-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getTimeline,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  exportTimeline,
  getEventStats,
  getHealth
};

const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const companyService = require('../services/company.service');
const axios = require('axios');

const prisma = new PrismaClient();

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-service:3011';

// CREATE - Créer une candidature
const createApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      companyId,  // Peut être fourni directement
      companyName,  // ✅ NOUVEAU - Ou on peut fournir juste le nom
      companyData,  // ✅ NOUVEAU - Données supplémentaires de l'entreprise
      platformId,   // ✅ NOUVEAU - Plateforme de candidature utilisée
      position,
      description,
      location,
      contractType = 'CDI',
      workMode,
      applicationType = 'OFFRE',
      salaryMin,
      salaryMax,
      salaryNegotiable = false,
      status = 'CANDIDATE_PENDING', // Statut (enum ApplicationStatus)
      applicationDate,
      jobUrl,
      notes
    } = req.body;

    // Utiliser le statut fourni ou le statut par défaut
    const finalStatus = status || 'CANDIDATE_PENDING';

    // ✅ LOGIQUE INTELLIGENTE : Gérer automatiquement l'entreprise
    let finalCompanyId = companyId;

    // Si un nom d'entreprise est fourni au lieu d'un ID
    if (companyName && !companyId) {
      logger.info(`🏢 Gestion automatique entreprise: ${companyName}`);
      
      finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );

      logger.info(`✅ Entreprise traitée - ID: ${finalCompanyId}`);
    }

    // Vérifier qu'on a bien un companyId
    if (!finalCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId ou companyName requis'
      });
    }

    const application = await prisma.application.create({
      data: {
        userId: req.user.id,
        companyId: finalCompanyId,
        platformId: platformId || null,
        position,
        description,
        location,
        contractType,
        workMode,
        applicationType,
        salaryMin,
        salaryMax,
        salaryNegotiable,
        status: finalStatus, // Utiliser status (enum ApplicationStatus)
        applicationDate: applicationDate ? new Date(applicationDate) : new Date(), // ✅ NOUVEAU - Date par défaut
        jobUrl,
        notes
      },
      include: {
        company: true,
        platform: true // ✅ NOUVEAU - Inclure la plateforme
      }
    });

    // ✅ Créer automatiquement un événement calendrier pour la candidature
    try {
      const eventDate = applicationDate ? new Date(applicationDate) : new Date();
      const eventTitle = `📝 Candidature: ${position} chez ${application.company.name}`;
      const eventDescription = `Candidature envoyée pour le poste de ${position}\n\n${description || ''}`;

      await axios.post(
        `${EVENT_SERVICE_URL}/api/v1/events`,
        {
          title: eventTitle,
          description: eventDescription,
          type: 'APPLICATION',
          startDate: eventDate,
          endDate: eventDate,
          allDay: true,
          applicationId: application.id,
          relatedTo: 'APPLICATION',
          relatedId: application.id
        },
        {
          headers: {
            'Authorization': `Bearer ${req.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      logger.info(`✅ Événement calendrier créé pour candidature ${application.id}`);
    } catch (eventError) {
      // Ne pas bloquer la création de candidature si l'événement échoue
      logger.warn(`⚠️ Échec création événement calendrier: ${eventError.message}`);
    }

    // ✅ Créer une activité pour tracer la création
    try {
      await prisma.activity.create({
        data: {
          applicationId: application.id,
          type: 'APPLICATION_CREATED',
          description: `Candidature créée pour ${position} chez ${application.company.name}`
        }
      });
    } catch (activityError) {
      logger.warn(`⚠️ Échec création activité: ${activityError.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Candidature créée avec succès',
      application
    });

    logger.info(`✅ Candidature créée: ${application.id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur création candidature:', error);
    next(error);
  }
};

// READ - Lister les candidatures
const getApplications = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      logger.warn('Tentative d\'accès aux candidatures sans authentification');
      return res.status(401).json({
        success: false,
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder aux candidatures'
      });
    }

  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = 'false' // Inclure les candidatures archivées
  } = req.query;

    const offset = (page - 1) * limit;
    
  const where = {
    userId: req.user.id,
    ...(includeArchived !== 'true' && { archived: false }), // Exclure les candidatures archivées sauf si demandé
    // ✅ CORRECTION: Utiliser statusId au lieu de status (car status est une relation, pas un champ)
    ...(status && { 
      status: {
        code: status // Rechercher par code du statut
      }
    }),
    ...(search && {
      position: { contains: search, mode: 'insensitive' }
    })
  };

    let applications, total;
    try {
      [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            company: true,
            platform: true, // ✅ NOUVEAU - Inclure la plateforme
            status: true, // ✅ Inclure le statut (relation ApplicationStatus)
            _count: {
              select: {
                interviews: true,
                followUps: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.application.count({ where })
      ]);
    } catch (error) {
      // Fallback si table Application n'existe pas (P2021) - Mode développement
      const isTableError = error.code === 'P2021' || 
                          error.code === 'P2022' ||
                          (error.message && (
                            error.message.includes('does not exist') || 
                            error.message.includes('Table') || 
                            error.message.includes('relation') && error.message.includes('does not exist')
                          ));
      
      if (isTableError && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Application non trouvée, retour de données vides (mode développement)');
        logger.warn(`   Code erreur: ${error.code}, Message: ${error.message}`);
        applications = [];
        total = 0;
        
        return res.json({
          success: true,
          applications: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          },
          warning: 'Table Application non trouvée. Exécutez "make db-push-all" pour créer les tables.'
        });
      } else {
        // Logger l'erreur complète en développement
        if (process.env.NODE_ENV === 'development') {
          logger.error('Erreur récupération candidatures:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
          });
        } else {
          logger.error('Erreur récupération candidatures:', error);
        }
        return next(error);
      }
    }

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // Logger l'erreur complète en développement
    if (process.env.NODE_ENV === 'development') {
      logger.error('Erreur récupération candidatures (catch externe):', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
    } else {
      logger.error('Erreur récupération candidatures:', error);
    }
    next(error);
  }
};

// READ - Une candidature
const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        company: true,
        platform: true, // ✅ NOUVEAU - Inclure la plateforme
        interviews: {
          orderBy: { scheduledAt: 'asc' }
        },
        followUps: {
          orderBy: { scheduledDate: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    logger.error('Erreur récupération candidature:', error);
    next(error);
  }
};

// UPDATE
const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, companyData, ...updateData } = req.body;

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    // ✅ LOGIQUE INTELLIGENTE : Gérer automatiquement l'entreprise si nom fourni
    if (companyName && companyName !== '') {
      logger.info(`🏢 Mise à jour automatique entreprise: ${companyName}`);
      
      const finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );

      updateData.companyId = finalCompanyId;
      logger.info(`✅ Entreprise traitée - ID: ${finalCompanyId}`);
    }

    const application = await prisma.application.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Candidature mise à jour',
      application
    });

    logger.info(`Candidature mise à jour: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur mise à jour candidature:', error);
    next(error);
  }
};

// DELETE
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    await prisma.application.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Candidature supprimée'
    });

    logger.info(`Candidature supprimée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression candidature:', error);
    next(error);
  }
};

// NOUVEAU - Changer le statut d'une candidature
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus, comment } = req.body; // Accepter status (enum ApplicationStatus)

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'status requis'
      });
    }

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    // Récupérer le statut précédent pour l'historique
    const previousStatus = existingApplication.status;

    // Créer l'historique du changement de statut
    const statusHistory = await prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        previousStatus: previousStatus, // Utiliser le statut précédent (enum)
        newStatus: newStatus, // Utiliser le nouveau statut (enum)
        comment: comment || null
      }
    });

    // Mettre à jour le statut de la candidature
    const application = await prisma.application.update({
      where: { id },
      data: { status: newStatus }, // Utiliser status (enum ApplicationStatus)
      include: {
        company: true,
        platform: true
      }
    });

    res.json({
      success: true,
      message: 'Statut de la candidature mis à jour',
      application,
      statusHistory
    });

    logger.info(`Statut candidature ${id} changé de ${previousStatus} à ${newStatus} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur changement statut candidature:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir l'historique des statuts d'une candidature
const getApplicationStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const statusHistory = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { changedAt: 'desc' }
    });

    res.json({
      success: true,
      statusHistory,
      total: statusHistory.length
    });
  } catch (error) {
    logger.error('Erreur récupération historique statuts:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir les contacts d'une candidature
const getApplicationContacts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: req.user.id,
        contactApplications: {
          some: {
            applicationId: id
          }
        }
      },
      include: {
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      contacts,
      total: contacts.length
    });
  } catch (error) {
    logger.error('Erreur récupération contacts de la candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Application Service opérationnel',
    service: 'application-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  updateApplicationStatus,
  getApplicationStatusHistory,
  getApplicationContacts,
  getHealth
};

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Récupérer les préférences de l'utilisateur connecté
 */
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
    }

    // Valeurs par défaut
    const defaultPreferences = {
      refreshInterval: {
        logs: 30000,              // 30 secondes pour les logs de sécurité
        analytics: 10000,         // 10 secondes pour analytics
        metrics: 15000,           // 15 secondes pour les métriques
        dashboard: 30000,         // 30 secondes pour le dashboard
        services: 20000,          // 20 secondes pour les services
        notifications: 60000     // 60 secondes pour les notifications
      },
      display: {
        itemsPerPage: 20,
        compactMode: false,
        showCharts: true,
        showMetrics: true,
        detailedMetrics: false
      },
      notifications: {
        desktop: true,
        sound: false,
        highPriorityOnly: false,
        applicationUpdates: true,
        interviewReminders: true,
        followupReminders: true,
        deadlineAlerts: true,
        systemAlerts: true
      },
      theme: 'light',
      language: 'fr',
      timezone: 'Europe/Paris',
      metricsRetentionDays: 30,
      logsRetentionDays: 30,
      autoCleanupHistory: true
    };

    let customization;
    try {
      // Vérifier que userCustomization existe dans le client Prisma
      // Utiliser une vérification plus robuste
      const hasUserCustomization = prisma.userCustomization && 
                                   typeof prisma.userCustomization === 'object' &&
                                   typeof prisma.userCustomization.findUnique === 'function';
      
      if (!hasUserCustomization) {
        logger.warn('userCustomization non disponible dans Prisma client. Régénérez le client Prisma avec: npx prisma generate');
        return res.json({
          success: true,
          preferences: defaultPreferences
        });
      }
      
      customization = await prisma.userCustomization.findUnique({
        where: { userId }
      });

      // Si pas de customization, créer avec valeurs par défaut
      if (!customization) {
        try {
          customization = await prisma.userCustomization.create({
            data: {
              userId,
              settings: defaultPreferences
            }
          });
        } catch (createError) {
          // Si la table n'existe pas, retourner les valeurs par défaut
          if (createError.code === 'P2021' && process.env.NODE_ENV === 'development') {
            logger.warn('Table UserCustomization non trouvée, mode développement. Exécutez: make db-push-all');
            return res.json({
              success: true,
              preferences: defaultPreferences
            });
          }
          throw createError;
        }
      }

      res.json({
        success: true,
        preferences: customization.settings
      });
    } catch (dbError) {
      // Si la table n'existe pas, retourner les valeurs par défaut
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table UserCustomization non trouvée, mode développement. Exécutez: make db-push-all');
        return res.json({
          success: true,
          preferences: defaultPreferences
        });
      }
      throw dbError;
    }
  } catch (error) {
    logger.error('Erreur récupération préférences:', error);
    // En développement, si la table n'existe pas, retourner les valeurs par défaut
    if (error.code === 'P2021' && process.env.NODE_ENV === 'development') {
      logger.warn('Table UserCustomization non trouvée, mode développement. Exécutez: make db-push-all');
      return res.json({
        success: true,
        preferences: {
          refreshInterval: {
            logs: 30000,
            analytics: 10000,
            metrics: 15000,
            dashboard: 30000,
            services: 20000,
            notifications: 60000
          },
          display: {
            itemsPerPage: 20,
            compactMode: false,
            showCharts: true,
            showMetrics: true,
            detailedMetrics: false
          },
          notifications: {
            desktop: true,
            sound: false,
            highPriorityOnly: false,
            applicationUpdates: true,
            interviewReminders: true,
            followupReminders: true,
            deadlineAlerts: true,
            systemAlerts: true
          },
          theme: 'light',
          language: 'fr',
          timezone: 'Europe/Paris',
          metricsRetentionDays: 30,
          logsRetentionDays: 30,
          autoCleanupHistory: true
        }
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des préférences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour les préférences de l'utilisateur
 */
const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Préférences requises'
      });
    }

    // Vérifier si la customization existe
    let customization = await prisma.userCustomization.findUnique({
      where: { userId }
    });

    if (customization) {
      // Fusionner avec les préférences existantes
      const mergedSettings = {
        ...customization.settings,
        ...preferences,
        refreshInterval: {
          ...(customization.settings?.refreshInterval || {}),
          ...(preferences.refreshInterval || {})
        },
        display: {
          ...(customization.settings?.display || {}),
          ...(preferences.display || {})
        },
        notifications: {
          ...(customization.settings?.notifications || {}),
          ...(preferences.notifications || {})
        }
      };

      customization = await prisma.userCustomization.update({
        where: { userId },
        data: { settings: mergedSettings }
      });
    } else {
      // Créer nouvelle customization
      customization = await prisma.userCustomization.create({
        data: {
          userId,
          settings: preferences
        }
      });
    }

    logger.info(`Préférences mises à jour pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      preferences: customization.settings,
      message: 'Préférences mises à jour avec succès'
    });
  } catch (error) {
    logger.error('Erreur mise à jour préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des préférences'
    });
  }
};

/**
 * Réinitialiser les préférences par défaut
 */
const resetUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
    }

    const defaultSettings = {
      refreshInterval: {
        logs: 30000,
        analytics: 10000,
        metrics: 15000,
        dashboard: 30000,
        services: 20000,
        notifications: 60000
      },
      display: {
        itemsPerPage: 20,
        compactMode: false,
        showCharts: true,
        showMetrics: true,
        detailedMetrics: false
      },
      notifications: {
        desktop: true,
        sound: false,
        highPriorityOnly: false,
        applicationUpdates: true,
        interviewReminders: true,
        followupReminders: true,
        deadlineAlerts: true,
        systemAlerts: true
      },
      theme: 'light',
      language: 'fr',
      timezone: 'Europe/Paris',
      metricsRetentionDays: 30,
      logsRetentionDays: 30,
      autoCleanupHistory: true
    };

    const customization = await prisma.userCustomization.upsert({
      where: { userId },
      update: { settings: defaultSettings },
      create: {
        userId,
        settings: defaultSettings
      }
    });

    logger.info(`Préférences réinitialisées pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      preferences: customization.settings,
      message: 'Préférences réinitialisées avec succès'
    });
  } catch (error) {
    logger.error('Erreur réinitialisation préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation des préférences'
    });
  }
};

/**
 * Exporter les préférences de l'utilisateur
 */
const exportUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
    }

    const customization = await prisma.userCustomization.findUnique({
      where: { userId }
    });

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Aucune préférence trouvée'
      });
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      preferences: customization.settings
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="preferences-${userId}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    logger.error('Erreur export préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'export des préférences'
    });
  }
};

/**
 * Importer les préférences de l'utilisateur
 */
const importUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Préférences requises'
      });
    }

    // Valider la structure des préférences
    if (typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Format de préférences invalide'
      });
    }

    const customization = await prisma.userCustomization.upsert({
      where: { userId },
      update: { settings: preferences },
      create: {
        userId,
        settings: preferences
      }
    });

    logger.info(`Préférences importées pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      preferences: customization.settings,
      message: 'Préférences importées avec succès'
    });
  } catch (error) {
    logger.error('Erreur import préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'import des préférences'
    });
  }
};

module.exports = {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  exportUserPreferences,
  importUserPreferences
};


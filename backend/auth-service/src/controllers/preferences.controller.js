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

    let customization = await prisma.userCustomization.findUnique({
      where: { userId }
    });

    // Si pas de customization, créer avec valeurs par défaut
    if (!customization) {
      customization = await prisma.userCustomization.create({
        data: {
          userId,
          settings: {
            refreshInterval: {
              logs: 30000,              // 30 secondes pour les logs de sécurité
              analytics: 10000,         // 10 secondes pour analytics
              metrics: 15000,           // 15 secondes pour les métriques
              dashboard: 30000,         // 30 secondes pour le dashboard
              services: 20000           // 20 secondes pour les services
            },
            display: {
              itemsPerPage: 20,
              compactMode: false,
              showCharts: true,
              showMetrics: true
            },
            notifications: {
              desktop: true,
              sound: false,
              highPriorityOnly: false
            },
            theme: 'light',
            language: 'fr',
            timezone: 'Europe/Paris'
          }
        }
      });
    }

    res.json({
      success: true,
      preferences: customization.settings
    });
  } catch (error) {
    logger.error('Erreur récupération préférences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des préférences'
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
        services: 20000
      },
      display: {
        itemsPerPage: 20,
        compactMode: false,
        showCharts: true,
        showMetrics: true
      },
      notifications: {
        desktop: true,
        sound: false,
        highPriorityOnly: false
      },
      theme: 'light',
      language: 'fr',
      timezone: 'Europe/Paris'
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

module.exports = {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences
};


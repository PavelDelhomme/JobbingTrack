const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// ✅ Récupérer les préférences utilisateur
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Créer des préférences par défaut
      const defaultSettings = {
        theme: 'auto',
        language: 'fr',
        dashboardLayout: 'grid',
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        sidebarCollapsed: false,
        compactMode: false,
        showAnimations: true,
        itemsPerPage: 20,
        autoRefresh: true,
        refreshInterval: 30,
        notifications: {
          enabled: true,
          sound: true,
          position: 'top-right',
          duration: 5000
        },
        metricsDisplay: {
          showCPU: true,
          showMemory: true,
          showNetwork: true,
          showResponseTime: true,
          chartType: 'line'
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          reduceMotion: false,
          focusIndicators: true
        },
        dataRetention: {
          cacheDuration: 7,
          syncFrequency: 5,
          offlineMode: true
        }
      };

      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          settings: defaultSettings
        }
      });
    }

    res.json({
      success: true,
      data: preferences.settings,
      metadata: {
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préférences'
    });
  }
};

// ✅ Sauvegarder/Mettre à jour les préférences utilisateur
const saveUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const newSettings = req.body;

    // Vérifier si les préférences existent déjà
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (preferences) {
      // Fusionner les nouveaux paramètres avec les existants
      const mergedSettings = {
        ...preferences.settings,
        ...newSettings
      };

      preferences = await prisma.userPreferences.update({
        where: { userId },
        data: {
          settings: mergedSettings,
          updatedAt: new Date()
        }
      });
    } else {
      // Créer de nouvelles préférences
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          settings: newSettings
        }
      });
    }

    res.json({
      success: true,
      data: preferences.settings,
      message: 'Préférences sauvegardées avec succès',
      metadata: {
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la sauvegarde des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde des préférences'
    });
  }
};

// ✅ Réinitialiser les préférences aux valeurs par défaut
const resetUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const defaultSettings = {
      theme: 'auto',
      language: 'fr',
      dashboardLayout: 'grid',
      primaryColor: '#3B82F6',
      accentColor: '#10B981',
      sidebarCollapsed: false,
      compactMode: false,
      showAnimations: true,
      itemsPerPage: 20,
      autoRefresh: true,
      refreshInterval: 30,
      notifications: {
        enabled: true,
        sound: true,
        position: 'top-right',
        duration: 5000
      },
      metricsDisplay: {
        showCPU: true,
        showMemory: true,
        showNetwork: true,
        showResponseTime: true,
        chartType: 'line'
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        focusIndicators: true
      },
      dataRetention: {
        cacheDuration: 7,
        syncFrequency: 5,
        offlineMode: true
      }
    };

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        settings: defaultSettings,
        updatedAt: new Date()
      },
      create: {
        userId,
        settings: defaultSettings
      }
    });

    res.json({
      success: true,
      data: preferences.settings,
      message: 'Préférences réinitialisées avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la réinitialisation des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation des préférences'
    });
  }
};

module.exports = {
  getUserPreferences,
  saveUserPreferences,
  resetUserPreferences
};


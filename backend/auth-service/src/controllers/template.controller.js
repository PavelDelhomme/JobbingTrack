const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { detectVariables, replaceVariables, validateTemplate } = require('../utils/templateParser');

const prisma = new PrismaClient();

/**
 * Récupérer tous les templates
 */
const getTemplates = async (req, res) => {
  try {
    let templates = [];
    
    try {
      templates = await prisma.emailTemplate.findMany({
        orderBy: { type: 'asc' },
      });
    } catch (dbError) {
      // Si la table n'existe pas, retourner des templates par défaut
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table EmailTemplate non trouvée, retour de templates par défaut. Exécutez: make db-push-all');
        // Retourner des templates par défaut vides (le frontend a déjà des fallbacks)
        templates = [];
      } else {
        throw dbError;
      }
    }

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Erreur récupération templates:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
      details: error.message,
    });
  }
};

/**
 * Récupérer un template par type
 */
const getTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    let template = null;
    
    try {
      template = await prisma.emailTemplate.findUnique({
        where: { type },
      });
    } catch (dbError) {
      // Si la table n'existe pas, continuer avec template = null
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table EmailTemplate non trouvée, utilisation de templates par défaut. Exécutez: make db-push-all');
        template = null;
      } else {
        throw dbError;
      }
    }

    // Si le template n'existe pas en DB, retourner les templates par défaut
    if (!template) {
      const defaultTemplates = {
        WELCOME: {
          type: 'WELCOME',
          name: 'Email de Bienvenue',
          subject: '🎉 Bienvenue sur JobbingTrack !',
          htmlContent: '',
          textContent: '',
          variables: ['userName', 'appName', 'frontendUrl'],
          isActive: true,
          version: 1,
        },
        VERIFICATION: {
          type: 'VERIFICATION',
          name: 'Email de Vérification',
          subject: '✅ Vérifiez votre adresse email - JobbingTrack',
          htmlContent: '',
          textContent: '',
          variables: ['userName', 'verificationUrl', 'appName'],
          isActive: true,
          version: 1,
        },
        RESET_PASSWORD: {
          type: 'RESET_PASSWORD',
          name: 'Réinitialisation de Mot de Passe',
          subject: '🔐 Réinitialisation de votre mot de passe JobbingTrack',
          htmlContent: '',
          textContent: '',
          variables: ['userName', 'resetLink', 'appName', 'expiryMinutes'],
          isActive: true,
          version: 1,
        },
      };

      template = defaultTemplates[type] || null;
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Erreur récupération template:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du template',
    });
  }
};

/**
 * Créer ou mettre à jour un template
 */
const upsertTemplate = async (req, res) => {
  try {
    const { type, name, subject, htmlContent, textContent, isActive } = req.body;

    if (!type || !name || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Type, nom, sujet et contenu HTML sont requis',
      });
    }

    // Détecter automatiquement les variables dans le HTML
    const detectedVariables = detectVariables(htmlContent + ' ' + (subject || ''));
    
    // Détecter aussi dans le texte si présent
    if (textContent) {
      const textVariables = detectVariables(textContent);
      textVariables.forEach(v => {
        if (!detectedVariables.includes(v)) {
          detectedVariables.push(v);
        }
      });
    }

    // Vérifier si le template existe déjà
    let existing = null;
    try {
      existing = await prisma.emailTemplate.findUnique({
        where: { type },
      });
    } catch (dbError) {
      // Si la table n'existe pas, retourner une erreur explicite
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.error('Table EmailTemplate non trouvée. Exécutez: make db-push-all');
        return res.status(500).json({
          success: false,
          error: 'Table EmailTemplate non trouvée. Exécutez: make db-push-all',
          details: dbError.message,
        });
      } else {
        throw dbError;
      }
    }

    const templateData = {
      type,
      name,
      subject,
      htmlContent,
      textContent: textContent || null,
      variables: detectedVariables,
      isActive: isActive !== undefined ? isActive : true,
      version: existing ? existing.version + 1 : 1,
    };

    const template = await prisma.emailTemplate.upsert({
      where: { type },
      update: templateData,
      create: templateData,
    });

    logger.info(`Template ${type} ${existing ? 'mis à jour' : 'créé'} avec ${detectedVariables.length} variables détectées`);

    res.json({
      success: true,
      message: `Template ${existing ? 'mis à jour' : 'créé'} avec succès`,
      data: template,
    });
  } catch (error) {
    logger.error('Erreur sauvegarde template:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde du template',
      details: error.message,
    });
  }
};

/**
 * Prévisualiser un template avec des valeurs de test
 */
const previewTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const { variables: testVariables } = req.body || {};

    let template = await prisma.emailTemplate.findUnique({
      where: { type },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    // Valeurs de test par défaut
    const defaultTestValues = {
      userName: 'Jean',
      firstName: 'Jean',
      lastName: 'Dupont',
      appName: 'JobbingTrack',
      frontendUrl: 'http://localhost:8080',
      verificationUrl: 'http://localhost:8080/verify-email?token=example-token',
      resetLink: 'http://localhost:8080/reset-password?token=example-token',
      resetUrl: 'http://localhost:8080/reset-password?token=example-token',
      expiryMinutes: 60,
    };

    const variables = { ...defaultTestValues, ...testVariables };

    // Remplacer les variables dans le template
    const previewHtml = replaceVariables(template.htmlContent, variables);
    const previewText = template.textContent ? replaceVariables(template.textContent, variables) : null;
    const previewSubject = replaceVariables(template.subject, variables);

    res.json({
      success: true,
      data: {
        subject: previewSubject,
        html: previewHtml,
        text: previewText,
        variables: template.variables,
        usedVariables: Object.keys(variables),
      },
    });
  } catch (error) {
    logger.error('Erreur prévisualisation template:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la prévisualisation du template',
    });
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  upsertTemplate,
  previewTemplate,
};


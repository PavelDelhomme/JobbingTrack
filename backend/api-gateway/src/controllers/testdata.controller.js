const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');
const path = require('path');

/**
 * Génère des données de test cohérentes
 */
const generateTestData = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent générer des données de test.'
      });
    }

    const config = req.body || {};
    
    logger.info(`🎲 Admin ${req.user.email} génère des données de test avec config:`, config);

    // Configuration par défaut
    const preset = config.preset || 'standard';
    const configOptions = {
      minimal: { users: 2, companies: 5, applications: 5, contacts: 5, interviews: 2, followups: 3, calls: 2, events: 5, deletedItems: 1, archivedItems: 1 },
      standard: { users: 3, companies: 10, applications: 20, contacts: 15, interviews: 8, followups: 12, calls: 10, events: 20, deletedItems: 5, archivedItems: 3 },
      mobile: { users: 3, companies: 10, applications: 20, contacts: 12, interviews: 5, followups: 8, calls: 5, events: 10, deletedItems: 2, archivedItems: 2 },
      complete: { users: 5, companies: 20, applications: 50, contacts: 40, interviews: 20, followups: 30, calls: 25, events: 50, deletedItems: 10, archivedItems: 8 },
      demo: { users: 1, companies: 8, applications: 15, contacts: 12, interviews: 6, followups: 8, calls: 5, events: 15, deletedItems: 2, archivedItems: 2 }
    };

    const finalConfig = config.custom || configOptions[preset] || configOptions.standard;
    const configJson = JSON.stringify(finalConfig).replace(/"/g, '\\"');

    // Chemin du script : env, puis /app en Docker, puis relatif (local)
    let scriptPath = process.env.GENERATE_TEST_DATA_SCRIPT;
    if (!scriptPath) {
      const inApp = '/app/generate-test-data.js';
      const relative = path.resolve(__dirname, '../../..', 'generate-test-data.js');
      scriptPath = fs.existsSync(inApp) ? inApp : relative;
    }
    if (!fs.existsSync(scriptPath)) {
      logger.error('Script generate-test-data.js introuvable. Tente: /app/generate-test-data.js et ' + path.resolve(__dirname, '../../..', 'generate-test-data.js'));
      return res.status(500).json({
        success: false,
        error: `Script introuvable (cherche: /app/generate-test-data.js). Rebuild l'image api-gateway (make rebuild-service SERVICE=api-gateway).`
      });
    }
    const command = `node "${scriptPath}" '${configJson}'`;
    logger.info('📝 Exécution du script:', command);
    // Pour que l’admin qui lance la génération voie les données (Suivi intérim, etc.)
    const env = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public',
      TEST_DATA_OWNER_ID: req.user?.id || '',
      TEST_DATA_OWNER_EMAIL: req.user?.email || '',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@jobbingtrack.com'
    };
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env
    });

    if (stderr && !stderr.includes('Warning')) {
      logger.error('Erreur génération données test:', stderr);
    }

    logger.info('✅ Données de test générées avec succès');
    logger.info(stdout);

    res.json({
      success: true,
      message: 'Données de test générées avec succès',
      output: stdout,
      config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur génération données test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Nettoie toutes les données de test ou par tag
 * Utilise maintenant le champ isTestData pour distinguer les données
 */
const clearTestData = async (req, res) => {
  try {
    // Vérifier les permissions SUPER_ADMIN uniquement
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les ADMIN peuvent nettoyer les données de test.'
      });
    }

    const { tag, onlyTestData = true } = req.body || {};

    logger.warn(`🗑️ ${req.user.role} ${req.user.email} nettoie les données de test${tag ? ` avec tag: ${tag}` : ''}`);

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    let deletedCounts = {
      users: 0,
      companies: 0,
      applications: 0,
      contacts: 0,
      interviews: 0,
      followUps: 0,
      calls: 0,
      events: 0
    };

    try {
      // Supprimer uniquement les données marquées comme test (isTestData = true)
      if (onlyTestData) {
        // Supprimer dans l'ordre inverse des dépendances
        deletedCounts.events = await prisma.event.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.calls = await prisma.call.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.applications = await prisma.application.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.companies = await prisma.company.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        // Supprimer uniquement les utilisateurs marqués isTestData (ne pas toucher admin@jobbingtrack.com ni comptes réels)
        deletedCounts.users = await prisma.user.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        logger.info(`✅ Données de test nettoyées:`, deletedCounts);
      } else if (tag) {
        // Nettoyer par tag (ancienne méthode de fallback)
        const tagPattern = `[TEST_DATA_TAG:${tag}]`;
        
        deletedCounts.applications = await prisma.application.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.companies = await prisma.company.deleteMany({
          where: {
            description: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.calls = await prisma.call.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.events = await prisma.event.deleteMany({
          where: {
            description: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
      } else {
        // Nettoyer toutes les données de test (sans tag spécifique)
        deletedCounts.events = await prisma.event.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.calls = await prisma.call.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.applications = await prisma.application.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.companies = await prisma.company.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.users = await prisma.user.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);
      }
      
      await prisma.$disconnect();
      
      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
      
      logger.info(`✅ ${totalDeleted} données de test nettoyées`);
      
      res.json({
        success: true,
        message: `${totalDeleted} données de test supprimées`,
        deletedCounts,
        tag: tag || null,
        timestamp: new Date().toISOString()
      });
    } catch (prismaError) {
      await prisma.$disconnect();
      throw prismaError;
    }

  } catch (error) {
    logger.error('Erreur nettoyage données:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Statut des données de test
 */
const getTestDataStatus = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    // Compter les éléments dans la base
    const { stdout } = await execPromise(
      'cd /app/.. && docker compose exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT \'applications\' as table, COUNT(*) as count FROM \\"Application\\" UNION SELECT \'companies\', COUNT(*) FROM \\"Company\\" UNION SELECT \'contacts\', COUNT(*) FROM \\"Contact\\" UNION SELECT \'interviews\', COUNT(*) FROM \\"Interview\\" UNION SELECT \'followups\', COUNT(*) FROM \\"FollowUp\\" UNION SELECT \'calls\', COUNT(*) FROM \\"Call\\";"'
    );

    res.json({
      success: true,
      status: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération statut:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  generateTestData,
  clearTestData,
  getTestDataStatus
};


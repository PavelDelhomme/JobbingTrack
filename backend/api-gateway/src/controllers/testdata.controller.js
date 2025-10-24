const { exec } = require('child_process');
const util = require('util');
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
      complete: { users: 5, companies: 20, applications: 50, contacts: 40, interviews: 20, followups: 30, calls: 25, events: 50, deletedItems: 10, archivedItems: 8 },
      demo: { users: 1, companies: 8, applications: 15, contacts: 12, interviews: 6, followups: 8, calls: 5, events: 15, deletedItems: 2, archivedItems: 2 }
    };

    const finalConfig = config.custom || configOptions[preset] || configOptions.standard;
    const configJson = JSON.stringify(finalConfig).replace(/"/g, '\\"');
    
    // Exécuter le script de génération de données
    // Le script se trouve dans le répertoire parent du backend
    const scriptPath = path.resolve(__dirname, '../../..', 'generate-test-data.js');
    const command = `node "${scriptPath}" '${configJson}'`;
    
    logger.info('📝 Exécution du script:', command);
    
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public'
      }
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
 * Nettoie toutes les données de test
 */
const clearTestData = async (req, res) => {
  try {
    // Vérifier les permissions SUPER_ADMIN uniquement
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les SUPER_ADMIN peuvent nettoyer les données.'
      });
    }

    logger.warn(`🗑️ SUPER_ADMIN ${req.user.email} nettoie toutes les données de test`);

    // Exécuter le script de nettoyage
    const { stdout, stderr } = await execPromise(
      'cd /app/.. && docker compose exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "TRUNCATE TABLE \\"Application\\", \\"Interview\\", \\"FollowUp\\", \\"Call\\", \\"Contact\\", \\"Company\\", \\"Activity\\", \\"ApplicationContact\\", \\"ApplicationDocument\\", \\"Document\\", \\"Reminder\\", \\"MessageTemplate\\" CASCADE;"'
    );

    logger.info('✅ Données de test nettoyées');

    res.json({
      success: true,
      message: 'Toutes les données de test ont été supprimées',
      timestamp: new Date().toISOString()
    });

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


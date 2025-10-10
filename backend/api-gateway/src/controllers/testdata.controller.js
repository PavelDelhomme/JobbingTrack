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

    // Exécuter le script de génération
    const scriptPath = path.join(__dirname, '../../../generate-test-data.js');
    const configJson = JSON.stringify(config);
    
    const { stdout, stderr } = await execPromise(
      `cd /app/.. && node generate-test-data.js '${configJson}'`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );

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


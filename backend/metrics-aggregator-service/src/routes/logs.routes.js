const express = require('express');
const router = express.Router();
const lokiService = require('../services/loki.service');

/**
 * Routes pour les logs Loki
 * Toutes les routes nécessitent une authentification (middleware appliqué dans index.js)
 */

/**
 * GET /api/logs/container/:name
 * Récupère les logs d'un conteneur spécifique
 * @param {string} name - Nom du conteneur
 * Query params:
 *   - limit: Nombre maximum de lignes (optionnel, défaut: 100)
 *   - start: Timestamp de début (optionnel)
 *   - end: Timestamp de fin (optionnel)
 */
router.get('/container/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100, start, end } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nom du conteneur requis'
      });
    }

    const logs = await lokiService.getContainerLogs(name, limit, start, end);
    res.json(logs);
  } catch (error) {
    console.error(`[Routes] Erreur /container/${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logs/all
 * Récupère tous les logs de tous les services
 * Query params:
 *   - limit: Nombre maximum de lignes (optionnel, défaut: 100)
 *   - start: Timestamp de début (optionnel)
 *   - end: Timestamp de fin (optionnel)
 *   - service: Filtrer par service (optionnel)
 */
router.get('/all', async (req, res) => {
  try {
    const { limit = 100, start, end, service } = req.query;

    const logs = await lokiService.getAllLogs(limit, start, end, service);
    res.json(logs);
  } catch (error) {
    console.error('[Routes] Erreur /all:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logs/search/:name
 * Recherche dans les logs d'un conteneur avec un pattern
 * @param {string} name - Nom du conteneur
 * Query params:
 *   - pattern: Pattern de recherche (requis)
 *   - limit: Nombre maximum de lignes (optionnel, défaut: 100)
 */
router.get('/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { pattern, limit = 100 } = req.query;

    if (!name || !pattern) {
      return res.status(400).json({
        success: false,
        error: 'Nom du conteneur et pattern requis'
      });
    }

    const logs = await lokiService.searchLogs(name, pattern, limit);
    res.json(logs);
  } catch (error) {
    console.error(`[Routes] Erreur /search/${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logs/stream/:name
 * Stream des logs en temps réel via Server-Sent Events (SSE)
 * @param {string} name - Nom du conteneur
 */
router.get('/stream/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nom du conteneur requis'
      });
    }

    // Configuration SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const query = `{container="${name}"}`;
    const stream = await lokiService.streamLogs(query);

    // Pipe le stream vers la réponse
    stream.pipe(res);

    // Cleanup à la fermeture de la connexion
    req.on('close', () => {
      stream.destroy();
      res.end();
    });
  } catch (error) {
    console.error(`[Routes] Erreur /stream/${req.params.name}:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = router;

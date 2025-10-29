const express = require('express');
const router = express.Router();
const prometheusService = require('../services/prometheus.service');

/**
 * Routes pour les métriques Prometheus
 * Toutes les routes nécessitent une authentification (middleware appliqué dans index.js)
 */

/**
 * GET /api/metrics/system
 * Récupère les métriques globales de la machine
 */
router.get('/system', async (req, res) => {
  try {
    const metrics = await prometheusService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[Routes] Erreur /system:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/containers
 * Récupère les métriques de tous les conteneurs
 */
router.get('/containers', async (req, res) => {
  try {
    const metrics = await prometheusService.getAllContainersMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[Routes] Erreur /containers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/container/:name
 * Récupère les métriques d'un conteneur spécifique
 * @param {string} name - Nom du conteneur
 */
router.get('/container/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nom du conteneur requis'
      });
    }

    const metrics = await prometheusService.getContainerMetrics(name);
    res.json(metrics);
  } catch (error) {
    console.error(`[Routes] Erreur /container/${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/history
 * Récupère l'historique des métriques sur une plage de temps
 * Query params:
 *   - query: Requête PromQL (requis)
 *   - start: Timestamp de début (requis)
 *   - end: Timestamp de fin (requis)
 *   - step: Intervalle d'échantillonnage (optionnel, défaut: 1m)
 */
router.get('/history', async (req, res) => {
  try {
    const { query, start, end, step } = req.query;

    // Validation des paramètres requis
    if (!query || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants',
        message: 'Les paramètres query, start et end sont requis'
      });
    }

    const metrics = await prometheusService.getHistoryMetrics(query, start, end, step);
    res.json(metrics);
  } catch (error) {
    console.error('[Routes] Erreur /history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

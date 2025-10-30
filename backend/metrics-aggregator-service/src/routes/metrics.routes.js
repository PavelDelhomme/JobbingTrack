const express = require('express');
const router = express.Router();
const prometheusService = require('../services/prometheus.service');

// Métriques système hôte (CPU total, RAM totale, etc.)
router.get('/system', async (req, res) => {
  try {
    const result = await prometheusService.getSystemMetrics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tous les conteneurs JobbingTrack
router.get('/jobbingtrack/containers', async (req, res) => {
  try {
    const result = await prometheusService.getJobbingTrackContainersMetrics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistiques agrégées JobbingTrack (total, moyen, min, max)
router.get('/jobbingtrack/stats', async (req, res) => {
  try {
    const result = await prometheusService.getJobbingTrackStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Conteneur spécifique
router.get('/container/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await prometheusService.getContainerMetrics(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Historique (range query)
router.get('/history', async (req, res) => {
  try {
    const { query, start, end, step } = req.query;
    
    if (!query || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres requis : query, start, end'
      });
    }
    
    const result = await prometheusService.getHistoryMetrics(query, start, end, step);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

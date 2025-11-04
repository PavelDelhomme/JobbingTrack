const express = require('express');
const router = express.Router();

// GET /api/v1/metrics - Toutes les métriques
router.get('/', (req, res) => {
  const { containers, system, timestamp } = global.metricsCache;

  res.json({
    containers: Array.from(containers.values()),
    system,
    timestamp
  });
});

// GET /api/v1/metrics/containers/:id - Métrique d'un conteneur
router.get('/containers/:id', (req, res) => {
  const { id } = req.params;
  const container = global.metricsCache.containers.get(id);

  if (!container) {
    return res.status(404).json({ error: 'Conteneur non trouvé' });
  }

  res.json(container);
});

// GET /api/v1/metrics/system - Métriques système uniquement
router.get('/system', (req, res) => {
  res.json({
    system: global.metricsCache.system,
    timestamp: global.metricsCache.timestamp
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/workflow.controller');

router.get('/status', controller.getStatus);
router.post('/dev/jobs/:jobId/run', controller.runDevJob);

router.get('/', (req, res) => {
  res.json({ message: 'Workflow routes working' });
});

router.get('/rules', (req, res) => {
  res.json({ message: 'Workflow rules endpoint' });
});

module.exports = router;

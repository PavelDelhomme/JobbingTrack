const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Workflow routes working' });
});

router.get('/rules', (req, res) => {
  res.json({ message: 'Workflow rules endpoint' });
});

module.exports = router;

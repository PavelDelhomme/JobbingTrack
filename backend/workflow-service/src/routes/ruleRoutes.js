const express = require('express');
const router = express.Router();

// Routes pour les règles de workflow
router.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Workflow rules endpoint',
    rules: []
  });
});

router.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Rule routes operational' 
  });
});

// TODO: Implémenter les routes CRUD pour les règles
// router.post('/', createRule);
// router.get('/:id', getRule);
// router.put('/:id', updateRule);
// router.delete('/:id', deleteRule);

module.exports = router;


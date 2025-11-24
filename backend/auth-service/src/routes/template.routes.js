const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les templates
router.get('/', templateController.getTemplates);
router.get('/:type', templateController.getTemplate);
router.post('/:type', templateController.upsertTemplate);
router.put('/:type', templateController.upsertTemplate);
router.post('/:type/preview', templateController.previewTemplate);

module.exports = router;


const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/profile.controller');

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
// TODO: Ajouter les routes spécifiques au service
// - CVs: GET/POST/PUT/DELETE /cvs
// - Expériences: GET/POST/PUT/DELETE /experiences
// - Formations: GET/POST/PUT/DELETE /educations
// - Compétences: GET/POST/PUT/DELETE /skills
// - Langues: GET/POST/PUT/DELETE /languages
// - Projets: GET/POST/PUT/DELETE /projects

module.exports = router;


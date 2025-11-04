const express = require('express');
const router = express.Router();
const {
  globalSearch,
  advancedSearch,
  similaritySearch,
  tagSearch
} = require('../controllers/search.controller');

// Middleware d'authentification (optionnel selon les besoins)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }
  // TODO: Valider le token JWT
  next();
};

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Recherche globale intelligente
 *     description: Recherche dans tous les modules avec un terme de requête
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche (minimum 2 caractères)
 *       - in: query
 *         name: modules
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [applications, companies, contacts, interviews, calls]
 *         description: Modules à rechercher (par défaut tous)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre maximum de résultats par module
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur serveur
 */
router.get('/', globalSearch);

/**
 * @swagger
 * /api/v1/search/advanced:
 *   post:
 *     summary: Recherche avancée avec filtres
 *     description: Recherche avec filtres avancés et tri
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Terme de recherche
 *               modules:
 *                 type: array
 *                 items:
 *                   type: string
 *               filters:
 *                 type: object
 *                 description: Filtres spécifiques par module
 *               sortBy:
 *                 type: string
 *                 enum: [relevance, date, name]
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *               limit:
 *                 type: integer
 *               offset:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Résultats de recherche avancée
 *       400:
 *         description: Paramètres invalides
 */
router.post('/advanced', advancedSearch);

/**
 * @swagger
 * /api/v1/search/similar:
 *   get:
 *     summary: Recherche par similarité
 *     description: Trouve des suggestions de recherche similaires
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *       - in: query
 *         name: modules
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Suggestions de recherche
 */
router.get('/similar', similaritySearch);

/**
 * @swagger
 * /api/v1/search/tags:
 *   get:
 *     summary: Recherche par tags/mots-clés
 *     description: Recherche basée sur des tags spécifiques
 *     parameters:
 *       - in: query
 *         name: tags
 *         required: true
 *         schema:
 *           type: string
 *         description: Tags séparés par des virgules
 *       - in: query
 *         name: modules
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Résultats par tags
 */
router.get('/tags', tagSearch);

module.exports = router;

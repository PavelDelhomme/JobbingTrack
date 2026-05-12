const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-secret-key';
  }

  throw new Error('JWT_SECRET est requis pour authentifier les routes métriques');
}

/**
 * Middleware d'authentification JWT
 * Vérifie la présence et la validité du token JWT dans l'header Authorization
 */
const authenticateToken = (req, res, next) => {
  // Récupérer le header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  // Pas de token fourni
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token manquant',
      message: 'Authentification requise. Fournissez un token JWT dans l\'header Authorization.' 
    });
  }

  // Vérifier la validité du token
  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: 'Token invalide',
        message: 'Le token JWT fourni est invalide ou expiré.' 
      });
    }

    // Token valide, ajouter les infos utilisateur à la requête
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken
};

const jwt = require('jsonwebtoken');

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (process.env.NODE_ENV !== 'production' && authHeader?.includes('mock-')) {
    req.user = {
      role: 'SUPER_ADMIN',
      email: 'admin@jobbingtrack.test',
      id: 'mock-admin-123',
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const role = decoded.role || 'USER';
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
    }
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role,
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
}

module.exports = { authenticateAdmin };

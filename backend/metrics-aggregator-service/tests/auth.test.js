const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../src/middlewares/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Tests pour le middleware d'authentification JWT
 */
describe('Auth Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    // Mock des objets request, response et next
    req = {
      headers: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken middleware', () => {
    it('should call next() with valid token', () => {
      // Générer un token valide
      const validToken = jwt.sign(
        { id: 1, email: 'test@jobbingtrack.test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers['authorization'] = `Bearer ${validToken}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.email).toBe('test@jobbingtrack.test');
    });

    it('should return 401 when no token is provided', () => {
      // Pas de header Authorization
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token manquant',
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is malformed', () => {
      // Header Authorization sans "Bearer "
      req.headers['authorization'] = 'InvalidFormat';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token manquant',
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token-string';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token invalide',
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with expired token', () => {
      // Créer un token déjà expiré
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@jobbingtrack.test' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expiré depuis 1 heure
      );

      req.headers['authorization'] = `Bearer ${expiredToken}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token invalide',
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with token signed with wrong secret', () => {
      // Token signé avec un secret différent
      const tokenWithWrongSecret = jwt.sign(
        { id: 1, email: 'test@jobbingtrack.test' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      req.headers['authorization'] = `Bearer ${tokenWithWrongSecret}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token invalide',
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept token in lowercase "bearer"', () => {
      const validToken = jwt.sign(
        { id: 1, email: 'test@jobbingtrack.test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers['authorization'] = `bearer ${validToken}`;

      authenticateToken(req, res, next);

      // Note: Le middleware actuel utilise split(' ')[1], donc ça devrait fonctionner
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should handle token with extra data in payload', () => {
      const validToken = jwt.sign(
        {
          id: 1,
          email: 'test@jobbingtrack.test',
          role: 'admin',
          permissions: ['read', 'write']
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers['authorization'] = `Bearer ${validToken}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe(1);
      expect(req.user.email).toBe('test@jobbingtrack.test');
      expect(req.user.role).toBe('admin');
      expect(req.user.permissions).toEqual(['read', 'write']);
    });

    it('should not modify request when token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      const originalReq = { ...req };

      authenticateToken(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('JWT Token generation helpers', () => {
    it('should create valid tokens that pass middleware', () => {
      const payload = { id: 99, email: 'admin@jobbingtrack.test', role: 'superadmin' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe(99);
      expect(req.user.role).toBe('superadmin');
    });
  });
});

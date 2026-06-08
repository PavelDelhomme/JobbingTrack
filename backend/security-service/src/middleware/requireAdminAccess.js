function requireAdminAccess(req, res, next) {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Accès admin requis pour modifier les alertes email sécurité'
    });
  }
  return next();
}

module.exports = { requireAdminAccess };

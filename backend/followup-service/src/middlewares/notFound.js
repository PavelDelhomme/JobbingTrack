const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    message: `Route ${req.method} ${req.originalUrl} non trouvée dans le service de relances`
  });
};

module.exports = notFound;


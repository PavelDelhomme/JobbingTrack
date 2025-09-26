const notFound = (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée'
  });
};

module.exports = notFound;

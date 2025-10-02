const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// TODO: Implémenter les contrôleurs spécifiques au service
const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des contacts opérationnel',
    service: 'contact-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealth
};

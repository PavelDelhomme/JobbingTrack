const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// TODO: Implémenter les contrôleurs spécifiques au service
const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Statistiques et tableaux de bord opérationnel',
    service: 'dashboard-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealth
};

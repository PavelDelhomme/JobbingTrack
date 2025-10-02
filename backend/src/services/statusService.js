const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class StatusService {
  start() {
    console.log('🔄 Démarrage du service de mise à jour des statuts...');
    
    // Mise à jour des statuts tous les jours à 8h
    cron.schedule('0 8 * * *', () => {
      this.updateApplicationStatuses();
    });
  }

  async updateApplicationStatuses() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Applications envoyées il y a plus de 30 jours sans réponse -> NO_RESPONSE
      const oldApplications = await prisma.application.updateMany({
        where: {
          status: 'SENT',
          applicationDate: {
            lte: thirtyDaysAgo
          }
        },
        data: {
          status: 'NO_RESPONSE'
        }
      });

      logger.info(`${oldApplications.count} candidatures marquées comme "sans réponse"`);

      // Entretiens passés non marqués comme terminés -> NO_SHOW
      const pastInterviews = await prisma.interview.updateMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lt: new Date()
          }
        },
        data: {
          status: 'NO_SHOW'
        }
      });

      logger.info(`${pastInterviews.count} entretiens marqués comme "absent"`);
    } catch (error) {
      logger.error('Erreur mise à jour statuts:', error);
    }
  }
}

module.exports = new StatusService();
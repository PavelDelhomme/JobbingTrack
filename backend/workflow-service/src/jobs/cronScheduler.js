const cron = require('node-cron');
const workflowEngine = require('../services/workflowEngine');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class CronScheduler {
  
  start() {
    // Vérifie les exécutions en attente toutes les heures
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Checking pending workflow executions...');
      await this.processPendingExecutions();
    });

    // Vérifie les candidatures anciennes tous les jours à 9h
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Checking applications for auto-followup...');
      await this.checkApplicationsForAutoFollowup();
    });

    console.log('⏰ Cron scheduler started');
  }

  async processPendingExecutions() {
    try {
      const pendingExecutions = await prisma.workflowExecution.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            lte: new Date()
          }
        }
      });

      for (const execution of pendingExecutions) {
        try {
          await workflowEngine.executeActions(execution);
          console.log(`✅ Executed workflow ${execution.id}`);
        } catch (error) {
          console.error(`❌ Error executing workflow ${execution.id}:`, error);
          
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'FAILED',
              errorMessage: error.message
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending executions:', error);
    }
  }

  async checkApplicationsForAutoFollowup() {
    // Logique pour détecter les candidatures qui nécessitent une relance automatique
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Cette logique sera implémentée selon tes besoins spécifiques
    console.log('Checking applications older than', sevenDaysAgo);
  }
}

module.exports = new CronScheduler();

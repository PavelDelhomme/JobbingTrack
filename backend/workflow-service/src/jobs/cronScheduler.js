const cron = require('node-cron');
const workflowEngine = require('../services/workflowEngine');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

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

    // ✅ NOUVEAU - Nettoie la corbeille automatiquement tous les jours à 2h du matin
    cron.schedule('0 2 * * *', async () => {
      console.log('🗑️ Auto-cleaning trash (items older than 30 days)...');
      await this.autoCleanTrash();
    });

    // ✅ NOUVEAU - Envoie des rappels pour les entretiens à venir (tous les jours à 8h)
    cron.schedule('0 8 * * *', async () => {
      console.log('📅 Sending interview reminders...');
      await this.sendInterviewReminders();
    });

    // ✅ NOUVEAU - Envoie des rappels pour les relances à faire (tous les jours à 10h)
    cron.schedule('0 10 * * *', async () => {
      console.log('📧 Sending followup reminders...');
      await this.sendFollowupReminders();
    });

    console.log('⏰ Cron scheduler started with 5 jobs');
    console.log('   - Pending workflow executions: every hour');
    console.log('   - Auto-followup check: daily at 9:00');
    console.log('   - Trash auto-clean: daily at 2:00');
    console.log('   - Interview reminders: daily at 8:00');
    console.log('   - Followup reminders: daily at 10:00');
  }

  async processPendingExecutions() {
    try {
      // Vérifier si la table existe avant d'essayer de la lire
      if (!prisma.workflowRun || typeof prisma.workflowRun.findMany !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Table WorkflowRun not available, processing ignored (development mode)');
          return;
        }
        throw new Error('Table WorkflowRun not available');
      }

      let pendingExecutions;
      try {
        // Note: WorkflowRun n'a pas de champ scheduledAt, on utilise createdAt à la place
        // ou on cherche simplement les exécutions PENDING
        pendingExecutions = await prisma.workflowRun.findMany({
          where: {
            status: 'PENDING',
            createdAt: {
              lte: new Date()
            }
          }
        });
      } catch (error) {
        // Fallback si table WorkflowExecution n'existe pas (P2021) - Mode développement
        if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
          console.warn('Table WorkflowRun non trouvée, traitement ignoré (mode développement)');
          return;
        }
        throw error;
      }

      for (const execution of pendingExecutions) {
        try {
          await workflowEngine.executeActions(execution);
          console.log(`✅ Executed workflow ${execution.id}`);
        } catch (error) {
          console.error(`❌ Error executing workflow ${execution.id}:`, error);
          
          // Essayer de mettre à jour le statut, ignorer si la table n'existe pas
          try {
            if (prisma.workflowRun && typeof prisma.workflowRun.update === 'function') {
              await prisma.workflowRun.update({
                where: { id: execution.id },
                data: {
                  status: 'FAILED',
                  errorMessage: error.message
                }
              });
            }
          } catch (updateError) {
            if ((updateError.code === 'P2021' || updateError.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
              console.warn('Table WorkflowRun non trouvée, mise à jour ignorée (mode développement)');
            } else {
              console.error('Erreur lors de la mise à jour du statut:', updateError);
            }
          }
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

  /**
   * ✅ NOUVEAU - Nettoie automatiquement la corbeille (éléments de plus de 30 jours)
   */
  async autoCleanTrash() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      console.log(`🗑️ Nettoyage automatique de la corbeille (éléments avant ${thirtyDaysAgo.toISOString()})`);

      // Supprimer les candidatures anciennes (si le champ deletedAt existe)
      // Note: Le modèle Application dans workflow-service n'a pas de champ deletedAt
      // Cette fonctionnalité nécessite que le schéma Prisma soit synchronisé avec application-service
      let deletedApplications = { count: 0 };
      try {
        deletedApplications = await prisma.application.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        // Si le champ deletedAt n'existe pas, ignorer silencieusement
        if (error.message?.includes('Unknown argument `deletedAt`')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Application');
        } else {
          throw error;
        }
      }
      console.log(`   ✅ ${deletedApplications.count} candidatures supprimées définitivement`);

      // Supprimer les contacts anciens (si le champ deletedAt existe)
      let deletedContacts = { count: 0 };
      try {
        deletedContacts = await prisma.contact.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        if (error.message?.includes('Unknown argument `deletedAt`')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Contact');
        } else {
          throw error;
        }
      }
      console.log(`   ✅ ${deletedContacts.count} contacts supprimés définitivement`);

      // Supprimer les entretiens anciens (si le champ deletedAt existe)
      let deletedInterviews = { count: 0 };
      try {
        deletedInterviews = await prisma.interview.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        if (error.message?.includes('Unknown argument `deletedAt`')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Interview');
        } else {
          throw error;
        }
      }
      console.log(`   ✅ ${deletedInterviews.count} entretiens supprimés définitivement`);

      // Supprimer les relances anciennes (si le champ deletedAt existe)
      let deletedFollowUps = { count: 0 };
      try {
        deletedFollowUps = await prisma.followUp.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        if (error.message?.includes('Unknown argument `deletedAt`')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma FollowUp');
        } else {
          throw error;
        }
      }
      console.log(`   ✅ ${deletedFollowUps.count} relances supprimées définitivement`);

      // Supprimer les appels anciens (si le champ deletedAt existe)
      let deletedCalls = { count: 0 };
      try {
        deletedCalls = await prisma.call.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        if (error.message?.includes('Unknown argument `deletedAt`')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Call');
        } else {
          throw error;
        }
      }
      console.log(`   ✅ ${deletedCalls.count} appels supprimés définitivement`);

      const total = deletedApplications.count + deletedContacts.count + deletedInterviews.count + deletedFollowUps.count + deletedCalls.count;
      console.log(`🎉 Nettoyage terminé: ${total} éléments supprimés au total`);

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage automatique:', error);
    }
  }

  /**
   * ✅ NOUVEAU - Envoie des rappels pour les entretiens à venir (dans les 24h)
   */
  async sendInterviewReminders() {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date();

      const upcomingInterviews = await prisma.interview.findMany({
        where: {
          scheduledAt: {
            gte: today,
            lte: tomorrow
          },
          status: 'UPCOMING_ARRIVAL', // Utiliser UPCOMING_ARRIVAL (enum InterviewStatus dans workflow-service: UPCOMING_ARRIVAL, COMPLETED, FEEDBACK_PENDING, PENDING)
          // Note: deletedAt n'existe pas dans le schéma Interview de workflow-service
        },
        include: {
          application: {
            include: {
              user: true,
              company: true
            }
          }
        }
      });

      console.log(`📅 ${upcomingInterviews.length} entretiens à venir dans les 24h`);

      // TODO: Appeler le notification-service pour envoyer les rappels
      for (const interview of upcomingInterviews) {
        console.log(`   📧 Rappel à envoyer pour entretien ${interview.id} (${interview.application.user.email})`);
        // await axios.post(`${NOTIFICATION_SERVICE_URL}/api/v1/notifications/email`, { ... });
      }

    } catch (error) {
      console.error('❌ Erreur envoi rappels entretiens:', error);
    }
  }

  /**
   * ✅ NOUVEAU - Envoie des rappels pour les relances à faire aujourd'hui
   */
  async sendFollowupReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayFollowUps = await prisma.followUp.findMany({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow
          },
          completed: false,
          deletedAt: null
        },
        include: {
          application: {
            include: {
              user: true,
              company: true
            }
          },
          contact: true
        }
      });

      console.log(`📧 ${todayFollowUps.length} relances prévues aujourd'hui`);

      // TODO: Appeler le notification-service pour envoyer les rappels
      for (const followUp of todayFollowUps) {
        console.log(`   📧 Rappel à envoyer pour relance ${followUp.id} (${followUp.application.user.email})`);
        // await axios.post(`${NOTIFICATION_SERVICE_URL}/api/v1/notifications/email`, { ... });
      }

    } catch (error) {
      console.error('❌ Erreur envoi rappels relances:', error);
    }
  }
}

module.exports = new CronScheduler();

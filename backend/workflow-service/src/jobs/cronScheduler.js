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

    // ✅ Notifications "Penser à relancer" (candidatures > 7j sans réponse) + transition auto → NO_RESPONSE à 9h30
    cron.schedule('30 9 * * *', async () => {
      console.log('📋 Sending application reminders (no response > 7 days) + auto transition...');
      await this.sendApplicationReminders();
    });

    // ✅ 3.2b - Notification "Relance sans réponse" (> 5j après une relance) à 10h15
    cron.schedule('15 10 * * *', async () => {
      console.log('📧 Sending follow-up no-response reminders...');
      await this.sendFollowUpNoResponseReminders();
    });

    // ✅ 3.2b - Notification "Retour entretien attendu" (entretien passé sans feedback) à 8h15
    cron.schedule('15 8 * * *', async () => {
      console.log('📅 Sending interview feedback reminders...');
      await this.sendInterviewFeedbackReminders();
    });

    console.log('⏰ Cron scheduler started with 8 jobs');
    console.log('   - Pending workflow executions: every hour');
    console.log('   - Auto-followup check: daily at 9:00');
    console.log('   - Trash auto-clean: daily at 2:00');
    console.log('   - Interview reminders: daily at 8:00');
    console.log('   - Application reminders (7d) + transition NO_RESPONSE: daily at 9:30');
    console.log('   - Followup reminders: daily at 10:00');
    console.log('   - Follow-up no-response reminders: daily at 10:15');
    console.log('   - Interview feedback reminders: daily at 8:15');
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

      // Supprimer les entreprises en corbeille depuis > 30 jours (sans applications liées)
      let deletedCompanies = { count: 0 };
      try {
        const companiesToDelete = await prisma.company.findMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          },
          select: { id: true },
          take: 500
        });
        for (const c of companiesToDelete) {
          try {
            const appCount = await prisma.application.count({ where: { companyId: c.id } });
            if (appCount === 0) {
              await prisma.company.delete({ where: { id: c.id } });
              deletedCompanies.count += 1;
            }
          } catch (e) {
            // FK ou autre: ignorer cette entreprise
          }
        }
      } catch (error) {
        if (error.message?.includes('Unknown argument')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Company');
        } else {
          console.warn('   ⚠️ Erreur suppression entreprises:', error.message);
        }
      }
      console.log(`   ✅ ${deletedCompanies.count} entreprises supprimées définitivement`);

      // Supprimer les événements en corbeille depuis > 30 jours
      let deletedEvents = { count: 0 };
      try {
        deletedEvents = await prisma.event.deleteMany({
          where: {
            deletedAt: {
              lte: thirtyDaysAgo,
              not: null
            }
          }
        });
      } catch (error) {
        if (error.message?.includes('Unknown argument')) {
          console.log('   ⚠️ Champ deletedAt non disponible dans le schéma Event');
        } else {
          console.warn('   ⚠️ Erreur suppression événements:', error.message);
        }
      }
      console.log(`   ✅ ${deletedEvents.count} événements supprimés définitivement`);

      const total = deletedApplications.count + deletedContacts.count + deletedInterviews.count + deletedFollowUps.count + deletedCalls.count + deletedCompanies.count + deletedEvents.count;
      console.log(`🎉 Nettoyage terminé: ${total} éléments supprimés au total`);

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage automatique:', error);
    }
  }

  /**
   * Rappels pour les entretiens dans les 24h (notification in-app).
   */
  async sendInterviewReminders() {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcoming = await prisma.interview.findMany({
        where: {
          deletedAt: null,
          interviewDate: { gte: now, lte: in24h }
        },
        include: {
          application: { select: { userId: true, position: true }, include: { company: { select: { name: true } } } }
        }
      });

      for (const iv of upcoming) {
        const userId = iv.application?.userId;
        if (!userId) continue;
        try {
          await prisma.notification.create({
            data: {
              userId,
              type: 'REMINDER',
              title: 'Rappel entretien',
              message: `Entretien prévu pour ${iv.application?.position ?? 'candidature'} (${iv.application?.company?.name ?? ''})`,
              entityType: 'Interview',
              entityId: iv.id
            }
          });
        } catch (e) {
          console.warn('   Notification rappel entretien:', e.message);
        }
      }
      console.log(`   📅 ${upcoming.length} rappels entretien créés`);
    } catch (error) {
      console.error('❌ Erreur rappels entretiens:', error);
    }
  }

  /**
   * Rappels pour les relances à faire (date = aujourd'hui, notification in-app).
   */
  async sendFollowupReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const followUps = await prisma.followUp.findMany({
        where: {
          deletedAt: null,
          followUpDate: { gte: today, lt: tomorrow }
        },
        include: {
          application: { select: { userId: true, position: true }, include: { company: { select: { name: true } } } }
        }
      });

      for (const fu of followUps) {
        const userId = fu.application?.userId;
        if (!userId) continue;
        try {
          await prisma.notification.create({
            data: {
              userId,
              type: 'FOLLOWUP_DUE',
              title: 'Relance à faire',
              message: `Relance prévue pour ${fu.application?.position ?? 'candidature'} (${fu.application?.company?.name ?? ''})`,
              entityType: 'FollowUp',
              entityId: fu.id
            }
          });
        } catch (e) {
          console.warn('   Notification rappel relance:', e.message);
        }
      }
      console.log(`   📧 ${followUps.length} rappels relance créés`);
    } catch (error) {
      console.error('❌ Erreur rappels relances:', error);
    }
  }

  /**
   * Notifications "Penser à relancer" pour candidatures sans réponse > 7 jours.
   * 3.2b : Transition automatique CANDIDATE_PENDING → NO_RESPONSE pour ces candidatures.
   */
  async sendApplicationReminders() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const statusPending = await prisma.applicationStatus.findFirst({ where: { code: 'CANDIDATE_PENDING' } });
      const statusNoResponse = await prisma.applicationStatus.findFirst({ where: { code: 'NO_RESPONSE' } });
      if (!statusPending || !statusNoResponse) return;

      const applications = await prisma.application.findMany({
        where: {
          deletedAt: null,
          statusId: statusPending.id,
          applicationDate: { lt: sevenDaysAgo }
        },
        select: { id: true, userId: true, position: true, statusId: true, company: { select: { name: true } } }
      });

      let notificationsCreated = 0;
      let transitionsCount = 0;
      for (const app of applications) {
        try {
          await prisma.notification.create({
            data: {
              userId: app.userId,
              type: 'REMINDER',
              title: 'Penser à relancer',
              message: `Candidature "${app.position}" chez ${app.company?.name ?? '?'} sans réponse depuis plus de 7 jours.`,
              entityType: 'Application',
              entityId: app.id
            }
          });
          notificationsCreated++;

          // 3.2b - Transition automatique vers NO_RESPONSE
          try {
            await prisma.applicationStatusHistory.create({
              data: {
                applicationId: app.id,
                previousStatusId: app.statusId,
                newStatusId: statusNoResponse.id,
                comment: 'Transition automatique (candidature sans réponse > 7 jours)'
              }
            });
            await prisma.application.update({
              where: { id: app.id },
              data: { statusId: statusNoResponse.id }
            });
            transitionsCount++;
          } catch (e) {
            console.warn(`   Transition NO_RESPONSE pour ${app.id}:`, e.message);
          }
        } catch (e) {
          console.warn('   Notification relance candidature:', e.message);
        }
      }
      console.log(`   📋 ${notificationsCreated} notifications "Penser à relancer" créées, ${transitionsCount} transitions → NO_RESPONSE`);
    } catch (error) {
      console.error('❌ Erreur notifications candidatures:', error);
    }
  }

  /**
   * 3.2b - Notification "Relance sans réponse" : relance effectuée il y a > 5 jours, toujours pas de réponse.
   */
  async sendFollowUpNoResponseReminders() {
    try {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const noResponseStatusCodes = ['CANDIDATE_PENDING', 'NO_RESPONSE', 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP', 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP'];
      const statuses = await prisma.applicationStatus.findMany({
        where: { code: { in: noResponseStatusCodes } },
        select: { id: true }
      });
      const statusIds = statuses.map(s => s.id);
      if (statusIds.length === 0) return;

      // Candidatures dont la dernière relance date de plus de 5 jours et statut toujours "sans réponse"
      const applications = await prisma.application.findMany({
        where: {
          deletedAt: null,
          statusId: { in: statusIds },
          followUps: {
            some: {
              deletedAt: null,
              followUpDate: { lt: fiveDaysAgo }
            }
          }
        },
        include: {
          company: { select: { name: true } },
          followUps: {
            where: { deletedAt: null },
            orderBy: { followUpDate: 'desc' },
            take: 1
          }
        }
      });

      let created = 0;
      for (const app of applications) {
        const lastFu = app.followUps?.[0];
        if (!lastFu || lastFu.followUpDate >= fiveDaysAgo) continue;
        try {
          await prisma.notification.create({
            data: {
              userId: app.userId,
              type: 'REMINDER',
              title: 'Relance sans réponse',
              message: `Relance effectuée il y a plus de 5 jours pour "${app.position}" chez ${app.company?.name ?? '?'} — toujours pas de réponse.`,
              entityType: 'Application',
              entityId: app.id
            }
          });
          created++;
        } catch (e) {
          console.warn('   Notification relance sans réponse:', e.message);
        }
      }
      console.log(`   📧 ${created} notifications "Relance sans réponse" créées`);
    } catch (error) {
      console.error('❌ Erreur notifications relance sans réponse:', error);
    }
  }

  /**
   * 3.2b - Notification "Retour entretien attendu" : entretien passé, délai de retour dépassé (ou 7j) sans feedback.
   */
  async sendInterviewFeedbackReminders() {
    try {
      const now = new Date();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const interviews = await prisma.interview.findMany({
        where: {
          deletedAt: null,
          feedbackReceived: false,
          OR: [
            { feedbackExpectedTo: { lt: now } },
            { interviewDate: { lt: new Date(now.getTime() - sevenDaysMs) } }
          ]
        },
        include: {
          application: { select: { userId: true, position: true }, include: { company: { select: { name: true } } } }
        }
      });

      let created = 0;
      for (const iv of interviews) {
        const userId = iv.application?.userId;
        if (!userId) continue;
        try {
          await prisma.notification.create({
            data: {
              userId,
              type: 'REMINDER',
              title: 'Retour entretien attendu',
              message: `Retour attendu pour l'entretien "${iv.application?.position ?? 'candidature'}" (${iv.application?.company?.name ?? ''}) — délai dépassé.`,
              entityType: 'Interview',
              entityId: iv.id
            }
          });
          created++;
        } catch (e) {
          console.warn('   Notification retour entretien:', e.message);
        }
      }
      console.log(`   📅 ${created} notifications "Retour entretien attendu" créées`);
    } catch (error) {
      console.error('❌ Erreur notifications retour entretien:', error);
    }
  }

module.exports = new CronScheduler();

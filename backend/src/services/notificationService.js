const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class NotificationService {
    constructor() {
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        console.log('Démarrage du service de notification...');
        this.isRunning = true;

        // Vérifier les candidatures à relancer tous les jours à 9h
        cron.schedule('0 9 * * *', () => {
            this.checkApplicationsToFollowUp();
        });
    
        // Vérifier les entretiens à venir toutes les heures
        cron.schedule('0 * * * *', () => {
            this.checkUpcomingInterviews();
        });
    }

    async checkApplicationsToFollowUp() {
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
          // Applications envoyées il y a plus de 7 jours sans réponse
          const applicationsToFollowUp = await prisma.application.findMany({
            where: {
              status: 'SENT',
              applicationDate: {
                lte: sevenDaysAgo
              }
            },
            include: {
              user: true,
              company: true
            }
          });
    
          for (const application of applicationsToFollowUp) {
            // Créer un rappel
            await prisma.reminder.create({
              data: {
                userId: application.userId,
                title: `Relancer ${application.company.name}`,
                description: `Il est temps de relancer votre candidature pour le poste "${application.position}" chez ${application.company.name}`,
                dueDate: new Date(),
                type: 'APPLICATION_FOLLOWUP',
                relatedId: application.id
              }
            });
    
            // Envoyer email de rappel (optionnel)
            if (application.user.email) {
              await emailService.sendFollowUpReminder(application.user.email, application);
            }
          }
    
          logger.info(`${applicationsToFollowUp.length} rappels de relance créés`);
        } catch (error) {
          logger.error('Erreur lors de la vérification des relances:', error);
        }
      }
    
    async checkUpcomingInterviews() {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        // Entretiens programmés demain
        const upcomingInterviews = await prisma.interview.findMany({
        where: {
            scheduledAt: {
            gte: tomorrow,
            lt: dayAfterTomorrow
            },
            status: 'SCHEDULED'
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

        for (const interview of upcomingInterviews) {
        // Créer un rappel d'entretien
        await prisma.reminder.create({
            data: {
            userId: interview.application.userId,
            title: `Entretien demain`,
            description: `Entretien ${interview.type} prévu demain à ${interview.scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} chez ${interview.application.company.name}`,
            dueDate: new Date(),
            type: 'INTERVIEW',
            relatedId: interview.id
            }
        });

        // Envoyer email de rappel
        if (interview.application.user.email) {
            await emailService.sendInterviewReminder(interview.application.user.email, interview);
        }
        }

        logger.info(`${upcomingInterviews.length} rappels d'entretien créés`);
    } catch (error) {
        logger.error('Erreur lors de la vérification des entretiens:', error);
    }
    }
}


module.exports = new NotificationService();

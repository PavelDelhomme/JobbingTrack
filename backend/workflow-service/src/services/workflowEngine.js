const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

class WorkflowEngine {
  
  // Évalue les règles pour une candidature
  async evaluateApplicationRules(applicationId, event) {
    // Vérifier si la table existe
    if (!prisma.workflowRule || typeof prisma.workflowRule.findMany !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Table WorkflowRule non disponible, retour de règles vides (mode développement)');
        return [];
      }
      throw new Error('Table WorkflowRule non disponible');
    }

    let rules;
    try {
      rules = await prisma.workflowRule.findMany({
        where: {
          triggerEvent: event,
          isActive: true
        }
      });
    } catch (error) {
      // Fallback si table WorkflowRule n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        console.warn('Table WorkflowRule non trouvée, retour de règles vides (mode développement)');
        return [];
      }
      throw error;
    }

    for (const rule of rules) {
      await this.processRule(rule, applicationId);
    }
  }

  // Traite une règle spécifique
  async processRule(rule, entityId) {
    try {
      // Évaluer les conditions
      const conditionsMet = await this.evaluateConditions(rule.conditionsJson, entityId);
      
      if (conditionsMet) {
        // Planifier l'exécution
        await this.scheduleExecution(rule, entityId);
      }
    } catch (error) {
      console.error('Error processing rule:', error);
    }
  }

  // Évalue les conditions d'une règle
  async evaluateConditions(conditions, entityId) {
    // Exemple : vérifier si candidature sans réponse depuis X jours
    if (conditions.type === 'days_without_response') {
      const application = await this.getApplicationData(entityId);
      const daysDiff = this.getDaysDifference(application.updatedAt, new Date());
      return daysDiff >= conditions.days;
    }
    
    return false;
  }

  // Planifie l'exécution d'actions
  async scheduleExecution(rule, entityId) {
    const scheduledAt = rule.delayDays 
      ? new Date(Date.now() + rule.delayDays * 24 * 60 * 60 * 1000)
      : new Date();

    await prisma.workflowExecution.create({
      data: {
        userId: 'system', // TODO: récupérer userId
        entityId,
        entityType: 'Application',
        ruleId: rule.id,
        status: 'PENDING',
        scheduledAt
      }
    });
  }

  // Exécute les actions d'une règle
  async executeActions(execution) {
    // Vérifier si la table existe
    if (!prisma.workflowRule || typeof prisma.workflowRule.findUnique !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Table WorkflowRule non disponible, exécution ignorée (mode développement)');
        return;
      }
      throw new Error('Table WorkflowRule non disponible');
    }

    let rule;
    try {
      rule = await prisma.workflowRule.findUnique({
        where: { id: execution.ruleId }
      });
    } catch (error) {
      // Fallback si table WorkflowRule n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        console.warn('Table WorkflowRule non trouvée, exécution ignorée (mode développement)');
        return;
      }
      throw error;
    }

    const actions = rule.actionsJson;

    for (const action of actions) {
      await this.executeAction(action, execution.entityId);
    }

    // Vérifier si la table existe avant de mettre à jour
    if (prisma.workflowExecution && typeof prisma.workflowExecution.update === 'function') {
      try {
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            executedAt: new Date()
          }
        });
      } catch (error) {
        // Fallback si table WorkflowExecution n'existe pas (P2021) - Mode développement
        if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
          console.warn('Table WorkflowExecution non trouvée, mise à jour ignorée (mode développement)');
        } else {
          throw error;
        }
      }
    }
  }

  // Exécute une action spécifique
  async executeAction(action, entityId) {
    switch (action.type) {
      case 'UPDATE_STATUS':
        await this.updateApplicationStatus(entityId, action.newStatus);
        break;
      
      case 'CREATE_FOLLOWUP':
        await this.createFollowUp(entityId, action.followUpData);
        break;
      
      case 'SEND_NOTIFICATION':
        await this.sendNotification(entityId, action.notificationData);
        break;
    }
  }

  // Actions spécifiques
  async updateApplicationStatus(applicationId, newStatus) {
    await axios.put(`${process.env.APPLICATION_SERVICE_URL}/api/v1/applications/${applicationId}`, {
      status: newStatus
    });
  }

  async createFollowUp(applicationId, followUpData) {
    await axios.post(`${process.env.FOLLOWUP_SERVICE_URL}/api/v1/followup`, {
      applicationId,
      ...followUpData
    });
  }

  async sendNotification(entityId, notificationData) {
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/email`, {
      ...notificationData
    });
  }

  // Utilitaires
  async getApplicationData(applicationId) {
    const response = await axios.get(`${process.env.APPLICATION_SERVICE_URL}/api/v1/applications/${applicationId}`);
    return response.data;
  }

  getDaysDifference(date1, date2) {
    const diffTime = Math.abs(date2 - new Date(date1));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

module.exports = new WorkflowEngine();

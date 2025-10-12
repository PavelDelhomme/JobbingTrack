const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

class WorkflowEngine {
  
  // Évalue les règles pour une candidature
  async evaluateApplicationRules(applicationId, event) {
    const rules = await prisma.workflowRule.findMany({
      where: {
        triggerEvent: event,
        isActive: true
      }
    });

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
    const rule = await prisma.workflowRule.findUnique({
      where: { id: execution.ruleId }
    });

    const actions = rule.actionsJson;

    for (const action of actions) {
      await this.executeAction(action, execution.entityId);
    }

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        executedAt: new Date()
      }
    });
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

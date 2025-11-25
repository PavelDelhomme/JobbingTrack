/**
 * Configuration centralisée des ports pour tous les services JobbingTrack
 * Ce fichier définit les ports par défaut pour tous les services
 * Les valeurs peuvent être surchargées via les variables d'environnement
 */

module.exports = {
  // Ports externes (exposés sur l'hôte)
  EXTERNAL_PORTS: {
    FRONTEND: process.env.FRONTEND_PORT || 8080,
    API_GATEWAY: process.env.API_GATEWAY_PORT || 3000,
    AUTH_SERVICE: process.env.AUTH_SERVICE_PORT || 8001,
    APPLICATION_SERVICE: process.env.APPLICATION_SERVICE_PORT || 8002,
    COMPANY_SERVICE: process.env.COMPANY_SERVICE_PORT || 8003,
    CONTACT_SERVICE: process.env.CONTACT_SERVICE_PORT || 8004,
    INTERVIEW_SERVICE: process.env.INTERVIEW_SERVICE_PORT || 8005,
    CALL_SERVICE: process.env.CALL_SERVICE_PORT || 8006,
    EVENT_SERVICE: process.env.EVENT_SERVICE_PORT || 8007,
    FOLLOWUP_SERVICE: process.env.FOLLOWUP_SERVICE_PORT || 8008,
    METRICS_AGGREGATOR: process.env.METRICS_AGGREGATOR_PORT || 8014,
    DASHBOARD_SERVICE: process.env.DASHBOARD_SERVICE_PORT || 8012,
    POSTGRES: process.env.POSTGRES_PORT || 5432,
    REDIS: process.env.REDIS_PORT || 6379,
    MAILHOG: process.env.MAILHOG_PORT || 8025,
  },

  // Ports internes (dans les conteneurs Docker)
  INTERNAL_PORTS: {
    FRONTEND: process.env.FRONTEND_INTERNAL_PORT || 3000,
    API_GATEWAY: process.env.API_GATEWAY_INTERNAL_PORT || 3000,
    AUTH_SERVICE: process.env.AUTH_SERVICE_INTERNAL_PORT || 3001,
    APPLICATION_SERVICE: process.env.APPLICATION_SERVICE_INTERNAL_PORT || 3002,
    COMPANY_SERVICE: process.env.COMPANY_SERVICE_INTERNAL_PORT || 3003,
    CONTACT_SERVICE: process.env.CONTACT_SERVICE_INTERNAL_PORT || 3004,
    INTERVIEW_SERVICE: process.env.INTERVIEW_SERVICE_INTERNAL_PORT || 3005,
    CALL_SERVICE: process.env.CALL_SERVICE_INTERNAL_PORT || 3006,
    EVENT_SERVICE: process.env.EVENT_SERVICE_INTERNAL_PORT || 3007,
    FOLLOWUP_SERVICE: process.env.FOLLOWUP_SERVICE_INTERNAL_PORT || 3008,
    METRICS_AGGREGATOR: process.env.METRICS_AGGREGATOR_INTERNAL_PORT || 3014,
    DASHBOARD_SERVICE: process.env.DASHBOARD_SERVICE_INTERNAL_PORT || 3000,
    POSTGRES: process.env.POSTGRES_INTERNAL_PORT || 5432,
    REDIS: process.env.REDIS_INTERNAL_PORT || 6379,
  },

  // URLs complètes pour le frontend (utilisées côté client)
  getFrontendUrls() {
    const protocol = process.env.PROTOCOL || 'http';
    const host = process.env.FRONTEND_HOST || 'localhost';
    const port = this.EXTERNAL_PORTS.FRONTEND;
    return {
      base: `${protocol}://${host}:${port}`,
      api: `${protocol}://${host}:${this.EXTERNAL_PORTS.API_GATEWAY}`,
      metrics: `${protocol}://${host}:${this.EXTERNAL_PORTS.METRICS_AGGREGATOR}`,
    };
  },

  // URLs pour la communication inter-services (Docker)
  getServiceUrls() {
    return {
      apiGateway: `http://api-gateway:${this.INTERNAL_PORTS.API_GATEWAY}`,
      auth: `http://auth-service:${this.INTERNAL_PORTS.AUTH_SERVICE}`,
      application: `http://application-service:${this.INTERNAL_PORTS.APPLICATION_SERVICE}`,
      company: `http://company-service:${this.INTERNAL_PORTS.COMPANY_SERVICE}`,
      contact: `http://contact-service:${this.INTERNAL_PORTS.CONTACT_SERVICE}`,
      interview: `http://interview-service:${this.INTERNAL_PORTS.INTERVIEW_SERVICE}`,
      call: `http://call-service:${this.INTERNAL_PORTS.CALL_SERVICE}`,
      event: `http://event-service:${this.INTERNAL_PORTS.EVENT_SERVICE}`,
      followup: `http://followup-service:${this.INTERNAL_PORTS.FOLLOWUP_SERVICE}`,
      metrics: `http://metrics-aggregator:${this.INTERNAL_PORTS.METRICS_AGGREGATOR}`,
      dashboard: `http://dashboard-service:${this.INTERNAL_PORTS.DASHBOARD_SERVICE}`,
    };
  },

  // URLs pour le développement local (localhost)
  getLocalUrls() {
    const protocol = process.env.PROTOCOL || 'http';
    const host = process.env.HOST || 'localhost';
    return {
      frontend: `${protocol}://${host}:${this.EXTERNAL_PORTS.FRONTEND}`,
      apiGateway: `${protocol}://${host}:${this.EXTERNAL_PORTS.API_GATEWAY}`,
      auth: `${protocol}://${host}:${this.EXTERNAL_PORTS.AUTH_SERVICE}`,
      application: `${protocol}://${host}:${this.EXTERNAL_PORTS.APPLICATION_SERVICE}`,
      company: `${protocol}://${host}:${this.EXTERNAL_PORTS.COMPANY_SERVICE}`,
      contact: `${protocol}://${host}:${this.EXTERNAL_PORTS.CONTACT_SERVICE}`,
      interview: `${protocol}://${host}:${this.EXTERNAL_PORTS.INTERVIEW_SERVICE}`,
      call: `${protocol}://${host}:${this.EXTERNAL_PORTS.CALL_SERVICE}`,
      event: `${protocol}://${host}:${this.EXTERNAL_PORTS.EVENT_SERVICE}`,
      followup: `${protocol}://${host}:${this.EXTERNAL_PORTS.FOLLOWUP_SERVICE}`,
      metrics: `${protocol}://${host}:${this.EXTERNAL_PORTS.METRICS_AGGREGATOR}`,
      dashboard: `${protocol}://${host}:${this.EXTERNAL_PORTS.DASHBOARD_SERVICE}`,
    };
  },
};


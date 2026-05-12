/**
 * Configuration centralisée des ports pour le frontend
 * Les valeurs sont récupérées depuis les variables d'environnement
 * avec des valeurs par défaut si non définies
 */

// Ports externes (exposés sur l'hôte)
export const EXTERNAL_PORTS = {
  FRONTEND: parseInt(process.env.NEXT_PUBLIC_FRONTEND_PORT || '5003', 10),
  API_GATEWAY: parseInt(process.env.NEXT_PUBLIC_API_GATEWAY_PORT || '5002', 10),
  AUTH_SERVICE: parseInt(process.env.NEXT_PUBLIC_AUTH_SERVICE_PORT || '8001', 10),
  APPLICATION_SERVICE: parseInt(process.env.NEXT_PUBLIC_APPLICATION_SERVICE_PORT || '8002', 10),
  COMPANY_SERVICE: parseInt(process.env.NEXT_PUBLIC_COMPANY_SERVICE_PORT || '8003', 10),
  CONTACT_SERVICE: parseInt(process.env.NEXT_PUBLIC_CONTACT_SERVICE_PORT || '8004', 10),
  INTERVIEW_SERVICE: parseInt(process.env.NEXT_PUBLIC_INTERVIEW_SERVICE_PORT || '8005', 10),
  CALL_SERVICE: parseInt(process.env.NEXT_PUBLIC_CALL_SERVICE_PORT || '8006', 10),
  EVENT_SERVICE: parseInt(process.env.NEXT_PUBLIC_EVENT_SERVICE_PORT || '8007', 10),
  FOLLOWUP_SERVICE: parseInt(process.env.NEXT_PUBLIC_FOLLOWUP_SERVICE_PORT || '8008', 10),
  METRICS_AGGREGATOR: parseInt(process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_PORT || '5004', 10),
  DASHBOARD_SERVICE: parseInt(process.env.NEXT_PUBLIC_DASHBOARD_SERVICE_PORT || '8012', 10),
  POSTGRES: parseInt(process.env.NEXT_PUBLIC_POSTGRES_PORT || '5432', 10),
  REDIS: parseInt(process.env.NEXT_PUBLIC_REDIS_PORT || '6379', 10),
} as const;

// URLs complètes pour le frontend (utilisées côté client)
const getProtocol = () => {
  if (typeof window !== 'undefined') {
    return window.location.protocol.replace(':', '');
  }
  return process.env.NEXT_PUBLIC_PROTOCOL || 'http';
};

const getHost = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return process.env.NEXT_PUBLIC_HOST || 'localhost';
};

const isBrowserLocalHttp = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'http:' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
};

const getApiUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (
    configured &&
    isBrowserLocalHttp() &&
    configured.startsWith('https://api.jobbingtrack.localhost')
  ) {
    return `http://127.0.0.1:${EXTERNAL_PORTS.API_GATEWAY}`;
  }

  return configured || `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.API_GATEWAY}`;
};

export const FRONTEND_URLS = {
  base: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.FRONTEND}`,
  api: getApiUrl(),
  metrics: process.env.NEXT_PUBLIC_METRICS_URL || `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.METRICS_AGGREGATOR}`,
  auth: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.AUTH_SERVICE}`,
} as const;

// URLs pour les services individuels (développement local)
export const SERVICE_URLS = {
  apiGateway: FRONTEND_URLS.api,
  auth: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.AUTH_SERVICE}`,
  application: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.APPLICATION_SERVICE}`,
  company: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.COMPANY_SERVICE}`,
  contact: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.CONTACT_SERVICE}`,
  interview: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.INTERVIEW_SERVICE}`,
  call: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.CALL_SERVICE}`,
  event: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.EVENT_SERVICE}`,
  followup: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.FOLLOWUP_SERVICE}`,
  metrics: FRONTEND_URLS.metrics,
  dashboard: `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.DASHBOARD_SERVICE}`,
} as const;

// Helper pour construire une URL de service
export function getServiceUrl(serviceName: keyof typeof SERVICE_URLS): string {
  return SERVICE_URLS[serviceName] || FRONTEND_URLS.api;
}

// Helper pour obtenir le port d'un service
export function getServicePort(serviceName: keyof typeof EXTERNAL_PORTS): number {
  return EXTERNAL_PORTS[serviceName] || EXTERNAL_PORTS.API_GATEWAY;
}


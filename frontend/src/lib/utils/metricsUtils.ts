/**
 * Formater le nom du service pour l'affichage
 */
export function formatServiceName(containerName: string): string {
  // Convertir les noms de conteneurs en noms lisibles
  const nameMap: {[key: string]: string} = {
    'jobbingtrack-auth-service': 'Service d\'Authentification',
    'jobbingtrack-application-service': 'Service des Candidatures',
    'jobbingtrack-company-service': 'Service des Entreprises',
    'jobbingtrack-contact-service': 'Service des Contacts',
    'jobbingtrack-interview-service': 'Service des Entretiens',
    'jobbingtrack-notification-service': 'Service de Notifications',
    'jobbingtrack-dashboard-service': 'Service du Tableau de Bord',
    'jobbingtrack-call-service': 'Service des Appels',
    'jobbingtrack-profile-service': 'Service des Profils',
    'jobbingtrack-event-service': 'Service des Événements',
    'jobbingtrack-followup-service': 'Service de gestion des relances',
    'jobbingtrack-workflow-service': 'Service de Workflow',
    'jobbingtrack-security-service': 'Service de Sécurité',
    'jobbingtrack-deployment-service': 'Service de Déploiement',
    'jobbingtrack-api-gateway': 'API Gateway',
    'jobbingtrack-frontend': 'Frontend',
    'jobbingtrack-postgres': 'Base de Données',
    'jobbingtrack-redis': 'Cache Redis',
    'jobbingtrack-metrics-aggregator': 'Service de Métriques',
    'jobbingtrack-prometheus': 'Prometheus',
    'jobbingtrack-grafana': 'Grafana',
    'jobbingtrack-cadvisor': 'cAdvisor',
    'jobbingtrack-simple-metrics': 'Service de Métriques'
  }

  return nameMap[containerName] || containerName.replace(/jobbingtrack-/g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Obtenir l'URL du service
 */
export function getServiceUrl(serviceType: string): string {
  const urlMap: {[key: string]: string} = {
    'auth-service': 'http://localhost:3001',
    'application-service': 'http://localhost:3002',
    'company-service': 'http://localhost:3003',
    'contact-service': 'http://localhost:3004',
    'interview-service': 'http://localhost:3005',
    'notification-service': 'http://localhost:3006',
    'dashboard-service': 'http://localhost:3007',
    'call-service': 'http://localhost:3008',
    'profile-service': 'http://localhost:3009',
    'event-service': 'http://localhost:3011',
    'followup-service': 'http://localhost:3012',
    'workflow-service': 'http://localhost:3013',
    'api-gateway': 'http://localhost:3000',
    'frontend': 'http://localhost:3003',
    'database': 'http://localhost:5432',
    'cache': 'http://localhost:6379',
    'monitoring': 'http://localhost:9090'
  }

  return urlMap[serviceType] || 'http://localhost:3000'
}

/**
 * Obtenir le port du service
 */
export function getServicePort(serviceType: string): number {
  const portMap: {[key: string]: number} = {
    'auth-service': 3001,
    'application-service': 3002,
    'company-service': 3003,
    'contact-service': 3004,
    'interview-service': 3005,
    'notification-service': 3006,
    'dashboard-service': 3007,
    'call-service': 3008,
    'profile-service': 3009,
    'event-service': 3011,
    'followup-service': 3012,
    'workflow-service': 3013,
    'api-gateway': 3000,
    'frontend': 8080,
    'database': 5432,
    'cache': 6379,
    'monitoring': 9090
  }

  return portMap[serviceType] || 3000
}

/**
 * Formater les bytes en unité lisible (GB, MB, KB)
 */
export function formatBytes(bytes: number | string | undefined, decimals: number = 2): string {
  if (bytes === undefined || bytes === null || bytes === 'N/A') return 'N/A'
  
  const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes
  if (isNaN(numBytes) || numBytes === 0) return '0 B'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(numBytes) / Math.log(k))
  
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

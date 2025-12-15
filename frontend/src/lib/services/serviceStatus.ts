/**
 * Service status and criticality definitions
 * Used to determine how to handle service errors
 */

// Critical services that MUST be running for the application to function
export const CRITICAL_SERVICES = [
  'postgres',
  'redis',
  'api-gateway',
  'frontend',
  'auth-service',
  'metrics-aggregator'
] as const;

// Optional services that can be down without breaking core functionality
export const OPTIONAL_SERVICES = [
  'application-service',
  'company-service',
  'contact-service',
  'interview-service',
  'call-service',
  'event-service',
  'followup-service',
  'profile-service',
  'notification-service',
  'workflow-service',
  'dashboard-service',
  'security-service',
  'deployment-service'
] as const;

export type CriticalService = typeof CRITICAL_SERVICES[number];
export type OptionalService = typeof OPTIONAL_SERVICES[number];

/**
 * Check if a service is critical
 */
export function isCriticalService(serviceName: string): boolean {
  return CRITICAL_SERVICES.some(critical => 
    serviceName.toLowerCase().includes(critical.toLowerCase())
  );
}

/**
 * Check if a service is optional
 */
export function isOptionalService(serviceName: string): boolean {
  return OPTIONAL_SERVICES.some(optional => 
    serviceName.toLowerCase().includes(optional.toLowerCase())
  );
}

/**
 * Get user-friendly error message based on service criticality
 */
export function getServiceErrorMessage(serviceName: string, error: any): string {
  if (isCriticalService(serviceName)) {
    return `⚠️ Critical service "${serviceName}" is unavailable. This may cause system instability. Please check the service status.`;
  } else if (isOptionalService(serviceName)) {
    return `ℹ️ Optional service "${serviceName}" is currently unavailable. Core functionality remains available.`;
  } else {
    return `Service "${serviceName}" is unavailable: ${error.message || 'Unknown error'}`;
  }
}

/**
 * Check if error should be logged based on service criticality
 */
export function shouldLogServiceError(serviceName: string): boolean {
  // Always log critical service errors
  if (isCriticalService(serviceName)) {
    return true;
  }
  // Only log optional service errors in development
  return process.env.NODE_ENV === 'development';
}


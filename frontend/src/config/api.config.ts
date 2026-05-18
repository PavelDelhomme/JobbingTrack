/**
 * Configuration centralisée de l'API
 * Permet de gérer dynamiquement la version de l'API
 */

import { FRONTEND_URLS } from "./ports.config";

export const API_CONFIG = {
  // Version actuelle de l'API
  VERSION: "v1",

  // URL de base de l'API (depuis les variables d'environnement ou par défaut)
  BASE_URL: FRONTEND_URLS.api,

  // Timeout par défaut pour les requêtes (en ms)
  DEFAULT_TIMEOUT: 15000,

  // Activer/désactiver le cache
  CACHE_ENABLED: false,

  // Durée du cache (en ms)
  CACHE_DURATION: 60000, // 1 minute

  // Endpoints optionnels (peuvent ne pas exister sans erreur)
  OPTIONAL_ENDPOINTS: [
    "/auth/sessions/active",
    "/applications",
    "/companies",
    "/preferences",
  ],
} as const;

/**
 * Construit une URL complète avec la version de l'API
 * @param endpoint - L'endpoint (avec ou sans slash initial)
 * @returns L'URL complète
 *
 * @example
 * buildApiUrl('/users') // http://localhost:3000/api/v1/users
 * buildApiUrl('users') // http://localhost:3000/api/v1/users
 */
export function buildApiUrl(endpoint: string): string {
  // Enlever le slash initial si présent
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // Construire l'URL complète
  return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}/${cleanEndpoint}`;
}

/**
 * Vérifie si un endpoint est optionnel
 * @param endpoint - L'endpoint à vérifier
 * @returns true si l'endpoint est optionnel
 */
export function isOptionalEndpoint(endpoint: string): boolean {
  return API_CONFIG.OPTIONAL_ENDPOINTS.some((opt) => endpoint.includes(opt));
}

/**
 * Change la version de l'API (utile pour les tests ou migrations)
 * @param version - La nouvelle version (ex: 'v2', 'v3')
 */
export function setApiVersion(version: string): void {
  (API_CONFIG as { VERSION: string }).VERSION = version;
}

export default API_CONFIG;

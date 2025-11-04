import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Détecte si l'application s'exécute dans l'émulateur mobile
 * Vérifie plusieurs indicateurs : URL, user agent, et paramètres de requête
 */
export function isMobileEmulator(): boolean {
  if (typeof window === 'undefined') return false

  // Vérifier l'URL pour le paramètre d'émulation
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('mobile-emulator') || urlParams.has('emulator')) {
    return true
  }

  // Vérifier le pathname pour l'émulateur
  if (window.location.pathname.includes('/mobile-emulator')) {
    return true
  }

  // Vérifier le user agent pour les émulateurs mobiles
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (userAgent.includes('mobile') && (userAgent.includes('chrome') || userAgent.includes('firefox'))) {
    return true
  }

  // Vérifier si on est sur un petit écran (probablement mobile)
  if (window.innerWidth <= 768 && window.innerHeight <= 1024) {
    return true
  }

  return false
}

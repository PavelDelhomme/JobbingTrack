'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/auth'
import userTracking from '@/lib/tracking/userTracking'

/**
 * Provider de tracking qui initialise le système de tracking
 * et track automatiquement les événements utilisateur
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    // Le tracking s'initialise automatiquement via le singleton
    // Vérifier si on est sur mobile avant d'initialiser
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isBackoffice = pathname?.startsWith('/backoffice');
      
      // Le tracking est uniquement pour mobile et pas dans le backoffice
      if (isMobile && !isBackoffice) {
        console.log('[TRACKING] Système de tracking initialisé (mobile uniquement)')
      } else {
        console.log('[TRACKING] Tracking désactivé - plateforme web/backoffice')
      }
    }
  }, [])

  // Tracker les changements de page uniquement sur mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isBackoffice = pathname?.startsWith('/backoffice');
      
      // Tracker uniquement sur mobile et pas dans le backoffice
      if (isMobile && !isBackoffice) {
        userTracking.trackPageView()
      }
    }
  }, [pathname])

  return <>{children}</>
}

/**
 * Hook pour tracker les clics sur les boutons
 */
export function useTracking() {
  const trackClick = (element: HTMLElement, eventName?: string) => {
    userTracking.trackClick(element, eventName)
  }

  const trackEvent = (
    eventName: string,
    eventType: string = 'click',
    category?: string,
    properties?: Record<string, any>
  ) => {
    userTracking.trackEvent(eventName, eventType, category, properties)
  }

  const trackError = (
    error: Error | string,
    errorType: string = 'javascript',
    severity: 'error' | 'warning' | 'critical' = 'error'
  ) => {
    userTracking.trackError(error, errorType, severity)
  }

  const trackPerformance = (
    metricName: string,
    metricType: string,
    value?: number,
    duration?: number
  ) => {
    userTracking.trackPerformance(metricName, metricType, value, duration)
  }

  return {
    trackClick,
    trackEvent,
    trackError,
    trackPerformance
  }
}


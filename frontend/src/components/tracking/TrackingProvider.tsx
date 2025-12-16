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
    // On peut juste s'assurer qu'il est activé
    if (typeof window !== 'undefined') {
      // Le tracking est déjà initialisé dans le singleton
      console.log('[TRACKING] Système de tracking initialisé')
    }
  }, [])

  // Tracker les changements de page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      userTracking.trackPageView()
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
    severity: 'error&apos; | 'warning' | &apos;critical' = 'error'
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


'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { useTracking } from './TrackingProvider'

interface TrackedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  trackingEvent?: string
  trackingCategory?: string
  children: React.ReactNode
}

/**
 * Bouton avec tracking automatique des clics
 */
export const TrackedButton = forwardRef<HTMLButtonElement, TrackedButtonProps>(
  ({ trackingEvent, trackingCategory = 'ui', onClick, children, ...props }, ref) => {
    const { trackClick, trackEvent } = useTracking()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Tracker le clic
      if (trackingEvent) {
        trackEvent(trackingEvent, 'click', trackingCategory, {
          elementId: props.id,
          elementType: 'button',
          elementText: typeof children === 'string' ? children : undefined
        })
      } else {
        trackClick(e.currentTarget, `button_click_${props.id || 'unknown'}`)
      }

      // Appeler le onClick original
      onClick?.(e)
    }

    return (
      <button ref={ref} {...props} onClick={handleClick}>
        {children}
      </button>
    )
  }
)

TrackedButton.displayName = 'TrackedButton'


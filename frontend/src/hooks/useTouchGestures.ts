/**
 * Hook pour les gestes tactiles avancés sur mobile
 * Support des gestes swipe, pinch, tap, long press, etc.
 */

import { useEffect, useRef, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onTwoFingerTap?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  preventDefault?: boolean;
}

interface TouchState {
  touches: TouchPoint[];
  startTime: number;
  lastTapTime: number;
  isLongPress: boolean;
  longPressTimer: NodeJS.Timeout | null;
  initialPinchDistance: number;
  pinchStartTime: number;
}

export const useTouchGestures = (config: GestureConfig) => {
  const elementRef = useRef<HTMLElement>(null);
  const touchStateRef = useRef<TouchState>({
    touches: [],
    startTime: 0,
    lastTapTime: 0,
    isLongPress: false,
    longPressTimer: null,
    initialPinchDistance: 0,
    pinchStartTime: 0
  });

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onPinchStart,
    onPinchEnd,
    onTap,
    onDoubleTap,
    onLongPress,
    onTwoFingerTap,
    minSwipeDistance = 50,
    maxSwipeTime = 1000,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 10,
    preventDefault = true
  } = config;

  // Calculer la distance entre deux points tactiles
  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculer la direction d'un swipe
  const calculateDirection = useCallback((start: TouchPoint, end: TouchPoint) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < minSwipeDistance) {
      return null;
    }

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, [minSwipeDistance]);

  // Gestionnaire de touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }));

    touchStateRef.current.touches = touches;
    touchStateRef.current.startTime = Date.now();
    touchStateRef.current.isLongPress = false;

    // Gestion du pinch (2 doigts)
    if (touches.length === 2) {
      touchStateRef.current.initialPinchDistance = calculateDistance(
        event.touches[0],
        event.touches[1]
      );
      touchStateRef.current.pinchStartTime = Date.now();

      if (onPinchStart) {
        onPinchStart();
      }
    }

    // Gestion du long press
    if (touches.length === 1 && onLongPress) {
      touchStateRef.current.longPressTimer = setTimeout(() => {
        touchStateRef.current.isLongPress = true;
        onLongPress();
      }, longPressDelay);
    }
  }, [calculateDistance, onPinchStart, onLongPress, longPressDelay, preventDefault]);

  // Gestionnaire de touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const currentTouches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }));

    const state = touchStateRef.current;
    state.touches = currentTouches;

    // Gestion du pinch
    if (currentTouches.length === 2 && state.initialPinchDistance > 0) {
      const currentDistance = calculateDistance(
        event.touches[0],
        event.touches[1]
      );

      const scale = currentDistance / state.initialPinchDistance;

      if (Math.abs(scale - 1) > pinchThreshold / 100) {
        if (onPinch) {
          onPinch(scale);
        }
      }
    }

    // Annuler le long press si mouvement détecté
    if (state.longPressTimer && !state.isLongPress) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }, [calculateDistance, onPinch, pinchThreshold, preventDefault]);

  // Gestionnaire de touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const state = touchStateRef.current;
    const endTime = Date.now();
    const touchDuration = endTime - state.startTime;

    // Annuler le long press si toujours actif
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    const touches = Array.from(event.touches);
    const changedTouches = Array.from(event.changedTouches);

    // Gestion du pinch end
    if (state.initialPinchDistance > 0 && touches.length < 2) {
      state.initialPinchDistance = 0;

      if (onPinchEnd) {
        onPinchEnd();
      }
    }

    // Gestion des taps et swipes
    if (changedTouches.length === 1 && touchDuration < maxSwipeTime) {
      const touch = changedTouches[0];
      const endPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: endTime
      };

      const direction = calculateDirection(state.touches[0], endPoint);

      // Swipe gestures
      if (direction) {
        switch (direction) {
          case 'left':
            if (onSwipeLeft) onSwipeLeft();
            break;
          case 'right':
            if (onSwipeRight) onSwipeRight();
            break;
          case 'up':
            if (onSwipeUp) onSwipeUp();
            break;
          case 'down':
            if (onSwipeDown) onSwipeDown();
            break;
        }
      } else {
        // Tap gesture
        const now = Date.now();
        const timeSinceLastTap = now - state.lastTapTime;

        if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
          onDoubleTap();
          state.lastTapTime = 0; // Reset pour éviter triple tap
        } else {
          state.lastTapTime = now;
          if (onTap) {
            // Délai pour permettre le double tap
            setTimeout(() => {
              if (now === state.lastTapTime && onTap) {
                onTap();
              }
            }, doubleTapDelay);
          }
        }
      }
    }

    // Two finger tap
    if (changedTouches.length === 2 && onTwoFingerTap) {
      onTwoFingerTap();
    }

    // Reset state
    state.touches = [];
    state.startTime = 0;
  }, [
    onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown,
    onPinchEnd, onTap, onDoubleTap, onTwoFingerTap,
    maxSwipeTime, doubleTapDelay, calculateDirection, preventDefault
  ]);

  // Gestionnaire de touch cancel
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const state = touchStateRef.current;

    // Nettoyer les timers
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Reset state
    state.touches = [];
    state.startTime = 0;
    state.isLongPress = false;
    state.initialPinchDistance = 0;
  }, [preventDefault]);

  // Configuration des event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, preventDefault]);

  // Hook pour attacher les gestes à un élément
  const attachGestures = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  return {
    attachGestures,
    ref: elementRef
  };
};

// Hook spécialisé pour les swipes
export const useSwipeGestures = (config: Pick<GestureConfig, 'onSwipeLeft' | 'onSwipeRight' | 'onSwipeUp' | 'onSwipeDown' | 'minSwipeDistance' | 'maxSwipeTime'>) => {
  return useTouchGestures(config);
};

// Hook spécialisé pour le pinch
export const usePinchGestures = (config: Pick<GestureConfig, 'onPinch' | 'onPinchStart' | 'onPinchEnd' | 'pinchThreshold'>) => {
  return useTouchGestures(config);
};

// Hook spécialisé pour les taps
export const useTapGestures = (config: Pick<GestureConfig, 'onTap' | 'onDoubleTap' | 'onLongPress' | 'longPressDelay' | 'doubleTapDelay'>) => {
  return useTouchGestures(config);
};

// Hook pour les gestes multi-touch
export const useMultiTouchGestures = (config: Pick<GestureConfig, 'onTwoFingerTap'>) => {
  return useTouchGestures(config);
};

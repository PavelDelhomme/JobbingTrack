/**
 * Composant LoadingState - Affichage unifié des états de chargement
 * Utilisé dans tout le backoffice pour une UX cohérente
 */

import React from 'react';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Loader2 } from '@/lib/icons';

interface LoadingStateProps {
  /**
   * Message à afficher pendant le chargement
   * Par défaut: "Chargement..."
   */
  message?: string;
  
  /**
   * Taille du spinner
   * Par défaut: 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Afficher en mode plein écran
   * Par défaut: false
   */
  fullScreen?: boolean;
  
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function LoadingState({ 
  message = 'Chargement...', 
  size = 'md',
  fullScreen = false,
  className = '',
}: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'
    : 'flex items-center justify-center py-12';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        {/* Spinner animé avec Lucide React */}
        <Loader2 
          className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4`}
        />
        
        {/* Message de chargement */}
        <p className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-400 font-medium`}>
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * LoadingSpinner - Variante minimale (juste le spinner)
 */
export function LoadingSpinner({ size = 'md', className = '' }: Omit<LoadingStateProps, 'message' | 'fullScreen'>) {
  return (
    <Loader2 
      className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400 ${className}`}
    />
  );
}

/**
 * LoadingOverlay - Overlay de chargement pour modals/cartes
 */
export function LoadingOverlay({ message = 'Chargement...', size = 'md' }: Omit<LoadingStateProps, 'fullScreen' | 'className'>) {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="text-center">
        <Loader2 
          className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4`}
        />
        <p className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-400 font-medium`}>
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * LoadingCard - Skeleton de carte pendant le chargement
 */
export function LoadingCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      ))}
    </>
  );
}


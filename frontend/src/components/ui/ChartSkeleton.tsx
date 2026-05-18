/**
 * Composant Skeleton pour les graphiques
 * Affiche un placeholder pendant le chargement pour une meilleure UX
 */

import React from "react";

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({
  height = 300,
  className = "",
}: ChartSkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
        {/* Lignes de grille simulées */}
        <div className="absolute inset-0 flex flex-col justify-between py-4 px-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-px bg-gray-300 dark:bg-gray-600 w-full"
            ></div>
          ))}
        </div>
        {/* Lignes de données simulées */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,80 Q 25,60 50,50 T 100,40"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            d="M 0,70 Q 25,55 50,45 T 100,35"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            opacity="0.3"
          />
        </svg>
        {/* Indicateur de chargement */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chargement du graphique...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour les graphiques en barres
 */
export function BarChartSkeleton({
  height = 300,
  className = "",
}: ChartSkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
        {/* Barres simulées */}
        <div className="absolute inset-0 flex items-end justify-around py-4 px-6 gap-2">
          {[60, 45, 70, 35, 55, 80, 40, 65].map((h, i) => (
            <div
              key={i}
              className="bg-blue-400 dark:bg-blue-600 rounded-t flex-1"
              style={{ height: `${h}%` }}
            ></div>
          ))}
        </div>
        {/* Indicateur de chargement */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chargement du graphique...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

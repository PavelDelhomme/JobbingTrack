"use client";

import { Suspense, lazy, ComponentType } from "react";

/**
 * Composant pour le lazy loading des onglets
 * Évite de charger tous les graphiques en même temps
 */
export function createLazyTab<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
) {
  const LazyComponent = lazy(importFn);

  return function LazyTab(props: any) {
    return (
      <Suspense fallback={fallback || <TabSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"
          ></div>
        ))}
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-96"></div>
    </div>
  );
}

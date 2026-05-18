"use client";

import React from "react";

interface MetricsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface MetricsErrorBoundaryProps {
  children: React.ReactNode;
}

class MetricsErrorBoundary extends React.Component<
  MetricsErrorBoundaryProps,
  MetricsErrorBoundaryState
> {
  constructor(props: MetricsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MetricsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MetricsErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-yellow-600 dark:text-yellow-400 text-xl">
              📊
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Métriques temporairement indisponibles
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Les données système ne peuvent pas être chargées pour le moment.
              </p>
            </div>
            <button
              onClick={this.resetError}
              className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MetricsErrorBoundary;

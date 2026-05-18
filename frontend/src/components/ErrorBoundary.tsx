"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Mettre à jour l'état pour afficher l'interface de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger l'erreur pour le debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Reporter l'erreur à un service de monitoring si disponible
    if (typeof window !== "undefined" && window.console) {
      console.error("🔥 Runtime Error:", error.message);
      console.error("📍 Error Stack:", error.stack);
      console.error("📋 Component Stack:", errorInfo.componentStack);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Rendu du fallback personnalisé ou par défaut
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      // Fallback par défaut
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Une erreur inattendue s'est produite
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Le système a rencontré un problème. Cette erreur a été
              automatiquement signalée.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                  Détails de l'erreur (développement)
                </summary>
                <pre className="text-xs mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="space-y-2">
              <button
                onClick={this.resetError}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                🔄 Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded transition-colors"
              >
                🔄 Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

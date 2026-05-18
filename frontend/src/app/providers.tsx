"use client";

import { AuthProvider } from "@/lib/hooks/auth";
import { ThemeProvider } from "@/lib/hooks/theme";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import { setupBrowserExtensionCleanup } from "@/utils/cleanBrowserExtensions";
import { useEffect } from "react";

function HydrationFix() {
  useEffect(() => {
    return setupBrowserExtensionCleanup();
  }, []);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HydrationFix />
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <TrackingProvider>
              <div
                className="min-h-screen bg-gray-50 dark:bg-gray-950"
                suppressHydrationWarning
              >
                {children}
              </div>
            </TrackingProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </>
  );
}

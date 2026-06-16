"use client";

import { useAuth } from "@/lib/hooks/auth";
import { useTheme } from "@/lib/hooks/theme";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/backoffice");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          JobbingTrack
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Redirection en cours...
        </p>
      </div>
    </div>
  );
}

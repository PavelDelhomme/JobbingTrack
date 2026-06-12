"use client";

import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { JobbingTrackLogo } from "@/components/brand/JobbingTrackLogo";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/b4ck0ff1ce");
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
        <JobbingTrackLogo
          className="mb-4 justify-center text-4xl font-bold text-gray-900 dark:text-white"
          imgClassName="h-14 w-14"
        />
        <p className="text-gray-600 dark:text-gray-400">
          Redirection en cours...
        </p>
      </div>
    </div>
  );
}

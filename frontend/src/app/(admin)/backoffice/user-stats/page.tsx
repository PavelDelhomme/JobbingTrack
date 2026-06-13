"use client";

import { Suspense, lazy } from "react";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { AdministrationDataPageShell } from "../AdministrationDataSubNav";

const UserStatsContent = lazy(() => import("./UserStatsContent"));

export default function UserStatsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <AdministrationDataPageShell
        title="Stats utilisateur"
        description="Analyser l'activité utilisateur et les indicateurs associés."
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdministrationDataPageShell>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <AdministrationDataPageShell
      title="Stats utilisateur"
      description="Analyser l'activité utilisateur et les indicateurs associés."
    >
      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          }
        >
          <UserStatsContent />
        </Suspense>
      </div>
    </AdministrationDataPageShell>
  );
}

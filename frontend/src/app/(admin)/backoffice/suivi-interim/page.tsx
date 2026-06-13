"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import SuiviInterimContent from "../datas/components/SuiviInterimContent";
import { AdministrationDataPageShell } from "../AdministrationDataSubNav";

export default function SuiviInterimPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <AdministrationDataPageShell
        title="Suivi intérim"
        description="Suivre les missions et informations liées à l'intérim."
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      </AdministrationDataPageShell>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdministrationDataPageShell
      title="Suivi intérim"
      description="Suivre les missions et informations liées à l'intérim."
    >
      <SuiviInterimContent />
    </AdministrationDataPageShell>
  );
}

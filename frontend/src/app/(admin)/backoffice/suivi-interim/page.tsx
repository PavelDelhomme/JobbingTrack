"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import SuiviInterimContent from "../datas/components/SuiviInterimContent";

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
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <SuiviInterimContent />
    </AdminLayout>
  );
}

"use client";

import { Suspense, lazy } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";

const BillingTab = lazy(() => import("../datas/components/BillingTab"));

export default function BillingPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("userId") ?? null;

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          }
        >
          <BillingTab userId={userId} />
        </Suspense>
      </div>
    </AdminLayout>
  );
}

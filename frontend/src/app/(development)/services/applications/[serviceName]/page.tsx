"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/features";

export default function ServiceDetailPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirection automatique vers la page principale des services
    router.push("/b4ck0ff1ce/services");
  }, [router]);

  return (
    <AdminLayout>
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Redirection vers la page des services...
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { MobileReleaseManagementPanel } from "@/components/mobile/MobileReleaseManagementPanel";

export default function MobileReleasesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Link
            href="/backoffice"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            Retour à la vue d&apos;ensemble
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mobile — releases OTA
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Build APK, publication canal dev, bêta-testeurs, promotion production.
          </p>
        </div>
        <MobileReleaseManagementPanel />
      </div>
    </AdminLayout>
  );
}

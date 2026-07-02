"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { MobileReleaseManagementPanel } from "@/components/mobile/MobileReleaseManagementPanel";

export default function AdministrationMobileReleasesPage() {
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
            Mobile — releases &amp; déploiement OTA
          </h1>
          <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Publiez une APK en canal <strong>dev</strong>, testez sur vos appareils, puis promouvez
            en <strong>production</strong> quand c&apos;est validé. Les apps mobile récupèrent la
            mise à jour au lancement.
          </p>
        </div>
        <MobileReleaseManagementPanel />
      </div>
    </AdminLayout>
  );
}

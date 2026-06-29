"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { MobileApplicationMonitoringPanel } from "@/components/analytics/MobileApplicationMonitoringPanel";

export default function AdministrationMobileLogsPage() {
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
            Mobile — erreurs &amp; retours
          </h1>
          <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Remontée depuis l&apos;application mobile : signalements manuels
            (Signaler un bug, diagnostic, capture) et erreurs automatiques tant
            que l&apos;app est connectée avec télémétrie activée. Fichiers bruts
            côté serveur : <code className="text-xs">backend/api-gateway/logs/crashes/</code>.
          </p>
        </div>
        <MobileApplicationMonitoringPanel liveRefreshMs={20000} showAdminHint />
      </div>
    </AdminLayout>
  );
}

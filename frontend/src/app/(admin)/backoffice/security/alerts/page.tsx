"use client";

import { AdminLayout } from "@/components/features";
import { SecurityAlertEmailDiagnostics } from "@/components/security/SecurityAlertEmailDiagnostics";
import { SecurityAlertEmailSettings } from "@/components/security/SecurityAlertEmailSettings";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

export default function SecurityAlertsPage() {
  useDocumentTitle("Alertes email sécurité");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Alertes email sécurité
          </h1>
        </div>

        <SecurityAlertEmailDiagnostics />

        <SecurityAlertEmailSettings />
      </div>
    </AdminLayout>
  );
}

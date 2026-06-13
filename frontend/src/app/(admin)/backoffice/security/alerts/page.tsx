"use client";

import { SecurityAlertEmailDiagnostics } from "@/components/security/SecurityAlertEmailDiagnostics";
import { SecurityAlertEmailSettings } from "@/components/security/SecurityAlertEmailSettings";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { SecurityPageShell } from "../SecuritySubNav";

export default function SecurityAlertsPage() {
  useDocumentTitle("Alertes email sécurité");

  return (
    <SecurityPageShell title="Alertes email sécurité">
      <div className="space-y-6">
        <SecurityAlertEmailDiagnostics />
        <SecurityAlertEmailSettings />
      </div>
    </SecurityPageShell>
  );
}

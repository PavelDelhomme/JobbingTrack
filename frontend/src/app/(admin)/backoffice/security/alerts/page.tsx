"use client";

import { SecurityAlertEmailDiagnostics } from "@/components/security/SecurityAlertEmailDiagnostics";
import { SecurityAlertEmailSettings } from "@/components/security/SecurityAlertEmailSettings";
import { SecurityPageShell } from "../SecuritySubNav";

export default function SecurityAlertsPage() {

  return (
    <SecurityPageShell title="Alertes email sécurité">
      <div className="space-y-6">
        <SecurityAlertEmailDiagnostics />
        <SecurityAlertEmailSettings />
      </div>
    </SecurityPageShell>
  );
}

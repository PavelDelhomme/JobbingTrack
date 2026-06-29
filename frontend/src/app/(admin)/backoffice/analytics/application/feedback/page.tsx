"use client";

import { AnalyticsPageShell } from "../ApplicationSubNav";
import { MobileApplicationMonitoringPanel } from "@/components/analytics/MobileApplicationMonitoringPanel";

export default function ApplicationFeedbackPage() {
  return (
    <AnalyticsPageShell
      title="Application — retours & signalements"
      description={
        <p>
          Retours explicites depuis Paramètres → Aide &amp; retours, plus erreurs
          applicatives auto-remontées (réseau, crash). Un envoi = une ligne
          (rapport mobile). Consultation aussi via{" "}
          <a
            href="/backoffice/administration/mobile-logs"
            className="font-medium underline"
          >
            Administration → Mobile — erreurs &amp; retours
          </a>
          .
        </p>
      }
      backHref="/backoffice/analytics"
      showApplicationSubNav
    >
      <MobileApplicationMonitoringPanel liveRefreshMs={20000} />
    </AnalyticsPageShell>
  );
}

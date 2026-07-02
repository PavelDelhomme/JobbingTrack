"use client";

import { AnalyticsPageShell } from "../ApplicationSubNav";
import { MobileApplicationMonitoringPanel } from "@/components/analytics/MobileApplicationMonitoringPanel";

export default function ApplicationFeedbackPage() {
  return (
    <AnalyticsPageShell
      title="Application — retours & signalements"
      backHref="/backoffice/analytics"
      showApplicationSubNav
    >
      <MobileApplicationMonitoringPanel liveRefreshMs={20000} />
    </AnalyticsPageShell>
  );
}

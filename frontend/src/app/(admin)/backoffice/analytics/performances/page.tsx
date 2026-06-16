import { redirect } from "next/navigation";

/** Ancienne URL : entrée canonique **Performances** → `/backoffice/performances`. */
export default function AnalyticsPerformancesLegacyRedirect() {
  redirect("/backoffice/performances");
}

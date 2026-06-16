import { redirect } from "next/navigation";

/**
 * Ancienne route **`/statistics`** (hors préfixe `backoffice/`).
 * Canon backoffice : **`/backoffice/statistics`**.
 */
export default function StatisticsLegacyRedirectPage() {
  redirect("/backoffice/statistics");
}

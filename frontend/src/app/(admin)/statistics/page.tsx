import { redirect } from "next/navigation";

/**
 * Ancienne route **`/statistics`** (hors préfixe `backoffice/`).
 * Canon backoffice : **`/b4ck0ff1ce/statistics`**.
 */
export default function StatisticsLegacyRedirectPage() {
  redirect("/b4ck0ff1ce/statistics");
}

import { redirect } from "next/navigation";

/**
 * Ancienne route française : tout le contenu vit sous **`/backoffice/statistics`** (sous-nav, app-data, sécurité, log-stats).
 * @see `frontend/src/app/(admin)/backoffice/statistics/page.tsx`
 */
export default function StatistiqueRedirectPage() {
  redirect("/backoffice/statistics");
}

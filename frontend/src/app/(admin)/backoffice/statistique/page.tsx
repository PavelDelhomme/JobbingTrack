import { redirect } from "next/navigation";

/**
 * Ancienne route française : tout le contenu vit sous **`/b4ck0ff1ce/statistics`** (sous-nav, app-data, sécurité, log-stats).
 * @see `frontend/src/app/(admin)/backoffice/statistics/page.tsx`
 */
export default function StatistiqueRedirectPage() {
  redirect("/b4ck0ff1ce/statistics");
}

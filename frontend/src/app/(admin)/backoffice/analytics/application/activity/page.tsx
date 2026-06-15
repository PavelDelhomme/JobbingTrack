"use client";

import { AnalyticsPageShell } from "../ApplicationSubNav";

/**
 * Emplacement réservé — traces d’activité, resets mot de passe, parcours utilisateur (voir **TODOS.md** lot A).
 */
export default function ApplicationActivityPage() {
  return (
    <AnalyticsPageShell
      title="Application — activité & traces"
      description={
        <p>
          Chantier à brancher sur les événements analytics, l&apos;auth (resets,
          sessions) et les journaux applicatifs. La navigation est en place pour
          itérer sans casser la page Performances live.
        </p>
      }
      backHref="/b4ck0ff1ce/analytics"
      showApplicationSubNav
      maxWidthClassName="mx-auto max-w-3xl"
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        Prochaine étape : définir les sources (API gateway, user-analytics,
        event-service) et les filtres de période partagés avec le reste du socle
        graphes.
      </div>
    </AnalyticsPageShell>
  );
}

"use client";

import { AnalyticsPageShell } from "../ApplicationSubNav";

/**
 * Emplacement réservé — retours utilisateurs, signalements, contenus d&apos;emails liés aux problèmes (voir **TODOS.md**).
 */
export default function ApplicationFeedbackPage() {
  return (
    <AnalyticsPageShell
      title="Application — retours & signalements"
      description={
        <p>
          Cible : regrouper les canaux de feedback (crash reports, mails
          support, formulaires) sans dupliquer la vue Email monitor existante —
          liens croisés à prévoir.
        </p>
      }
      backHref="/b4ck0ff1ce/analytics"
      showApplicationSubNav
      maxWidthClassName="mx-auto max-w-3xl"
    >
      <div className="rounded-lg border border-blue-200 bg-blue-50/90 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
        Implémentation ultérieure : agrégation par utilisateur / période et
        corrélation avec les métriques Performances live.
      </div>
    </AnalyticsPageShell>
  );
}

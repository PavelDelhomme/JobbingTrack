"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { ApplicationSubNav } from "../ApplicationSubNav";

/**
 * Emplacement réservé — traces d’activité, resets mot de passe, parcours utilisateur (voir **TODOS.md** lot A).
 */
export default function ApplicationActivityPage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-6">
        <Link
          href="/b4ck0ff1ce/analytics"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à la vue d&apos;ensemble
        </Link>
        <ApplicationSubNav />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Application — activité &amp; traces
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Chantier à brancher sur les événements analytics, l&apos;auth
            (resets, sessions) et les journaux applicatifs. La navigation est en
            place pour itérer sans casser la page Performances live.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          Prochaine étape : définir les sources (API gateway, user-analytics,
          event-service) et les filtres de période partagés avec le reste du
          socle graphes.
        </div>
      </div>
    </AdminLayout>
  );
}

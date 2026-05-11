'use client';

import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { ApplicationSubNav } from '../ApplicationSubNav';

/**
 * Emplacement réservé — retours utilisateurs, signalements, contenus d&apos;emails liés aux problèmes (voir **TODOS.md**).
 */
export default function ApplicationFeedbackPage() {
  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-3xl space-y-6">
        <Link
          href="/backoffice/analytics"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à la vue d&apos;ensemble
        </Link>
        <ApplicationSubNav />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Application — retours &amp; signalements</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Cible : regrouper les canaux de feedback (crash reports, mails support, formulaires) sans dupliquer la vue
            Email monitor existante — liens croisés à prévoir.
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/90 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
          Implémentation ultérieure : agrégation par utilisateur / période et corrélation avec les métriques Performances live.
        </div>
      </div>
    </AdminLayout>
  );
}

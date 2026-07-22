"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import suivi from "@/lib/pilotage/suiviActif.json";

type QueueItem = {
  id: string;
  status: string;
  label: string;
};

type FixItem = {
  id: string;
  label: string;
  status: string;
};

export default function PilotagePage() {
  const { user } = useAuth();
  const allowed =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const queue = (suivi.queue ?? []) as QueueItem[];
  const fixes = (suivi.openFixes ?? []) as FixItem[];
  const recent = suivi.recentDone ?? [];

  const active = useMemo(
    () => queue.find((q) => q.status === "active") ?? queue[0],
    [queue],
  );

  if (user && !allowed) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-red-600 dark:text-red-400">
            Accès réservé aux comptes ADMIN / SUPER_ADMIN.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="space-y-2">
          <Link
            href="/backoffice"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            Retour vue d&apos;ensemble
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Pilotage — suivi des tâches
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Source : <code className="text-xs">docs/pilotage/suivi-actif.json</code>{" "}
            · mis à jour {suivi.updatedAt} · APK {suivi.apk}
          </p>
        </div>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Vous êtes ici
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
            Phase {suivi.phase.id} · {suivi.phase.step} · {suivi.phase.subStep} ·{" "}
            {active?.id ?? suivi.phase.point}
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {active?.label ?? suivi.phase.title}
          </p>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Valider dans le chat / fichier{" "}
            <code className="text-xs">TODOS_A_VALIDER.md</code> puis enchaîner.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Process
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>TODOS.md</strong> — quoi faire
            </li>
            <li>
              <strong>TODOS_A_TESTER.md</strong> — tests & résultats
            </li>
            <li>
              OK → <strong>TODOS_DONE.md</strong> · KO → retour{" "}
              <strong>TODOS.md</strong>
            </li>
            <li>
              Porteur : phase active uniquement dans{" "}
              <strong>TODOS_A_VALIDER.md</strong>
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            File B2
          </h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {queue.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 text-sm ${
                  item.status === "active"
                    ? "bg-amber-50 dark:bg-amber-950/40"
                    : "bg-white dark:bg-gray-900"
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {item.id} — {item.label}
                </span>
                <span
                  className={
                    item.status === "active"
                      ? "rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                      : "text-xs text-gray-500"
                  }
                >
                  {item.status === "active" ? "▶ en cours" : "en attente"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Récemment terminé
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {recent.map((r) => (
              <li key={r.id}>
                <span className="font-mono text-xs">{r.id}</span> — {r.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Correctifs / diagnostics ouverts
          </h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {fixes.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between bg-white px-4 py-3 text-sm dark:bg-gray-900"
              >
                <span>
                  <span className="font-mono text-xs text-gray-500">{f.id}</span>{" "}
                  {f.label}
                </span>
                <span className="text-xs text-gray-500">{f.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Fichiers Git
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-gray-600 dark:text-gray-400">
            <li>{suivi.files.todos}</li>
            <li>{suivi.files.tester}</li>
            <li>{suivi.files.valider}</li>
            <li>{suivi.files.done}</li>
          </ul>
        </section>
      </div>
    </AdminLayout>
  );
}

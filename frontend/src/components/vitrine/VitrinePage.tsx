"use client";

import Link from "next/link";
import { JobbingTrackLogo } from "@/components/brand/JobbingTrackLogo";
import { backofficeLoginUrl } from "@/lib/site/hosts";

const FEATURES = [
  {
    title: "Candidatures",
    description:
      "Centralise tes offres, statuts et relances dans un seul tableau de bord.",
  },
  {
    title: "Entreprises & contacts",
    description:
      "Garde l’historique des échanges, des recruteurs et des entreprises ciblées.",
  },
  {
    title: "Entretiens & événements",
    description:
      "Planifie entretiens, appels et échéances sans perdre le fil de ta recherche.",
  },
  {
    title: "Mobile & notifications",
    description:
      "Application Android avec synchro et alertes pour ne rien laisser passer.",
  },
] as const;

export function VitrinePage() {
  const adminHref = backofficeLoginUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <JobbingTrackLogo
          className="text-xl font-semibold tracking-tight"
          imgClassName="h-11 w-11"
        />
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          Bêta privée
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-4">
        <section className="py-10 text-center sm:py-16">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Recherche d&apos;emploi
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Pilote ta recherche avec clarté, pas avec des tableurs éparpillés
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            JobbingTrack regroupe candidatures, entreprises, entretiens et suivi
            mobile pour les candidats exigeants — et un backoffice admin pour
            piloter la plateforme.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <span className="inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
              Ouverture publique prochainement
            </span>
            <a
              href="mailto:contact@jobbingtrack.com"
              className="inline-flex items-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
            >
              Nous contacter
            </a>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50"
            >
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-dashed border-slate-300/80 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
          <h2 className="text-xl font-semibold">Site vitrine en construction</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Cette page présente JobbingTrack. L&apos;application candidat et
            l&apos;inscription en ligne arriveront ici. En attendant, la
            plateforme tourne en préproduction pour les tests internes.
          </p>
        </section>
      </main>

      <footer className="relative mx-auto max-w-5xl px-6 pb-10 pt-4">
        <p className="text-center text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} JobbingTrack — Pavel Delhomme
        </p>
        {/* Accès admin discret — URL backoffice dédiée, pas de lien visible « Backoffice » */}
        <Link
          href={adminHref}
          prefetch={false}
          aria-label="Accès administration"
          title="Administration"
          className="absolute bottom-8 right-6 h-3 w-3 rounded-full opacity-[0.07] transition hover:opacity-40 focus:opacity-70 dark:opacity-[0.12] dark:hover:opacity-50"
        />
      </footer>
    </div>
  );
}

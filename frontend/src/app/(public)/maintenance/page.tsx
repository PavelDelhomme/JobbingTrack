import type { Metadata } from "next";
import Link from "next/link";
import { JobbingTrackLogo } from "@/components/brand/JobbingTrackLogo";

export const metadata: Metadata = {
  title: "Maintenance — JobbingTrack",
  description: "JobbingTrack est temporairement en maintenance.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <JobbingTrackLogo
          className="mb-10 text-2xl font-semibold tracking-tight text-white"
          imgClassName="h-12 w-12"
        />

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">
          Maintenance
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          On prépare la suite.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Le site JobbingTrack est temporairement indisponible pendant une
          opération de déploiement. La préprod et l&apos;API restent
          accessibles pour l&apos;équipe.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="mailto:contact@jobbingtrack.com"
            className="inline-flex items-center rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Nous écrire
          </a>
          <Link
            href="https://preprod.jobbingtrack.com"
            className="inline-flex items-center rounded-xl border border-slate-600/80 bg-slate-900/50 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-200"
          >
            Accéder à la préprod
          </Link>
        </div>

        <p className="mt-12 text-xs text-slate-500">
          Statut attendu : retour en ligne dès la fin du déploiement.
        </p>
      </main>
    </div>
  );
}

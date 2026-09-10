"use client";

import { EmailBackofficePageShell } from "../EmailBackofficeSubNav";
import {
  isMailhogUiAvailable,
  MAILHOG_DISABLED_REASON,
} from "@/lib/backoffice/mailhogAvailability";

const MAILHOG_URL =
  process.env.NEXT_PUBLIC_MAILHOG_UI_URL || "http://localhost:8025";

export default function MailHogBackofficePage() {
  const available = isMailhogUiAvailable();

  return (
    <EmailBackofficePageShell
      title="MailHog"
      description={
        available
          ? "Interface de capture locale des emails sortants pour contrôler le rendu et les envois de test."
          : MAILHOG_DISABLED_REASON
      }
      actions={
        available ? (
          <a
            href={MAILHOG_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ouvrir dans un onglet
          </a>
        ) : null
      }
    >
      {available ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
          <iframe
            title="MailHog"
            src={MAILHOG_URL}
            className="h-[75vh] w-full bg-white"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Interface MailHog désactivée ici</p>
          <p className="mt-2 opacity-90">
            En production / préprod publique, MailHog n’est pas exposé (il
            tourne en local sur le poste de dev, typiquement{" "}
            <code className="rounded bg-black/5 px-1">localhost:8025</code>
            ). Le lien reste dans le menu mais est grisé ; l’URL{" "}
            <code className="rounded bg-black/5 px-1">
              /backoffice/emails/mailhog
            </code>{" "}
            affiche ce message au lieu d’un iframe cassé.
          </p>
        </div>
      )}
    </EmailBackofficePageShell>
  );
}

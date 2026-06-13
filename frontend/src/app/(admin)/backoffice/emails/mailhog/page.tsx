"use client";

import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { EmailBackofficePageShell } from "../EmailBackofficeSubNav";

const MAILHOG_URL =
  process.env.NEXT_PUBLIC_MAILHOG_UI_URL || "http://localhost:8025";

export default function MailHogBackofficePage() {
  useDocumentTitle("MailHog");

  return (
    <EmailBackofficePageShell
      title="MailHog"
      description="Interface de capture locale des emails sortants pour contrôler le rendu et les envois de test."
      actions={
        <a
          href={MAILHOG_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ouvrir dans un onglet
        </a>
      }
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
        <iframe
          title="MailHog"
          src={MAILHOG_URL}
          className="h-[75vh] w-full bg-white"
        />
      </div>
    </EmailBackofficePageShell>
  );
}

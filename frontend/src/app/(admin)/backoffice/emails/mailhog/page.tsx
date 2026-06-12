"use client";

import { AdminLayout } from "@/components/features";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

const MAILHOG_URL =
  process.env.NEXT_PUBLIC_MAILHOG_UI_URL || "http://localhost:8025";

export default function MailHogBackofficePage() {
  useDocumentTitle("MailHog");

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            MailHog
          </h1>
          <a
            href={MAILHOG_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ouvrir dans un onglet
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
          <iframe
            title="MailHog"
            src={MAILHOG_URL}
            className="h-[75vh] w-full bg-white"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

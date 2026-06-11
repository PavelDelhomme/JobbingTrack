"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SecurityAlertEmailDiagnostics } from "@/components/security/SecurityAlertEmailDiagnostics";
import { SecurityAlertEmailSettings } from "@/components/security/SecurityAlertEmailSettings";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { SecuritySubNav } from "../SecuritySubNav";

export default function SecurityAlertsPage() {
  useDocumentTitle("Alertes email sécurité");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Alertes email sécurité
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Configuration des destinataires et test d&apos;envoi pour les
            alertes critiques JobbingTrack. Les modifications et le test
            exigent le mot de passe admin courant.
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100">
          <p className="font-semibold">Alertes email critiques OK</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Réception réelle validée par le porteur.</li>
            <li>MailHog et `EmailLog` restent disponibles pour contrôle local.</li>
            <li>
              Suivre les statuts dans Gestion des emails → Historique
              avec le filtre « Notification ».
            </li>
            <li>
              Le miroir SMTP réel est considéré OK quand le badge{" "}
              <strong>Miroir SMTP OK</strong> et le `messageId` sont visibles
              dans les derniers envois.
            </li>
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/b4ck0ff1ce/email-monitor?type=NOTIFICATION"
            className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100 dark:hover:bg-blue-950/50"
          >
            <p className="font-semibold">Historique emails JobbingTrack</p>
            <p className="mt-1">
              Voir les `EmailLog` d&apos;alertes sécurité, statuts `SENT` /
              `FAILED`, destinataires et erreurs fournisseur.
            </p>
          </Link>
          <a
            href="http://localhost:8025"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100 dark:hover:bg-green-950/50"
          >
            <p className="font-semibold">MailHog local</p>
            <p className="mt-1">
              Ouvrir la boîte locale pour confirmer le contenu reçu avant le
              miroir SMTP réel.
            </p>
          </a>
        </div>

        <SecurityAlertEmailDiagnostics />

        <SecurityAlertEmailSettings />
      </div>
    </AdminLayout>
  );
}

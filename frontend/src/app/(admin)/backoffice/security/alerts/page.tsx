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

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Validation attendue</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Vérifier que les destinataires sont des alias publics ou de test.</li>
            <li>Saisir le mot de passe admin actuel.</li>
            <li>Cliquer sur « Envoyer un email de test ».</li>
            <li>Contrôler la réception dans MailHog : http://localhost:8025.</li>
            <li>
              Diagnostiquer les statuts dans Gestion des emails → Historique
              avec le filtre « Notification ».
            </li>
            <li>
              Si le miroir SMTP réel est activé, vérifier le badge{" "}
              <strong>Miroir SMTP OK</strong> et le détail (`messageId`,
              `From`, `Reply-To`) dans la modal Email Monitor.
            </li>
            <li>
              Confirmer aussi la réception dans la boîte réelle
              (`admin@…`, `dev@…`) — MailHog seul ne suffit pas pour valider
              P1A.
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

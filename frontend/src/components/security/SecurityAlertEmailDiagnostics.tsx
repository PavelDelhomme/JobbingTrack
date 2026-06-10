"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { FRONTEND_URLS } from "@/config/ports.config";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const API_URL = FRONTEND_URLS.api;

type MirrorMeta = {
  sent?: boolean;
  queued?: boolean;
  messageId?: string;
  from?: string;
  replyTo?: string;
  error?: string;
};

type NotificationEmailLog = {
  id: string;
  to: string;
  from: string;
  subject: string;
  status: string;
  sentAt?: string;
  createdAt: string;
  metadata?: {
    mirror?: MirrorMeta;
    channel?: string;
  };
};

function formatWhen(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function mirrorLabel(mirror?: MirrorMeta) {
  if (!mirror) return { text: "Miroir N/A", variant: "outline" as const };
  if (mirror.sent === true) return { text: "Miroir OK", variant: "default" as const };
  if (mirror.sent === false) return { text: "Miroir KO", variant: "destructive" as const };
  if (mirror.queued === true) return { text: "Miroir…", variant: "secondary" as const };
  return { text: "Miroir N/A", variant: "outline" as const };
}

const ADMIN_PROBE = "admin@delhomme.ovh";

export function SecurityAlertEmailDiagnostics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<NotificationEmailLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<NotificationEmailLog[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Connectez-vous pour voir les derniers envois.");
        setLogs([]);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const baseParams = new URLSearchParams({
        type: "NOTIFICATION",
        limit: "8",
        page: "1",
      });
      const adminParams = new URLSearchParams({
        type: "NOTIFICATION",
        q: ADMIN_PROBE,
        limit: "5",
        page: "1",
      });

      const [response, adminResponse] = await Promise.all([
        fetch(`${API_URL}/api/v1/emails/logs?${baseParams}`, { headers }),
        fetch(`${API_URL}/api/v1/emails/logs?${adminParams}`, { headers }),
      ]);

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      setLogs(Array.isArray(data?.data) ? data.data : []);

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        setAdminLogs(Array.isArray(adminData?.data) ? adminData.data : []);
      } else {
        setAdminLogs([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Mail className="h-5 w-5" />
          Derniers envois alertes (diagnostic)
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>
          <Link
            href="/b4ck0ff1ce/email-monitor?type=NOTIFICATION"
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Email Monitor
          </Link>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Source `EmailLog` type <strong>NOTIFICATION</strong>. Le badge miroir
          confirme l&apos;acceptation SMTP OVH côté serveur ; la boîte réelle
          reste à valider manuellement (y compris dossier indésirables / spam).
        </p>

        {adminLogs[0] && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Dernier envoi vers {ADMIN_PROBE}</p>
            <p className="mt-1 break-words">{adminLogs[0].subject}</p>
            <p className="mt-1">
              {formatWhen(adminLogs[0].sentAt || adminLogs[0].createdAt)} —{" "}
              {mirrorLabel(adminLogs[0].metadata?.mirror).text}
            </p>
            {adminLogs[0].metadata?.mirror?.messageId && (
              <p className="mt-1 break-all text-xs opacity-90">
                {adminLogs[0].metadata.mirror.messageId}
              </p>
            )}
            <p className="mt-2 text-xs opacity-90">
              Si miroir OK mais rien en boîte : vérifier spam, délai fournisseur
              (5–15 min), puis répondre{" "}
              <strong>OK Alertes email critiques</strong> ou{" "}
              <strong>KO Alertes email critiques</strong> avec ce sujet.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucun email de notification récent.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const mirror = mirrorLabel(log.metadata?.mirror);
              const isAdmin = log.to.toLowerCase().includes(ADMIN_PROBE);
              return (
                <div
                  key={log.id}
                  className={`min-w-0 rounded-lg border p-3 ${
                    isAdmin
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex min-w-0 flex-wrap items-start gap-2">
                    <p className="min-w-0 flex-[1_1_100%] break-words font-medium text-gray-900 dark:text-gray-100 sm:flex-1">
                      {log.subject}
                    </p>
                    <Badge variant="outline">{log.status}</Badge>
                    <Badge variant={mirror.variant}>{mirror.text}</Badge>
                  </div>
                  <div className="mt-2 grid min-w-0 gap-1 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                    <p className="break-all">À : {log.to}</p>
                    <p className="break-all">De : {log.from}</p>
                    <p>Envoyé : {formatWhen(log.sentAt || log.createdAt)}</p>
                    {log.metadata?.mirror?.messageId && (
                      <p className="break-all sm:col-span-2">
                        Message ID miroir : {log.metadata.mirror.messageId}
                      </p>
                    )}
                    {log.metadata?.mirror?.error && (
                      <p className="break-words text-red-600 dark:text-red-400 sm:col-span-2">
                        Erreur miroir : {log.metadata.mirror.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

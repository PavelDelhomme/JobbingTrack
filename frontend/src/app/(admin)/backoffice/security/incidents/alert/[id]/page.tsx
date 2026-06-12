"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { SectionLoader, uiSurfaces, uiText } from "@/lib/ui";
import { formatLocalDateTime } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { threatHref } from "@/lib/security/incidents";
import {
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
} from "@/lib/security/securityLabels";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { ArrowLeft } from "lucide-react";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;

type SecurityAlert = {
  id: string;
  level: string;
  title: string;
  description: string;
  category: string;
  source: string;
  timestamp: string;
  isAcknowledged?: boolean;
  metadata?: Record<string, unknown>;
};

export default function SecurityAlertDetailPage() {
  const params = useParams();
  const alertId = String(params.id || "");
  const [alert, setAlert] = useState<SecurityAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(alert?.title ? `Alerte · ${alert.title}` : "Détail alerte");

  useEffect(() => {
    if (!alertId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/v1/security/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 200 },
        });
        const list = res.data?.data || [];
        const found = Array.isArray(list)
          ? list.find((a: SecurityAlert) => String(a.id) === alertId)
          : null;
        if (found) setAlert(found);
        else setError("Alerte introuvable");
      } catch (e: unknown) {
        setError(
          axios.isAxiosError(e)
            ? e.response?.data?.error || e.message
            : "Chargement impossible",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [alertId]);

  const threatId =
    alert?.metadata &&
    typeof alert.metadata === "object" &&
    alert.metadata.threatId
      ? String(alert.metadata.threatId)
      : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link
          href="/b4ck0ff1ce/security/incidents"
          className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux incidents
        </Link>

        {loading && (
          <SectionLoader
            message="Chargement de l'alerte…"
            className="min-h-[40vh]"
          />
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {alert && !loading && (
          <div className={`${uiSurfaces.panel} p-6 space-y-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-red-100 text-red-800 dark:bg-red-900/40 px-2 py-1 text-xs font-semibold uppercase">
                {formatSecuritySeverity(alert.level)}
              </span>
              <span className={`text-xs ${uiText.subtle}`}>
                {formatSecurityEventTypeLabel(alert.category)}
              </span>
              <span className={`text-xs ml-auto ${uiText.subtle}`}>
                {formatLocalDateTime(alert.timestamp)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {alert.title}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {alert.description}
            </p>
            <p className="text-sm">
              <span className={uiText.subtle}>Source :</span>{" "}
              <span className="font-mono">{alert.source}</span>
            </p>
            {threatId && (
              <Link
                href={threatHref(threatId)}
                className={`inline-block ${uiText.link}`}
              >
                Ouvrir la menace réseau liée →
              </Link>
            )}
            {alert.metadata && (
              <div>
                <h2 className="text-sm font-semibold mb-2">Métadonnées</h2>
                <pre className="text-xs bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 p-3 rounded overflow-x-auto border border-gray-200 dark:border-gray-700">
                  {JSON.stringify(alert.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

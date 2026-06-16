"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { formatLocalDateTime, formatLocalDate } from "@/lib/utils/date";
import { applicationService } from "@/lib/api";

interface Application {
  id: string;
  position: string;
  company?: {
    id: string;
    name: string;
    website?: string;
    industry?: string;
    location?: string;
  };
  status: string | { code: string; name?: string };
  type?: string;
  location?: string;
  salary?: string;
  description?: string;
  notes?: string;
  jobUrl?: string;
  source?: string;
  applicationDate?: string;
  createdAt: string;
  updatedAt: string;
}

const APPLICATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "CANDIDATE_PENDING", label: "En attente" },
  { value: "NO_RESPONSE", label: "Sans réponse" },
  { value: "INTERVIEW_PENDING", label: "Entretien en attente" },
  { value: "INTERVIEW_DONE", label: "Entretien passé" },
  { value: "OFFER_RECEIVED", label: "Offre reçue" },
  { value: "REJECTED", label: "Rejetée" },
  { value: "WITHDRAWN", label: "Retirée" },
  { value: "FIRST_INTERVIEW_PENDING", label: "1er entretien en attente" },
  { value: "OTHER_INTERVIEW_PENDING", label: "Autre entretien en attente" },
  { value: "ACCEPTED_AFTER_INTERVIEW", label: "Acceptée après entretien" },
  { value: "REJECTED_AFTER_INTERVIEW", label: "Rejetée après entretien" },
  { value: "REJECTED_WITHOUT_INTERVIEW", label: "Rejetée sans entretien" },
];

export default function BackofficeApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<
    {
      id: string;
      newStatus?: { code: string };
      previousStatus?: { code: string };
      comment?: string;
      changedAt: string;
    }[]
  >([]);
  const [suggestionReject, setSuggestionReject] = useState<{
    suggestConsiderReject: boolean;
    reason?: string;
    followUpCountWithoutResponse?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) fetchApplication();
  }, [isAuthenticated, params.id]);

  const fetchApplication = async () => {
    try {
      const id = params.id as string;
      const response = await applicationService.getById(id);
      setApplication(response.data.application);
      const hist = await applicationService.getStatusHistory(id);
      setStatusHistory(hist.data?.statusHistory ?? []);
      try {
        const sugg = await applicationService.getSuggestionReject(id);
        setSuggestionReject(sugg.data ?? null);
      } catch {
        setSuggestionReject(null);
      }
    } catch (error) {
      console.error("Erreur chargement candidature:", error);
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return;
    try {
      await applicationService.updateStatus(application.id, newStatus);
      fetchApplication();
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const handleMarkThankYouSent = async () => {
    if (!application) return;
    try {
      await applicationService.markThankYouSent(application.id);
      fetchApplication();
    } catch (error) {
      console.error("Erreur marquage email remerciement:", error);
      alert("Erreur lors du marquage");
    }
  };

  const currentStatus =
    typeof application?.status === "object" &&
    application?.status !== null &&
    "code" in application.status
      ? (application.status as { code: string }).code
      : application
        ? String(application.status)
        : "";

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-8">
          <p className="text-gray-500 dark:text-gray-400">
            Candidature non trouvée
          </p>
          <button
            onClick={() => router.push("/backoffice/companies")}
            className="mt-4 text-blue-600 dark:text-blue-400"
          >
            ← Retour
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center"
          >
            ← Retour
          </button>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {application.position}
              </h1>
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
                {application.company?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (confirm("Supprimer cette candidature ?")) {
                    await applicationService.delete(application.id);
                    router.push("/backoffice/companies");
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 3.2b Suggestion « Considérer comme rejetée ? » */}
            {suggestionReject?.suggestConsiderReject &&
              currentStatus !== "REJECTED" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    💡{" "}
                    {suggestionReject.reason ??
                      `${suggestionReject.followUpCountWithoutResponse ?? 0} relance(s) sans réponse`}{" "}
                    — Considérer comme rejetée ?
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("REJECTED")}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                  >
                    Oui, marquer rejetée
                  </button>
                </div>
              )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Statut de la candidature
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <StatusBadge status={currentStatus} large />
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500"
                >
                  {APPLICATION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* 3.2b Action « Email remerciement envoyé » → reset compteur relance */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={handleMarkThankYouSent}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  📧 Email remerciement envoyé
                </button>
              </div>
            </div>

            {statusHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Historique des statuts
                </h2>
                <ul className="space-y-2 text-sm">
                  {statusHistory.map((h) => (
                    <li
                      key={h.id}
                      className="flex flex-wrap items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-medium">
                        {h.previousStatus?.code ?? "—"}
                      </span>
                      <span>→</span>
                      <span className="font-medium">
                        {h.newStatus?.code ?? "—"}
                      </span>
                      {h.comment && (
                        <span className="text-gray-500">({h.comment})</span>
                      )}
                      <span className="text-gray-500">
                        {formatLocalDateTime(h.changedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {application.description && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Description du poste
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.description}
                </p>
              </div>
            )}
            {application.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📝 Notes
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.notes}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {application.company && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  🏢 Entreprise
                </h2>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {application.company.name}
                </p>
                {application.company.industry && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📊 {application.company.industry}
                  </p>
                )}
                {application.company.location && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📍 {application.company.location}
                  </p>
                )}
                {application.company.website && (
                  <a
                    href={application.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 mt-1 block"
                  >
                    🔗 Site web
                  </a>
                )}
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Détails
              </h2>
              <div className="space-y-2 text-sm">
                {application.location && (
                  <DetailRow
                    label="Localisation"
                    value={application.location}
                  />
                )}
                {application.salary && (
                  <DetailRow label="Salaire" value={application.salary} />
                )}
                {application.jobUrl && (
                  <div className="pt-2">
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      🔗 Voir l'offre
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📅 Dates
              </h2>
              <div className="space-y-2 text-sm">
                {application.applicationDate && (
                  <DetailRow
                    label="Date candidature"
                    value={formatLocalDate(application.applicationDate)}
                  />
                )}
                <DetailRow
                  label="Créée le"
                  value={formatLocalDate(application.createdAt)}
                />
                <DetailRow
                  label="Modifiée le"
                  value={formatLocalDate(application.updatedAt)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const statusColors: Record<string, string> = {
    CANDIDATE_PENDING:
      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
    NO_RESPONSE:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    INTERVIEW_PENDING:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    INTERVIEW_DONE:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
    OFFER_RECEIVED:
      "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    WITHDRAWN: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    FIRST_INTERVIEW_PENDING:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    OTHER_INTERVIEW_PENDING:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300",
    ACCEPTED_AFTER_INTERVIEW:
      "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    REJECTED_AFTER_INTERVIEW:
      "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    REJECTED_WITHOUT_INTERVIEW:
      "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };
  return (
    <span
      className={`px-3 inline-flex leading-5 font-semibold rounded-full ${statusColors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"} ${large ? "text-base py-2" : "text-xs"}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="text-gray-900 dark:text-gray-100 font-medium">
        {value}
      </span>
    </div>
  );
}

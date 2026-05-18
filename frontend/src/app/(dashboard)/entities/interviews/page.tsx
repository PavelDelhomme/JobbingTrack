"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { formatLocalDateTime } from "@/lib/utils/date";
import { interviewService } from "@/lib/api";

interface Interview {
  id: string;
  type: string;
  scheduledAt: string;
  status: string;
  location?: string;
  interviewer?: string;
  applicationId: string;
  createdAt: string;
}

export default function InterviewsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInterviews();
    }
  }, [isAuthenticated]);

  const fetchInterviews = async () => {
    try {
      const response = await interviewService.getAll();
      setInterviews(response.data.interviews || []);
    } catch (error) {
      console.error("Erreur chargement entretiens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet entretien ?")) {
      return;
    }

    try {
      await interviewService.delete(interviewId);
      fetchInterviews();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              📅 Gestion des Entretiens
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gérez tous les entretiens programmés
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center whitespace-nowrap"
          >
            ➕ Nouvel entretien
          </button>
        </div>

        {/* Interviews Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date et heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Intervieweur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Lieu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {interviews.map((interview) => (
                  <tr
                    key={interview.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <InterviewTypeBadge type={interview.type} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {formatLocalDateTime(interview.scheduledAt)}
                    </td>
                    <td className="px-6 py-4">
                      <InterviewStatusBadge status={interview.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {interview.interviewer || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {interview.location || "À distance"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => alert("Édition à implémenter")}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(interview.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white text-lg">
                      📅
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <InterviewTypeBadge type={interview.type} />
                        <InterviewStatusBadge status={interview.status} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatLocalDateTime(interview.scheduledAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-13 space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {interview.interviewer && <p>👤 {interview.interviewer}</p>}
                  <p>📍 {interview.location || "À distance"}</p>
                </div>

                <div className="ml-13 flex gap-2">
                  <button
                    onClick={() => alert("Édition à implémenter")}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteInterview(interview.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {interviews.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucun entretien trouvé
            </div>
          )}
        </div>

        {/* Create Interview Modal */}
        {showCreateModal && (
          <CreateInterviewModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchInterviews();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function InterviewTypeBadge({ type }: { type: string }) {
  const typeLabels: Record<string, string> = {
    PHONE_SCREENING: "📞 Téléphone",
    VIDEO: "🎥 Visio",
    ON_SITE: "🏢 Sur place",
    TECHNICAL: "💻 Technique",
    HR: "👔 RH",
    MANAGER: "👨‍💼 Manager",
    TEAM: "👥 Équipe",
    FINAL: "🎯 Final",
  };

  return (
    <span className="text-sm text-gray-900">{typeLabels[type] || type}</span>
  );
}

function InterviewStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    RESCHEDULED: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

function CreateInterviewModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: "PHONE_SCREENING",
    scheduledAt: "",
    location: "",
    interviewer: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await interviewService.create(formData);
      onSuccess();
    } catch (error) {
      console.error("Erreur création:", error);
      alert("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Nouvel entretien
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'entretien *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PHONE_SCREENING">Téléphone</option>
              <option value="VIDEO">Visioconférence</option>
              <option value="ON_SITE">Sur place</option>
              <option value="TECHNICAL">Technique</option>
              <option value="HR">RH</option>
              <option value="MANAGER">Manager</option>
              <option value="TEAM">Équipe</option>
              <option value="FINAL">Final</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date et heure *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledAt}
              onChange={(e) =>
                setFormData({ ...formData, scheduledAt: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu / Lien
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Adresse ou lien de visio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervieweur
            </label>
            <input
              type="text"
              value={formData.interviewer}
              onChange={(e) =>
                setFormData({ ...formData, interviewer: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

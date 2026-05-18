"use client";

import { useState, useEffect } from "react";
import { formatLocalDate } from "@/lib/utils/date";
import { callService } from "@/lib/api";

interface Call {
  id: string;
  type: string;
  scheduledAt?: string;
  completedAt?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function CallsTab() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = "data_calls_list";
      const { cacheManager } = await import("@/lib/cache/cacheManager");
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }); // Cache 30 secondes

      if (cached) {
        setCalls(Array.isArray(cached) ? (cached as Call[]) : []);
        setLoading(false);
        // Rafraîchir en arrière-plan
        callService
          .getAll({ limit: 100 })
          .then((response) => {
            const calls = response.data.calls || [];
            cacheManager.set(cacheKey, calls, { ttl: 30000 });
            setCalls(calls);
          })
          .catch(() => {}); // Ignorer les erreurs
        return;
      }

      // ✅ OPTIMISATION : Limiter à 100 appels par défaut
      const response = await callService.getAll({ limit: 100 });
      const calls = response.data.calls || [];
      setCalls(calls);

      // Mettre en cache
      await cacheManager.set(cacheKey, calls, { ttl: 30000 });
    } catch (error) {
      console.error("Erreur chargement appels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCall = async (callId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet appel ?")) {
      return;
    }

    try {
      await callService.delete(callId);
      fetchCalls();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📞 Gestion des Appels
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gérez tous vos appels professionnels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          ➕ Nouvel appel
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {calls.map((call) => (
                <tr
                  key={call.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {call.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {call.scheduledAt
                      ? formatLocalDate(call.scheduledAt)
                      : formatLocalDate(call.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => alert("Édition à implémenter")}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteCall(call.id)}
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

        {calls.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucun appel trouvé
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full border border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Nouvel appel
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Fonctionnalité en cours de développement
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

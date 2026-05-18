"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { formatLocalDateTime } from "@/lib/utils/date";
import { eventService } from "@/lib/api";
import { EventTypeBadge } from "@/components/badges";

interface Event {
  id: string;
  type: string;
  title: string;
  description?: string;
  occurredAt: string;
  applicationId?: string;
  companyId?: string;
  contactId?: string;
  metadata?: any;
  createdAt: string;
}

export default function EventsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  const fetchEvents = async () => {
    try {
      const response = await eventService.getAll();
      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Erreur chargement événements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents =
    filterType === "all"
      ? events
      : events.filter((event) => event.type === filterType);

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
              📅 Événements & Timeline
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Historique complet de toutes vos activités
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">Tous les événements</option>
            <option value="APPLICATION_CREATED">Candidature créée</option>
            <option value="APPLICATION_SENT">Candidature envoyée</option>
            <option value="INTERVIEW_SCHEDULED">Entretien planifié</option>
            <option value="INTERVIEW_COMPLETED">Entretien terminé</option>
            <option value="FOLLOWUP_SENT">Relance envoyée</option>
            <option value="CALL_MADE">Appel effectué</option>
          </select>
        </div>

        {/* Events Table */}
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
                    Titre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Entité liée
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <EventTypeBadge type={event.type} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {event.description || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {formatLocalDateTime(event.occurredAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {event.applicationId
                        ? "Candidature"
                        : event.companyId
                          ? "Entreprise"
                          : event.contactId
                            ? "Contact"
                            : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-green-500 dark:bg-green-600 flex items-center justify-center text-white text-lg">
                      📅
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <EventTypeBadge type={event.type} />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-13 space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <p>🕒 {formatLocalDateTime(event.occurredAt)}</p>
                  <p>
                    🔗{" "}
                    {event.applicationId
                      ? "Candidature"
                      : event.companyId
                        ? "Entreprise"
                        : event.contactId
                          ? "Contact"
                          : "Aucune"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              📅 Aucun événement trouvé
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

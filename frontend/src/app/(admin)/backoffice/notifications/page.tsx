"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import { AdminLayout } from "@/components/features";
import { FRONTEND_URLS } from "@/config/ports.config";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Bell, Search, Plus, Edit, Calendar, RefreshCw } from "@/lib/icons";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);

  // ✅ OPTIMISATION : useCallback pour éviter les re-créations de fonction
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = `notifications_list_${token?.substring(0, 10)}`;
      const { cacheManager } = await import("@/lib/cache/cacheManager");
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }); // Cache 30 secondes

      if (cached) {
        setNotifications(Array.isArray(cached) ? (cached as any[]) : []);
        setLoading(false);
        // Rafraîchir en arrière-plan
        axios
          .get(`${API_URL}/api/v1/notifications?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((response) => {
            if (response.data.success) {
              const notifications = response.data.notifications || [];
              cacheManager.set(cacheKey, notifications, { ttl: 30000 });
              setNotifications(notifications);
            }
          })
          .catch(() => {}); // Ignorer les erreurs
        return;
      }

      // ✅ OPTIMISATION : Limiter à 100 notifications par défaut
      const response = await axios.get(
        `${API_URL}/api/v1/notifications?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const notifications = response.data.notifications || [];
        setNotifications(notifications);
        // Mettre en cache
        await cacheManager.set(cacheKey, notifications, { ttl: 30000 });
      }
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ✅ OPTIMISATION : useMemo pour filteredNotifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) =>
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [notifications, searchTerm]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gestion des Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez les notifications système et utilisateur
            </p>
          </div>
          <button
            onClick={() => router.push("/b4ck0ff1ce/notifications/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nouvelle notification
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {notifications.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Lues</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {notifications.filter((n) => n.isRead).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Non lues</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {notifications.filter((n) => !n.isRead).length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une notification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadNotifications}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notification.message || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          notification.isRead
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        }`}
                      >
                        {notification.isRead ? "Lue" : "Non lue"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() =>
                          router.push(
                            `/b4ck0ff1ce/notifications/${notification.id}`,
                          )
                        }
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredNotifications.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      Aucune notification trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

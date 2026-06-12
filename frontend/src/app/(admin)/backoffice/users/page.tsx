"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import { AdminLayout } from "@/components/features";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { formatLocalDate } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import {
  USER_ROLE_FILTER_OPTIONS,
  USER_TEST_FILTER_OPTIONS,
  type UserTestFilter,
} from "@/lib/filters/userFilterOptions";
import { filterUsers, type UserListFilters } from "@/lib/filters/userFilters";
import type { FilterBadge } from "@/lib/filters/types";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  TestTube,
} from "lucide-react";
import axios from "axios";
import { usePagination } from "@/lib/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";

const API_URL = FRONTEND_URLS.api;

const DEFAULT_USER_FILTERS: UserListFilters = {
  query: "",
  role: "",
  testFilter: "all",
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isTestData?: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<UserListFilters>(DEFAULT_USER_FILTERS);
  const [cleaningTest, setCleaningTest] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      if (!token) {
        console.warn(
          "[USERS] ⚠️ Aucun token trouvé, impossible de charger les utilisateurs",
        );
        setUsers([]);
        setLoading(false);
        return;
      }

      // ✅ OPTIMISATION : Utiliser le cache
      const cacheKey = `users_list_${token.substring(0, 10)}_${applied.testFilter}`;
      const { cacheManager } = await import("@/lib/cache/cacheManager");
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }); // Cache 30 secondes

      if (cached) {
        setUsers(Array.isArray(cached) ? (cached as User[]) : []);
        setLoading(false);
        // Rafraîchir en arrière-plan
        loadUsersFresh(token, cacheKey, cacheManager, applied.testFilter).catch(
          () => {},
        ); // Ignorer les erreurs
        return;
      }

      await loadUsersFresh(token, cacheKey, cacheManager, applied.testFilter);
    } catch (error: any) {
      console.error("[USERS] ❌ Erreur chargement utilisateurs:", error);
      if (error.response) {
        console.error("[USERS] Status:", error.response.status);
        console.error("[USERS] Data:", error.response.data);

        // Si erreur 401/403, le token est invalide
        if (error.response.status === 401 || error.response.status === 403) {
          console.warn("[USERS] Token invalide ou expiré");
        }
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, applied.testFilter]);

  // ✅ OPTIMISATION : Fonction séparée pour le chargement frais
  const loadUsersFresh = async (
    token: string,
    cacheKey: string,
    cacheManager: any,
    testFilter: UserTestFilter = "all",
  ) => {
    const params: Record<string, string | number> = { limit: 100 };
    if (testFilter === "test") params.isTestData = "true";
    else if (testFilter === "nottest") params.isTestData = "false";

    let response;
    try {
      response = await axios.get(`${API_URL}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        validateStatus: (status) => status < 500, // Accepter 401, 403, 404 mais pas 500
      });
    } catch (error: any) {
      // Si erreur réseau, essayer le fallback
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        console.warn("[USERS] Tentative avec /api/v1/users...");
        try {
          response = await axios.get(`${API_URL}/api/v1/users`, {
            headers: { Authorization: `Bearer ${token}` },
            params,
            validateStatus: (status) => status < 500,
          });
        } catch (fallbackError: any) {
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    // Gérer les erreurs d'authentification
    if (response.status === 401 || response.status === 403) {
      console.warn(
        `[USERS] ⚠️ Erreur d'authentification (${response.status}):`,
        response.data.error,
      );
      // Si token invalide, essayer de recharger le token ou rediriger vers login
      if (response.status === 401) {
        console.warn(
          "[USERS] Token invalide ou expiré, redirection vers la page de connexion...",
        );
        // Optionnel: window.location.href = '/login'
      }
      setUsers([]);
      setLoading(false);
      return;
    }

    // Gérer les erreurs 404
    if (response.status === 404) {
      console.warn(
        "[USERS] ⚠️ Route non trouvée (404), vérification du service...",
      );
      setUsers([]);
      setLoading(false);
      return;
    }

    if (response.data.success) {
      const usersList = response.data.users || [];
      console.log(`[USERS] ✅ ${usersList.length} utilisateurs chargés`);
      setUsers(usersList);
      await cacheManager.set(cacheKey, usersList, { ttl: 30000 });
    } else {
      console.error("[USERS] ⚠️ Réponse API invalide:", response.data);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, loadUsers]);

  const filteredUsers = useMemo(
    () => filterUsers(users, applied),
    [users, applied],
  );

  // ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
  const pagination = usePagination({
    items: filteredUsers,
    itemsPerPage: 20,
    initialPage: 1,
  });
  const userSearchSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        users.flatMap((user) => [
          user.email,
          `${user.firstName} ${user.lastName}`.trim(),
        ]),
        80,
      ),
    [users],
  );
  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (applied.query.trim()) {
      badges.push({ key: "query", label: `Recherche : ${applied.query}` });
    }
    if (applied.role) {
      const roleLabel =
        USER_ROLE_FILTER_OPTIONS.find((option) => option.value === applied.role)
          ?.label || applied.role;
      badges.push({ key: "role", label: `Rôle : ${roleLabel}` });
    }
    if (applied.testFilter !== "all") {
      const testLabel =
        USER_TEST_FILTER_OPTIONS.find(
          (option) => option.value === applied.testFilter,
        )?.label || applied.testFilter;
      badges.push({ key: "testFilter", label: `Origine : ${testLabel}` });
    }
    return badges;
  }, [applied]);

  const handleApplyFilters = () => {
    pagination.goToPage(1);
    apply();
  };

  const handleResetFilters = () => {
    pagination.goToPage(1);
    reset(DEFAULT_USER_FILTERS);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await axios.put(
        `${API_URL}/api/v1/auth/users/${userId}/status`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      loadUsers();
    } catch (error) {
      console.error("Erreur mise à jour utilisateur:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?"))
      return;

    try {
      await axios.delete(`${API_URL}/api/v1/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadUsers();
    } catch (error) {
      console.error("Erreur suppression utilisateur:", error);
    }
  };

  const handleSendPasswordReset = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Envoyer un email de réinitialisation de mot de passe à ${userEmail} ?`,
      )
    )
      return;

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/users/${userId}/send-password-reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert(
          `✅ ${response.data.message || "Email de réinitialisation envoyé avec succès"}`,
        );
      } else {
        alert(
          `❌ Erreur: ${response.data.error || "Erreur lors de l'envoi de l'email"}`,
        );
      }
    } catch (error: any) {
      console.error("Erreur envoi email reset password:", error);
      alert(
        `❌ Erreur: ${error.response?.data?.error || error.message || "Erreur lors de l'envoi de l'email"}`,
      );
    }
  };

  const handleSendVerification = async (userId: string, userEmail: string) => {
    if (!confirm(`Envoyer un email de vérification à ${userEmail} ?`)) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/users/${userId}/send-verification`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert(
          `✅ ${response.data.message || "Email de vérification envoyé avec succès"}`,
        );
      } else {
        alert(
          `❌ Erreur: ${response.data.error || "Erreur lors de l'envoi de l'email"}`,
        );
      }
    } catch (error: any) {
      console.error("Erreur envoi email vérification:", error);
      alert(
        `❌ Erreur: ${error.response?.data?.error || error.message || "Erreur lors de l'envoi de l'email"}`,
      );
    }
  };

  const handleCleanTestUsers = async () => {
    const testUsers = users.filter(
      (u) =>
        u.id !== currentUser?.id &&
        (u.isTestData === true ||
          u.email?.toLowerCase().endsWith("@jobbingtrack.test")),
    );
    const count = testUsers.length;
    if (count === 0) {
      alert("Aucun utilisateur de test à supprimer.");
      return;
    }
    if (
      !confirm(
        `Supprimer définitivement ${count} utilisateur(s) de test (E2E, données de test) ? Cette action est irréversible.`,
      )
    )
      return;
    try {
      setCleaningTest(true);
      const response = await axios.post(
        `${API_URL}/api/v1/auth/users/clean-test-users`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data?.success) {
        const deleted = response.data.deletedCount ?? count;
        alert(`✅ ${deleted} utilisateur(s) de test supprimé(s).`);
        const { cacheManager } = await import("@/lib/cache/cacheManager");
        await cacheManager.delete(`users_list_${token?.substring(0, 10)}_all`);
        await cacheManager.delete(`users_list_${token?.substring(0, 10)}_test`);
        await cacheManager.delete(
          `users_list_${token?.substring(0, 10)}_nottest`,
        );
        loadUsers();
      } else {
        alert(`❌ ${response.data?.error || "Erreur lors du nettoyage"}`);
      }
    } catch (error: any) {
      console.error("Erreur nettoyage utilisateurs de test:", error);
      alert(
        `❌ ${error.response?.data?.error || error.message || "Erreur lors du nettoyage"}`,
      );
    } finally {
      setCleaningTest(false);
    }
  };

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
      <div className="space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez les comptes utilisateurs et leurs permissions
            </p>
          </div>
          <button
            onClick={() => router.push("/b4ck0ff1ce/users/new")}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouvel utilisateur
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {users.length}
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Actifs
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {users.filter((u) => u.isActive).length}
                </p>
              </div>
              <UserCheck className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Inactifs
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {users.filter((u) => !u.isActive).length}
                </p>
              </div>
              <UserX className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Admins
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {
                    users.filter(
                      (u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN",
                    ).length
                  }
                </p>
              </div>
              <Shield className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        <FilterBar
          hasDraftChanges={hasDraftChanges}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          badges={filterBadges}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,13rem)_minmax(0,16rem)_auto_auto]">
            <FacetAutocompleteField
              label="Recherche"
              value={draft.query}
              onChange={(value) => updateDraft("query", value)}
              suggestions={userSearchSuggestions}
              placeholder="Nom ou email…"
            />
            <FilterSelectField
              label="Rôle"
              value={draft.role}
              onChange={(value) => updateDraft("role", value)}
              options={[...USER_ROLE_FILTER_OPTIONS]}
              placeholder="Tous les rôles"
            />
            <FilterSelectField
              label="Origine"
              value={draft.testFilter}
              onChange={(value) =>
                updateDraft("testFilter", value as UserTestFilter)
              }
              options={[...USER_TEST_FILTER_OPTIONS]}
              allowEmpty={false}
            />
            <button
              onClick={handleCleanTestUsers}
              disabled={
                cleaningTest ||
                !users.some(
                  (u) =>
                    u.id !== currentUser?.id &&
                    (u.isTestData === true ||
                      u.email?.toLowerCase().endsWith("@jobbingtrack.test")),
                )
              }
              className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed lg:w-auto"
              title="Supprimer les utilisateurs créés par les tests E2E / données de test (isTestData ou @jobbingtrack.test)"
            >
              <TestTube className="h-5 w-5" />
              {cleaningTest
                ? "Nettoyage..."
                : "Nettoyer les utilisateurs de test"}
            </button>

            <button
              onClick={loadUsers}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors lg:w-auto"
            >
              <RefreshCw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </FilterBar>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Création
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagination.paginatedItems.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/b4ck0ff1ce/users/${user.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    title="Voir le détail de l'utilisateur"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold">
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.lastLogin && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Dernière connexion:{" "}
                              {formatLocalDate(user.lastLogin)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "SUPER_ADMIN"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : user.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : user.role === "USER"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {user.role === "SUPER_ADMIN"
                          ? "SUPER ADMIN"
                          : user.role}
                      </span>
                      {user.isTestData && (
                        <span
                          className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          title="Utilisateur créé par les tests (E2E, données de test)"
                        >
                          Test
                        </span>
                      )}
                      {!user.isTestData &&
                        user.email
                          ?.toLowerCase()
                          .endsWith("@jobbingtrack.test") && (
                          <span
                            className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                            title="Email de test (@jobbingtrack.test)"
                          >
                            Test
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          handleToggleActive(user.id, user.isActive)
                        }
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        } hover:opacity-75 transition-opacity cursor-pointer`}
                      >
                        {user.isActive ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatLocalDate(user.createdAt)}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(`/b4ck0ff1ce/users/${user.id}`)
                          }
                          className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleSendPasswordReset(user.id, user.email)
                          }
                          className="p-2 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="Envoyer email de réinitialisation de mot de passe"
                        >
                          <KeyRound className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleSendVerification(user.id, user.email)
                          }
                          className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Envoyer email de vérification"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pagination.paginatedItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      <p>Aucun utilisateur trouvé</p>
                      <p className="text-sm mt-1">
                        Après un{" "}
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                          make up-full
                        </code>
                        , la base peut être vide : créez un compte admin si
                        besoin.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ OPTIMISATION : Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={20}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                onPageChange={pagination.goToPage}
                onNext={pagination.nextPage}
                onPrevious={pagination.previousPage}
                canGoNext={pagination.canGoNext}
                canGoPrevious={pagination.canGoPrevious}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

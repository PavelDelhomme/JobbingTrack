"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

const ROLES = {
  USER: {
    label: "Utilisateur",
    color: "gray",
    icon: "👤",
    description: "Accès standard sans backoffice",
  },
  ADMIN: {
    label: "Administrateur",
    color: "blue",
    icon: "👨‍💼",
    description: "Accès complet au backoffice",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "purple",
    icon: "👑",
    description: "Tous les droits",
  },
};

export default function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailTab, setDetailTab] = useState<
    "info" | "logs" | "reports" | "actions"
  >("info");

  // Email logs
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // États pour l'édition des détails utilisateur
  const [editMode, setEditMode] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "USER" as "USER" | "ADMIN" | "SUPER_ADMIN",
    isActive: true,
  });
  const [savingUser, setSavingUser] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "USER" as "USER" | "ADMIN" | "SUPER_ADMIN",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"USER" | "ADMIN">("USER");

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/v1/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok)
        throw new Error("Erreur lors du chargement des utilisateurs");

      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEmailLogs = async (userId: string) => {
    setLoadingLogs(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/notifications/emails/logs?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.emailLogs || []);
      }
    } catch (err) {
      console.error("Erreur chargement logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const createUser = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      alert("Les mots de passe ne correspondent pas");
      return;
    }

    if (createForm.password.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/auth/register",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createForm.email,
            password: createForm.password,
            firstName: createForm.firstName,
            lastName: createForm.lastName,
            phone: createForm.phone || undefined,
          }),
        },
      );

      if (!response.ok) throw new Error("Erreur lors de la création");

      const data = await response.json();

      // Mettre à jour le rôle si différent de USER
      if (createForm.role !== "USER") {
        await updateUserRole(data.user.id, createForm.role);
      }

      await fetchUsers();
      setShowCreateModal(false);
      setCreateForm({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "USER",
      });
      alert("✅ Utilisateur créé avec succès !");
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/auth/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour du rôle");

      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/auth/users/${userId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        },
      );

      if (!response.ok)
        throw new Error("Erreur lors de la modification du statut");

      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",
      )
    )
      return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/auth/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      await fetchUsers();
      if (selectedUser?.id === userId) {
        setShowDetailModal(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      if (response.ok) {
        alert("✅ Email de réinitialisation envoyé !");
      } else {
        throw new Error("Erreur");
      }
    } catch (err) {
      alert("❌ Erreur lors de l'envoi");
    }
  };

  const impersonateUser = (user: User) => {
    // Rediriger vers l'émulateur mobile avec cet utilisateur
    router.push(`/backoffice/mobile-emulator?impersonate=${user.id}`);
    setShowDetailModal(false);
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    try {
      // Mettre à jour les informations de base
      const response = await fetch(
        `http://localhost:3000/api/v1/auth/users/${selectedUser.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: editUserForm.firstName,
            lastName: editUserForm.lastName,
            email: editUserForm.email,
            phone: editUserForm.phone || undefined,
          }),
        },
      );

      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour du profil");

      // Mettre à jour le rôle si nécessaire
      if (editUserForm.role !== selectedUser.role) {
        await updateUserRole(selectedUser.id, editUserForm.role);
      }

      // Mettre à jour le statut si nécessaire
      if (editUserForm.isActive !== selectedUser.isActive) {
        await toggleUserStatus(selectedUser.id, editUserForm.isActive);
      }

      // Recharger les utilisateurs
      await fetchUsers();

      // Fermer le mode édition
      setEditMode(false);
      setSelectedUser(null);
      setShowDetailModal(false);

      alert("✅ Utilisateur mis à jour avec succès !");
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSavingUser(false);
    }
  };

  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setDetailTab("info");
    setEditMode(false);
    setEditUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      isActive: user.isActive,
    });
    setShowDetailModal(true);
    if (detailTab === "logs") {
      fetchUserEmailLogs(user.id);
    }
  };

  useEffect(() => {
    if (selectedUser && detailTab === "logs") {
      fetchUserEmailLogs(selectedUser.id);
    }
  }, [detailTab]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Date inconnue";

    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return "Date invalide";
      }
      return parsedDate.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Date inconnue";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              👥 Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez les comptes, rôles et permissions
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ➕ Créer un utilisateur
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📧 Inviter un utilisateur
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Total
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {users.length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Actifs
            </div>
            <div className="text-3xl font-bold text-green-600">
              {users.filter((u) => u.isActive).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Administrateurs
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {
                users.filter(
                  (u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN",
                ).length
              }
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Utilisateurs
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {users.filter((u) => u.role === "USER").length}
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-400">
              Chargement...
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inscrit le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => {
                  const roleInfo = ROLES[user.role];
                  const isCurrentUser = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600">
                                  (Vous)
                                </span>
                              )}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateUserRole(user.id, e.target.value)
                          }
                          disabled={isCurrentUser}
                          className={`text-xs font-medium rounded-full px-3 py-1 bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/30 text-${roleInfo.color}-800 dark:text-${roleInfo.color}-300 disabled:opacity-50 cursor-pointer`}
                        >
                          {Object.entries(ROLES).map(([key, value]) => (
                            <option key={key} value={key}>
                              {value.icon} {value.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            !isCurrentUser &&
                            toggleUserStatus(user.id, !user.isActive)
                          }
                          disabled={isCurrentUser}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80`}
                        >
                          {user.isActive ? "✓ Actif" : "✕ Inactif"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openUserDetail(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          title="Voir détails"
                        >
                          👁️
                        </button>
                        {!isCurrentUser && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Créer un utilisateur */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              ➕ Créer un utilisateur
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmer *
                  </label>
                  <input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rôle
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(ROLES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.icon} {value.label} - {value.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Créer l'utilisateur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inviter un utilisateur */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              📧 Inviter un utilisateur
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="redacted@example.invalid"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rôle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "USER" | "ADMIN")
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="USER">👤 Utilisateur</option>
                  <option value="ADMIN">👨‍💼 Administrateur</option>
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Un email d'invitation sera envoyé avec un lien pour créer
                  le compte.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  alert(
                    "Fonctionnalité d'invitation à implémenter côté backend",
                  )
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Utilisateur */}
      {showDetailModal && selectedUser && editMode !== undefined && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                    {editMode
                      ? editUserForm.firstName[0] + editUserForm.lastName[0]
                      : selectedUser.firstName[0] + selectedUser.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {editMode
                        ? `${editUserForm.firstName} ${editUserForm.lastName}`
                        : `${selectedUser.firstName} ${selectedUser.lastName}`}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {editMode ? editUserForm.email : selectedUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveUserChanges}
                        disabled={savingUser}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {savingUser ? "Sauvegarde..." : "💾 Sauvegarder"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      ✏️ Modifier
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Onglets */}
              <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700">
                {["info", "logs", "reports", "actions"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab as any)}
                    className={`px-4 py-2 font-medium transition-colors ${
                      detailTab === tab
                        ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab === "info" && "ℹ️ Informations"}
                    {tab === "logs" && "📋 Logs Emails"}
                    {tab === "reports" && "📊 Rapports"}
                    {tab === "actions" && "⚙️ Actions"}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Prénom
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editUserForm.firstName}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedUser.firstName}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Nom
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editUserForm.lastName}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedUser.lastName}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Email
                      </label>
                      {editMode ? (
                        <input
                          type="email"
                          value={editUserForm.email}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              email: e.target.value,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedUser.email}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Téléphone
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editUserForm.phone}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedUser.phone || "-"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Rôle
                      </label>
                      {editMode ? (
                        <select
                          value={editUserForm.role}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              role: e.target.value as any,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {Object.entries(ROLES).map(([key, value]) => (
                            <option key={key} value={key}>
                              {value.icon} {value.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {ROLES[selectedUser.role].icon}{" "}
                          {ROLES[selectedUser.role].label}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Statut
                      </label>
                      {editMode ? (
                        <div className="mt-1">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editUserForm.isActive}
                              onChange={(e) =>
                                setEditUserForm({
                                  ...editUserForm,
                                  isActive: e.target.checked,
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {editUserForm.isActive ? "✓ Actif" : "✕ Inactif"}
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedUser.isActive ? "✓ Actif" : "✕ Inactif"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Créé le
                      </label>
                      <div className="text-gray-900 dark:text-gray-100">
                        {formatDate(selectedUser.createdAt)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Modifié le
                      </label>
                      <div className="text-gray-900 dark:text-gray-100">
                        {formatDate(selectedUser.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      ID
                    </label>
                    <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                      {selectedUser.id}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "logs" && (
                <div className="space-y-2">
                  {loadingLogs ? (
                    <div className="text-center py-8">Chargement...</div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucun email envoyé
                    </div>
                  ) : (
                    emailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="font-medium">{log.subject}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          À: {log.to} • {log.status} •{" "}
                          {formatDate(log.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "reports" && (
                <div className="text-center py-8 text-gray-500">
                  Rapports et données utilisateur à venir
                </div>
              )}

              {detailTab === "actions" && (
                <div className="space-y-3">
                  <button
                    onClick={() => sendPasswordReset(selectedUser.email)}
                    className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-left"
                  >
                    🔑 Envoyer un lien de réinitialisation de mot de passe
                  </button>
                  <button
                    onClick={() => impersonateUser(selectedUser)}
                    className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-left"
                  >
                    👤 Impersonate (se connecter en tant que cet utilisateur)
                  </button>
                  <button
                    onClick={() =>
                      toggleUserStatus(selectedUser.id, !selectedUser.isActive)
                    }
                    className="w-full px-4 py-3 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-left"
                  >
                    {selectedUser.isActive
                      ? "🔒 Désactiver le compte"
                      : "✅ Activer le compte"}
                  </button>
                  <button
                    onClick={() => deleteUser(selectedUser.id)}
                    className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-left"
                  >
                    🗑️ Supprimer définitivement le compte
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

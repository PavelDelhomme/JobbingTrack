'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { 
  ArrowLeft, Mail, Phone, Calendar, UserCheck, UserX, 
  Shield, Edit, Save, X, Trash2, Key, Lock, Unlock,
  AlertCircle, CheckCircle, Clock, Send
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

function toUserRole(role: string | undefined): UserRole {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'USER') return role;
  return 'USER';
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  lastLoginAt?: string;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, user: currentUser } = useAuth();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [creating, setCreating] = useState(false);
  const isCreateMode = userId === 'new';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    isActive: true,
  });

  useEffect(() => {
    if (token && userId && !isCreateMode) {
      loadUser();
    } else if (isCreateMode) {
      setLoading(false);
      setUser(null);
    }
  }, [token, userId, isCreateMode]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Essayer d'abord /api/v1/auth/users/:id, puis /api/v1/users/:id en fallback
      let response;
      try {
        response = await axios.get(`${API_URL}/api/v1/auth/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          response = await axios.get(`${API_URL}/api/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (status) => status < 500
          });
        } else {
          throw error;
        }
      }

      if (response.status === 404) {
        setError('Utilisateur non trouvé');
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setError('Accès non autorisé');
        return;
      }

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          password: '',
          role: toUserRole(userData.role),
          isActive: userData.isActive !== undefined ? userData.isActive : true,
        });
      } else {
        setError('Erreur lors du chargement de l\'utilisateur');
      }
    } catch (error: any) {
      console.error('Erreur chargement utilisateur:', error);
      setError(error.response?.data?.error || 'Erreur lors du chargement de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      // Mettre à jour les informations de base (firstName, lastName, email, phone)
      const basicUpdate = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      };
      
      const response = await axios.put(
        `${API_URL}/api/v1/auth/users/${userId}`,
        basicUpdate,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Si le rôle a changé, le mettre à jour séparément
        if (formData.role !== user.role) {
          await axios.put(
            `${API_URL}/api/v1/auth/users/${userId}/role`,
            { role: formData.role },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        // Si le statut a changé, le mettre à jour séparément
        if (formData.isActive !== user.isActive) {
          await axios.put(
            `${API_URL}/api/v1/auth/users/${userId}/status`,
            { isActive: formData.isActive },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        // Recharger l'utilisateur pour avoir les données à jour
        await loadUser();
        setEditMode(false);
        alert('Utilisateur mis à jour avec succès');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur mise à jour utilisateur:', error);
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email?.trim() || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.password?.trim()) {
      alert('Veuillez remplir tous les champs obligatoires (prénom, nom, email, mot de passe)');
      return;
    }
    if (formData.password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    try {
      setCreating(true);
      const response = await axios.post(
        `${API_URL}/api/v1/auth/register`,
        {
          email: formData.email.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          password: formData.password,
          role: formData.role,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.user?.id) {
        router.push(`/b4ck0ff1ce/users/${response.data.user.id}`);
      } else {
        router.push('/b4ck0ff1ce/users');
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      alert(axErr.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: toUserRole(user.role),
        isActive: user.isActive !== undefined ? user.isActive : true,
      });
    }
    setEditMode(false);
  };

  const handleToggleActive = async () => {
    if (!user) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir ${user.isActive ? 'désactiver' : 'activer'} cet utilisateur ?`)) {
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/v1/auth/users/${userId}/status`,
        { isActive: !user.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await loadUser(); // Recharger pour avoir les données à jour
        alert(`Utilisateur ${!user.isActive ? 'activé' : 'désactivé'} avec succès`);
      }
    } catch (error: any) {
      console.error('Erreur changement statut:', error);
      alert(error.response?.data?.error || 'Erreur lors du changement de statut');
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    if (currentUser?.id === userId) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${user.firstName} ${user.lastName} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      setDeleting(true);
      await axios.delete(`${API_URL}/api/v1/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Utilisateur supprimé avec succès');
      router.push('/b4ck0ff1ce/users');
    } catch (error: any) {
      console.error('Erreur suppression utilisateur:', error);
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    
    if (!confirm(`Envoyer un email de réinitialisation de mot de passe à ${user.email} ?`)) {
      return;
    }

    try {
      setResettingPassword(true);
      const response = await axios.post(
        `${API_URL}/api/v1/auth/forgot-password`,
        { email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Email de réinitialisation envoyé avec succès');
      } else {
        alert(response.data?.error || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (error: any) {
      console.error('Erreur réinitialisation mot de passe:', error);
      alert((error as any).response?.data?.error || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    
    if (!confirm(`Renvoyer l\'email de vérification de compte à ${user.email} ?`)) {
      return;
    }

    try {
      setResendingVerification(true);
      const response = await axios.post(
        `${API_URL}/api/v1/auth/users/${userId}/resend-verification`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Email de vérification envoyé avec succès');
        await loadUser();
      } else {
        alert(response.data?.error || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (error: any) {
      console.error('Erreur envoi vérification:', error);
      alert((error as any).response?.data?.error || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleChangeRole = async (newRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN') => {
    if (!user) return;
    
    if (!confirm(`Changer le rôle de ${user.firstName} ${user.lastName} en ${newRole} ?`)) {
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/v1/auth/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await loadUser(); // Recharger pour avoir les données à jour
        alert('Rôle modifié avec succès');
      }
    } catch (error: any) {
      console.error('Erreur changement rôle:', error);
      alert(error.response?.data?.error || 'Erreur lors du changement de rôle');
    }
  };

  if (loading && !isCreateMode) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !user && !isCreateMode) {
    return (
      <AdminLayout>
        <div className="p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user && !isCreateMode) {
    return null;
  }

  if (isCreateMode) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/b4ck0ff1ce/users')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 max-w-xl">
            <h1 className="text-2xl font-bold mb-6">Nouvel utilisateur</h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prénom *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe * (min. 6 caractères)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' | 'SUPER_ADMIN' })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="SUPER_ADMIN">Super Administrateur</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateUser}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
                <button
                  onClick={() => router.push('/b4ck0ff1ce/users')}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </button>
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-5 w-5" />
                  Modifier
                </button>
                {currentUser?.id !== userId && (
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Informations utilisateur */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Informations Personnelles
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prénom
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{user.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{user.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                {editMode ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
                )}
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                    <CheckCircle className="h-3 w-3" />
                    Email vérifié
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{user.phone || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Statut et permissions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Statut et Permissions
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rôle
                </label>
                {editMode ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' | 'SUPER_ADMIN' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="SUPER_ADMIN">Super Administrateur</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {user.role}
                    </span>
                    {!editMode && currentUser?.id !== userId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleChangeRole('USER')}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          USER
                        </button>
                        <button
                          onClick={() => handleChangeRole('ADMIN')}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          ADMIN
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  {user.isActive ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4 text-red-600" />}
                  Statut
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    user.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  {!editMode && (
                    <button
                      onClick={handleToggleActive}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                        user.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                      }`}
                    >
                      {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      {user.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de création
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {(user.lastLogin || user.lastLoginAt) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Dernière connexion
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(user.lastLogin || user.lastLoginAt || '').toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Abonnement & facturation (pour cet utilisateur) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Abonnement & facturation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Gérer l&apos;abonnement et la facturation pour cet utilisateur.
          </p>
          <Link
            href={`/b4ck0ff1ce/billing?userId=${user.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Voir / gérer l&apos;abonnement
          </Link>
        </div>

        {/* Actions rapides */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Actions Rapides
          </h2>
          <div className="flex flex-wrap gap-3">
            {!user.emailVerified && (
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                {resendingVerification ? 'Envoi...' : 'Renvoyer email de vérification'}
              </button>
            )}
            <button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Key className="h-5 w-5" />
              {resettingPassword ? 'Envoi...' : 'Réinitialiser le mot de passe'}
            </button>
            
            {currentUser?.id !== userId && (
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
                {deleting ? 'Suppression...' : 'Supprimer l\'utilisateur'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { Clock, Search, Plus, Edit, Trash2, Calendar, RefreshCw, X, AlertCircle, Mail } from 'lucide-react';
import { followUpService, applicationService } from '@/lib/api';

interface FollowUp {
  id: string;
  subject: string;
  sentAt?: string;
  type?: string;
  method?: string;
  status?: string;
  applicationId?: string;
  applicationTitle?: string;
  companyName?: string;
  createdAt: string;
}

interface Application {
  id: string;
  title: string;
  companyName: string;
  companyId: string;
}

export default function FollowupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);
  const applicationIdFromUrl = searchParams.get('applicationId');

  useEffect(() => {
    if (token) {
      loadFollowups();
      if (applicationIdFromUrl) {
        setShowCreateModal(true);
      }
    }
  }, [token, applicationIdFromUrl]);

  const loadFollowups = async () => {
    try {
      setLoading(true);
      const response = await followUpService.getAll();
      setFollowups(response.data.followups || response.data || []);
    } catch (error: any) {
      console.error('Erreur chargement relances:', error);
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette relance ?')) return;
    
    try {
      await followUpService.delete(id);
      loadFollowups();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredFollowups = followups.filter(followup =>
    followup.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followup.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followup.applicationTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Gestion des Relances
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos relances (création depuis une candidature uniquement)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouvelle relance
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Règle importante
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Une relance doit être créée depuis une candidature. L'entreprise sera automatiquement récupérée de la candidature.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Relances</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{followups.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une relance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadFollowups}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Relance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Candidature</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Méthode</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFollowups.map((followup) => (
                  <tr key={followup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{followup.subject || 'Relance&apos;}</div>
                      {followup.companyName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{followup.companyName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {followup.applicationTitle && (
                        <div className="text-sm text-gray-900 dark:text-gray-100">{followup.applicationTitle}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {followup.sentAt 
                          ? new Date(followup.sentAt).toLocaleDateString()
                          : new Date(followup.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {followup.method || 'Email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedFollowup(followup);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 hover:dark:text-blue-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(followup.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 hover:dark:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFollowups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {followups.length === 0 ? 'Aucune relance trouvée&apos; : 'Aucun résultat pour votre recherche'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <FollowupFormModal
          applicationId={applicationIdFromUrl || undefined}
          onClose={() => {
            setShowCreateModal(false);
            if (applicationIdFromUrl) {
              router.push('/backoffice/followups');
            }
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            if (applicationIdFromUrl) {
              router.push('/backoffice/followups');
            }
            loadFollowups();
          }}
        />
      )}

      {showEditModal && selectedFollowup && (
        <FollowupFormModal
          followup={selectedFollowup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFollowup(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedFollowup(null);
            loadFollowups();
          }}
        />
      )}
    </AdminLayout>
  );
}

function FollowupFormModal({ 
  followup, 
  applicationId,
  onClose, 
  onSuccess 
}: { 
  followup?: FollowUp;
  applicationId?: string | null;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    subject: followup?.subject || '',
    sentAt: followup?.sentAt ? new Date(followup.sentAt).toISOString().slice(0, 16) : '',
    type: followup?.type || 'followup',
    method: followup?.method || 'email',
    notes: '',
    applicationId: followup?.applicationId || applicationId || '',
  });
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    loadApplications();
    if (applicationId || followup?.applicationId) {
      loadApplicationDetails(applicationId || followup?.applicationId || '');
    }
  }, []);

  const loadApplications = async () => {
    try {
      setLoadingApplications(true);
      const response = await applicationService.getAll();
      const apps = response.data.applications || response.data || [];
      setApplications(apps);
      
      if (applicationId || followup?.applicationId) {
        const app = apps.find((a: Application) => a.id === (applicationId || followup?.applicationId));
        if (app) {
          setSelectedApplication(app);
          setFormData(prev => ({ ...prev, applicationId: app.id }));
        }
      }
    } catch (error) {
      console.error('Erreur chargement candidatures:', error);
      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadApplicationDetails = async (appId: string) => {
    try {
      const response = await applicationService.getById(appId);
      const app = response.data.application || response.data;
      setSelectedApplication(app);
    } catch (error) {
      console.error('Erreur chargement candidature:', error);
    }
  };

  const handleApplicationSelect = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) {
      setSelectedApplication(app);
      setFormData(prev => ({ ...prev, applicationId: app.id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.applicationId) {
      alert('Vous devez sélectionner une candidature');
      return;
    }

    if (!formData.subject) {
      alert('Le sujet est obligatoire');
      return;
    }

    setLoading(true);

    try {
      const followupData = {
        subject: formData.subject,
        type: formData.type,
        method: formData.method,
        notes: formData.notes || undefined,
        applicationId: formData.applicationId,
        sentAt: formData.sentAt ? new Date(formData.sentAt).toISOString() : undefined,
      };

      if (followup) {
        await followUpService.update(followup.id, followupData);
      } else {
        await followUpService.create(followupData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur création/modification relance:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création/modification de la relance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {followup ? 'Modifier la relance&apos; : 'Nouvelle relance'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Candidature * (L'entreprise sera récupérée automatiquement)
            </label>
            {selectedApplication ? (
              <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedApplication.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedApplication.companyName}
                </p>
                {!followup && !applicationId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApplication(null);
                      setFormData(prev => ({ ...prev, applicationId: '' }));
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 mt-2 hover:underline"
                  >
                    Changer de candidature
                  </button>
                )}
              </div>
            ) : (
              <select
                required
                value={formData.applicationId}
                onChange={(e) => handleApplicationSelect(e.target.value)}
                disabled={!!applicationId || !!followup}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Sélectionner une candidature...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.title} - {app.companyName}
                  </option>
                ))}
              </select>
            )}
            {loadingApplications && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chargement des candidatures...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sujet *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Relance suite à candidature..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="followup">Relance</option>
                <option value="reminder">Rappel</option>
                <option value="thankyou">Remerciement</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Méthode
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="email">Email</option>
                <option value="phone">Téléphone</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date d'envoi
            </label>
            <input
              type="datetime-local"
              value={formData.sentAt}
              onChange={(e) => setFormData({ ...formData, sentAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enregistrement...&apos; : followup ? 'Modifier' : &apos;Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

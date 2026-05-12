'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { Calendar, Search, Plus, Edit, Trash2, Clock, MapPin, RefreshCw, X, AlertCircle } from 'lucide-react';
import { interviewService, applicationService } from '@/lib/api';
import { usePagination } from '@/lib/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Interview {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  type?: string;
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

export default function InterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const applicationIdFromUrl = searchParams.get('applicationId');

  useEffect(() => {
    if (token) {
      loadInterviews();
      if (applicationIdFromUrl) {
        setShowCreateModal(true);
      }
    }
  }, [token, applicationIdFromUrl]);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = 'interviews_list'
      const { cacheManager } = await import('@/lib/cache/cacheManager')
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
      
      if (cached) {
        setInterviews(Array.isArray(cached) ? (cached as Interview[]) : [])
        setLoading(false)
        // Rafraîchir en arrière-plan
        interviewService.getAll({ limit: 100 }).then(response => {
          const interviews = response.data.interviews || response.data || []
          cacheManager.set(cacheKey, interviews, { ttl: 30000 })
          setInterviews(interviews)
        }).catch(() => {}) // Ignorer les erreurs
        return
      }
      
      // ✅ OPTIMISATION : Limiter à 100 entretiens par défaut
      const response = await interviewService.getAll({ limit: 100 })
      const interviews = response.data.interviews || response.data || []
      setInterviews(interviews)
      
      // Mettre en cache
      await cacheManager.set(cacheKey, interviews, { ttl: 30000 })
    } catch (error: any) {
      console.error('Erreur chargement entretiens:', error);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) return;
    
    try {
      await interviewService.delete(id);
      loadInterviews();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.applicationTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
  const pagination = usePagination({
    items: filteredInterviews,
    itemsPerPage: 20,
    initialPage: 1,
  });

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
              Gestion des Entretiens
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos entretiens et rendez-vous (création depuis une candidature uniquement)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouvel entretien
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Règle importante
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Un entretien doit être créé depuis une candidature. L'entreprise sera automatiquement récupérée de la candidature.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{interviews.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Planifiés</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'scheduled').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Terminés</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {interviews.filter(i => i.status === 'COMPLETED' || i.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Annulés</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {interviews.filter(i => i.status === 'CANCELLED' || i.status === 'cancelled').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un entretien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadInterviews}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entretien</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Candidature</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date/Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lieu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagination.paginatedItems.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{interview.title || 'Entretien'}</div>
                      {interview.companyName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{interview.companyName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {interview.applicationTitle && (
                        <div className="text-sm text-gray-900 dark:text-gray-100">{interview.applicationTitle}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(interview.scheduledAt || interview.createdAt).toLocaleDateString()}
                        {interview.scheduledAt && (
                          <span className="ml-2 text-xs text-gray-500">
                            {new Date(interview.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.location && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {interview.location}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        interview.status === 'SCHEDULED' || interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        interview.status === 'COMPLETED' || interview.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {interview.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedInterview(interview);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 hover:dark:text-blue-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(interview.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 hover:dark:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagination.paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {interviews.length === 0 ? 'Aucun entretien trouvé' : 'Aucun résultat pour votre recherche'}
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

      {showCreateModal && (
        <InterviewFormModal
          applicationId={applicationIdFromUrl || undefined}
          onClose={() => {
            setShowCreateModal(false);
            if (applicationIdFromUrl) {
              router.push('/b4ck0ff1ce/interviews');
            }
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            if (applicationIdFromUrl) {
              router.push('/b4ck0ff1ce/interviews');
            }
            loadInterviews();
          }}
        />
      )}

      {showEditModal && selectedInterview && (
        <InterviewFormModal
          interview={selectedInterview}
          onClose={() => {
            setShowEditModal(false);
            setSelectedInterview(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedInterview(null);
            loadInterviews();
          }}
        />
      )}
    </AdminLayout>
  );
}

function InterviewFormModal({ 
  interview, 
  applicationId,
  onClose, 
  onSuccess 
}: { 
  interview?: Interview;
  applicationId?: string | null;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: interview?.title || '',
    scheduledAt: interview?.scheduledAt ? new Date(interview.scheduledAt).toISOString().slice(0, 16) : '',
    location: interview?.location || '',
    type: interview?.type || '',
    notes: '',
    applicationId: interview?.applicationId || applicationId || '',
  });
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    loadApplications();
    if (applicationId || interview?.applicationId) {
      loadApplicationDetails(applicationId || interview?.applicationId || '');
    }
  }, []);

  const loadApplications = async () => {
    try {
      setLoadingApplications(true);
      const response = await applicationService.getAll();
      const apps = response.data.applications || response.data || [];
      setApplications(apps);
      
      if (applicationId || interview?.applicationId) {
        const app = apps.find((a: Application) => a.id === (applicationId || interview?.applicationId));
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

    if (!formData.title) {
      alert('Le titre est obligatoire');
      return;
    }

    if (!formData.scheduledAt) {
      alert('La date et l\'heure sont obligatoires');
      return;
    }

    setLoading(true);

    try {
      const interviewData = {
        title: formData.title,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        location: formData.location || undefined,
        type: formData.type || undefined,
        notes: formData.notes || undefined,
        applicationId: formData.applicationId,
      };

      if (interview) {
        await interviewService.update(interview.id, interviewData);
      } else {
        await interviewService.create(interviewData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur création/modification entretien:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création/modification de l\'entretien');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {interview ? 'Modifier l\'entretien' : 'Nouvel entretien'}
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
                {!interview && !applicationId && (
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
                disabled={!!applicationId || !!interview}
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
              Titre *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Entretien technique, Entretien RH..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date et Heure *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lieu
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Bureau, En ligne, Adresse..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un type...</option>
              <option value="phone">Téléphonique</option>
              <option value="video">Vidéoconférence</option>
              <option value="onsite">Sur site</option>
              <option value="technical">Technique</option>
              <option value="hr">RH</option>
              <option value="final">Final</option>
            </select>
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
              {loading ? 'Enregistrement...' : interview ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

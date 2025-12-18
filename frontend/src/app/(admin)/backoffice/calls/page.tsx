'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { Phone, Search, Plus, Edit, Trash2, Calendar, RefreshCw, X, Building2, Users, FileText } from 'lucide-react';
import { callService, contactService, companyService, applicationService } from '@/lib/api';
import { usePagination } from '@/lib/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Call {
  id: string;
  subject: string;
  scheduledAt?: string;
  completedAt?: string;
  type?: string;
  status?: string;
  contactId?: string;
  contactName?: string;
  companyId?: string;
  companyName?: string;
  applicationId?: string;
  applicationTitle?: string;
  notes?: string;
  createdAt: string;
}

export default function CallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  useEffect(() => {
    if (token) {
      loadCalls();
    }
  }, [token]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = 'calls_list'
      const { cacheManager } = await import('@/lib/cache/cacheManager')
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
      
      if (cached) {
        setCalls(cached)
        setLoading(false)
        // Rafraîchir en arrière-plan
        callService.getAll({ limit: 100 }).then(response => {
          const calls = response.data.calls || response.data || []
          cacheManager.set(cacheKey, calls, { ttl: 30000 })
          setCalls(calls)
        }).catch(() => {}) // Ignorer les erreurs
        return
      }
      
      // ✅ OPTIMISATION : Limiter à 100 appels par défaut
      const response = await callService.getAll({ limit: 100 })
      const calls = response.data.calls || response.data || []
      setCalls(calls)
      
      // Mettre en cache
      await cacheManager.set(cacheKey, calls, { ttl: 30000 })
    } catch (error: any) {
      console.error('Erreur chargement appels:', error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appel ?')) return;
    
    try {
      await callService.delete(id);
      loadCalls();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredCalls = calls.filter(call =>
    call.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
  const pagination = usePagination({
    items: filteredCalls,
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
              Gestion des Appels
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos appels téléphoniques (contact, entreprise ou candidature)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouvel appel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Appels</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{calls.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un appel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadCalls}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Appel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contact/Entreprise/Candidature</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagination.paginatedItems.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{call.subject || 'Appel'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {call.contactName && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          {call.contactName}
                        </div>
                      )}
                      {call.companyName && !call.contactName && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {call.companyName}
                        </div>
                      )}
                      {call.applicationTitle && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <FileText className="h-4 w-4 mr-2 text-gray-400" />
                          {call.applicationTitle}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {call.scheduledAt 
                          ? new Date(call.scheduledAt).toLocaleDateString()
                          : new Date(call.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {call.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCall(call);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 hover:dark:text-blue-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(call.id)}
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
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {calls.length === 0 ? 'Aucun appel trouvé' : 'Aucun résultat pour votre recherche'}
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
        <CallFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCalls();
          }}
        />
      )}

      {showEditModal && selectedCall && (
        <CallFormModal
          call={selectedCall}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCall(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCall(null);
            loadCalls();
          }}
        />
      )}
    </AdminLayout>
  );
}

function CallFormModal({ 
  call, 
  onClose, 
  onSuccess 
}: { 
  call?: Call; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    subject: call?.subject || '',
    scheduledAt: call?.scheduledAt ? new Date(call.scheduledAt).toISOString().slice(0, 16) : '',
    type: call?.type || 'spontaneous',
    notes: call?.notes || '',
    contactId: call?.contactId || '',
    companyId: call?.companyId || '',
    companyName: call?.companyName || '',
    applicationId: call?.applicationId || '',
  });
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contactsRes, companiesRes, applicationsRes] = await Promise.all([
        contactService.getAll().catch(() => ({ data: { contacts: [] } })),
        companyService.getAll().catch(() => ({ data: { companies: [] } })),
        applicationService.getAll().catch(() => ({ data: { applications: [] } })),
      ]);

      setContacts(contactsRes.data.contacts || contactsRes.data || []);
      const companiesData = companiesRes.data.companies || companiesRes.data || [];
      setCompanies(companiesData);
      setCompanySuggestions(companiesData.map((c: any) => c.name));
      setApplications(applicationsRes.data.applications || applicationsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier qu'au moins un champ est rempli
    if (!formData.contactId && !formData.companyId && !formData.applicationId) {
      alert('Vous devez sélectionner au moins un contact, une entreprise ou une candidature');
      return;
    }

    if (!formData.subject) {
      alert('Le sujet est obligatoire');
      return;
    }

    setLoading(true);

    try {
      // Si entreprise saisie mais pas d'ID, créer/récupérer l'entreprise
      if (formData.companyName && !formData.companyId) {
        const existingCompany = companies.find(c => 
          c.name.toLowerCase() === formData.companyName.toLowerCase()
        );

        if (existingCompany) {
          formData.companyId = existingCompany.id;
        } else {
          const newCompany = await companyService.create({ name: formData.companyName });
          formData.companyId = newCompany.data.company?.id || newCompany.data.id;
        }
      }

      const callData: any = {
        subject: formData.subject,
        type: formData.type,
        notes: formData.notes || undefined,
      };

      if (formData.scheduledAt) {
        callData.scheduledAt = new Date(formData.scheduledAt).toISOString();
      }

      if (formData.contactId) callData.contactId = formData.contactId;
      if (formData.companyId) callData.companyId = formData.companyId;
      if (formData.applicationId) callData.applicationId = formData.applicationId;

      if (call) {
        await callService.update(call.id, callData);
      } else {
        await callService.create(callData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur création/modification appel:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création/modification de l\'appel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {call ? 'Modifier l\'appel' : 'Nouvel appel'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sujet *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Candidature spontanée, Suivi entretien..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="spontaneous">Candidature spontanée</option>
              <option value="followup">Suivi</option>
              <option value="information">Demande d'information</option>
              <option value="callback">Rappel</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact
              </label>
              <select
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value, companyId: '', applicationId: '' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Aucun</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entreprise
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => {
                  const company = companies.find(c => c.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    companyId: e.target.value,
                    companyName: company?.name || '',
                    contactId: '',
                    applicationId: ''
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Aucune</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Candidature
              </label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value, contactId: '', companyId: '' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Aucune</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Au moins un champ (Contact, Entreprise ou Candidature) doit être rempli
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date et Heure prévues
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
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
              {loading ? 'Enregistrement...' : call ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

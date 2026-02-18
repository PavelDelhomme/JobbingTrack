'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Building2, RefreshCw, X } from 'lucide-react';
import { contactService, companyService } from '@/lib/api';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { usePagination } from '@/lib/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // ✅ OPTIMISATION : Utiliser le cache et limiter à 100
      const cacheKey = 'contacts_list'
      const { cacheManager } = await import('@/lib/cache/cacheManager')
      const cached = await cacheManager.get(cacheKey, { ttl: 30000 }) // Cache 30 secondes
      
      if (cached) {
        setContacts(cached)
        setLoading(false)
        // Rafraîchir en arrière-plan
        contactService.getAll({ limit: 100 }).then(response => {
          const contacts = response.data.contacts || response.data || []
          cacheManager.set(cacheKey, contacts, { ttl: 30000 })
          setContacts(contacts)
        }).catch(() => {}) // Ignorer les erreurs
        return
      }
      
      // ✅ OPTIMISATION : Limiter à 100 contacts par défaut
      const response = await contactService.getAll({ limit: 100 })
      const contacts = response.data.contacts || response.data || []
      setContacts(contacts)
      
      // Mettre en cache
      await cacheManager.set(cacheKey, contacts, { ttl: 30000 })
    } catch (error: any) {
      console.error('Erreur chargement contacts:', error);
      // Fallback si erreur
      if (error.response?.status === 500 || error.code === 'ERR_NETWORK') {
        setContacts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;
    
    try {
      await contactService.delete(id);
      loadContacts();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
  const pagination = usePagination({
    items: filteredContacts,
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
              Gestion des Contacts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos contacts professionnels
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouveau contact
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{contacts.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadContacts}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entreprise</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagination.paginatedItems.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold">
                            {contact.firstName?.[0]}{contact.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {contact.firstName} {contact.lastName}
                          </div>
                          {contact.position && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{contact.position}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.email && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {contact.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.phone && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {contact.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.companyName && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {contact.companyName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 hover:dark:text-blue-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
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
                      {contacts.length === 0 ? 'Aucun contact trouvé' : 'Aucun résultat pour votre recherche'}
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
        <ContactFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadContacts();
          }}
        />
      )}

      {showEditModal && selectedContact && (
        <ContactFormModal
          contact={selectedContact}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContact(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedContact(null);
            loadContacts();
          }}
        />
      )}
    </AdminLayout>
  );
}

function ContactFormModal({ 
  contact, 
  onClose, 
  onSuccess 
}: { 
  contact?: Contact; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    position: contact?.position || '',
    companyName: contact?.companyName || '',
  });
  const [loading, setLoading] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    loadCompanySuggestions();
  }, []);

  const loadCompanySuggestions = async () => {
    try {
      setLoadingCompanies(true);
      const response = await companyService.getAll();
      const companies = response.data.companies || response.data || [];
      setCompanySuggestions(companies.map((c: any) => c.name));
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      setCompanySuggestions([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      alert('Le prénom et le nom sont obligatoires');
      return;
    }

    if (!formData.companyName) {
      alert('L\'entreprise est obligatoire');
      return;
    }

    setLoading(true);

    try {
      // Créer ou récupérer l'entreprise
      let companyId: string;
      try {
        // Chercher l'entreprise existante
        const companiesResponse = await companyService.getAll();
        const companies = companiesResponse.data.companies || companiesResponse.data || [];
        const existingCompany = companies.find((c: any) => 
          c.name.toLowerCase() === formData.companyName.toLowerCase()
        );

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          // Créer l'entreprise automatiquement
          const newCompanyResponse = await companyService.create({
            name: formData.companyName,
          });
          companyId = newCompanyResponse.data.company?.id || newCompanyResponse.data.id;
        }
      } catch (error) {
        console.error('Erreur gestion entreprise:', error);
        alert('Erreur lors de la création/récupération de l\'entreprise');
        setLoading(false);
        return;
      }

      // Créer ou mettre à jour le contact
      const contactData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        position: formData.position || undefined,
        companyId,
      };

      if (contact) {
        await contactService.update(contact.id, contactData);
      } else {
        await contactService.create(contactData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur création/modification contact:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création/modification du contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {contact ? 'Modifier le contact' : 'Nouveau contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entreprise *
            </label>
            <AutocompleteInput
              value={formData.companyName}
              onChange={(value) => setFormData({ ...formData, companyName: value })}
              placeholder="Rechercher ou saisir une entreprise..."
              suggestions={companySuggestions}
              loading={loadingCompanies}
              required
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              L'entreprise sera créée automatiquement si elle n'existe pas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Poste
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
              {loading ? 'Enregistrement...' : contact ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

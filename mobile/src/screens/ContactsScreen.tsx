import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  lastContactDate?: string;
  company?: {
    id: string;
    name: string;
    industry?: string;
    location?: string;
  };
  applicationContacts?: Array<{
    role?: string;
    isPrimary: boolean;
  }>;
}

interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  logoUrl?: string;
}

const ContactsScreen: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [contacts, companies, searchText]);

  const fetchData = async () => {
    try {
      // TODO: Implémenter les appels API
      // const contactsResponse = await contactService.getAll();
      // const companiesResponse = await companyService.getAll();

      // Données mockées pour le développement
      const mockContacts: Contact[] = [
        {
          id: '1',
          firstName: 'Marie',
          lastName: 'Dubois',
          position: 'DRH',
          email: 'redacted@example.invalid',
          phone: '+33123456789',
          linkedinUrl: 'https://linkedin.com/in/marie-dubois',
          lastContactDate: '2024-01-15T10:00:00Z',
          company: {
            id: '1',
            name: 'TechCorp',
            industry: 'Technologie',
            location: 'Paris, France'
          },
          applicationContacts: [
            { role: 'Recruteur principal', isPrimary: true }
          ]
        },
        {
          id: '2',
          firstName: 'Pierre',
          lastName: 'Martin',
          position: 'Chef de Projet',
          email: 'redacted@example.invalid',
          phone: '+33198765432',
          lastContactDate: '2024-01-10T14:30:00Z',
          company: {
            id: '2',
            name: 'StartupInc',
            industry: 'Startup',
            location: 'Lyon, France'
          }
        }
      ];

      const mockCompanies: Company[] = [
        {
          id: '1',
          name: 'TechCorp',
          website: 'https://techcorp.com',
          industry: 'Technologie',
          size: '100-500',
          location: 'Paris, France',
          description: 'Entreprise leader en développement logiciel'
        },
        {
          id: '2',
          name: 'StartupInc',
          website: 'https://startupinc.com',
          industry: 'Startup',
          size: '10-50',
          location: 'Lyon, France',
          description: 'Startup innovante en croissance'
        }
      ];

      setContacts(mockContacts);
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterData = () => {
    if (activeTab === 'contacts') {
      let filtered = contacts;

      if (searchText) {
        filtered = filtered.filter(contact =>
          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
          contact.position?.toLowerCase().includes(searchText.toLowerCase()) ||
          contact.company?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      setFilteredContacts(filtered);
    } else {
      let filtered = companies;

      if (searchText) {
        filtered = filtered.filter(company =>
          company.name.toLowerCase().includes(searchText.toLowerCase()) ||
          company.industry?.toLowerCase().includes(searchText.toLowerCase()) ||
          company.location?.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      setFilteredCompanies(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={styles.contactHeader}>
        <View style={styles.contactMainInfo}>
          <Text style={styles.contactName}>
            {item.firstName} {item.lastName}
          </Text>
          {item.position && (
            <Text style={styles.contactPosition}>{item.position}</Text>
          )}
        </View>
        {item.applicationContacts?.some(ac => ac.isPrimary) && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryText}>Principal</Text>
          </View>
        )}
      </View>

      <View style={styles.contactDetails}>
        {item.company && (
          <Text style={styles.companyInfo}>
            🏢 {item.company.name}
          </Text>
        )}

        {item.email && (
          <Text style={styles.contactInfo}>✉️ {item.email}</Text>
        )}

        {item.phone && (
          <Text style={styles.contactInfo}>📞 {item.phone}</Text>
        )}

        {item.linkedinUrl && (
          <Text style={styles.contactInfo}>💼 LinkedIn</Text>
        )}

        {item.lastContactDate && (
          <Text style={styles.lastContact}>
            🕐 Dernier contact: {new Date(item.lastContactDate).toLocaleDateString('fr-FR')}
          </Text>
        )}

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            📝 {item.notes}
          </Text>
        )}
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>✉️ Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📞 Appeler</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCompanyItem = ({ item }: { item: Company }) => (
    <TouchableOpacity style={styles.companyItem}>
      <View style={styles.companyHeader}>
        <Text style={styles.companyName}>{item.name}</Text>
        {item.industry && (
          <View style={styles.industryBadge}>
            <Text style={styles.industryText}>{item.industry}</Text>
          </View>
        )}
      </View>

      <View style={styles.companyDetails}>
        {item.location && (
          <Text style={styles.companyInfo}>📍 {item.location}</Text>
        )}

        {item.size && (
          <Text style={styles.companyInfo}>👥 {item.size} employés</Text>
        )}

        {item.website && (
          <Text style={styles.companyInfo}>🌐 {item.website}</Text>
        )}

        {item.description && (
          <Text style={styles.companyDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}
      </View>

      <View style={styles.companyActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔗 Site web</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📋 Candidatures</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement des contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec onglets */}
      <View style={styles.header}>
        <Text style={styles.title}>👥 Contacts & Entreprises</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
            onPress={() => setActiveTab('contacts')}
          >
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
              Contacts ({filteredContacts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'companies' && styles.activeTab]}
            onPress={() => setActiveTab('companies')}
          >
            <Text style={[styles.tabText, activeTab === 'companies' && styles.activeTabText]}>
              Entreprises ({filteredCompanies.length})
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Liste des données */}
      <FlatList
        data={activeTab === 'contacts' ? filteredContacts : filteredCompanies}
        renderItem={activeTab === 'contacts' ? renderContactItem : renderCompanyItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Aucun {activeTab === 'contacts' ? 'contact' : 'entreprise'} trouvé
            </Text>
          </View>
        }
      />

      {/* Bouton d'ajout rapide */}
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>
          ➕ Nouveau {activeTab === 'contacts' ? 'Contact' : 'Entreprise'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  contactItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  contactMainInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  contactPosition: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  contactDetails: {
    marginBottom: 15,
  },
  companyInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 5,
  },
  lastContact: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  companyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  industryBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  industryText: {
    fontSize: 12,
    color: '#374151',
  },
  companyDetails: {
    marginBottom: 15,
  },
  companyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
    lineHeight: 20,
  },
  companyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContactsScreen;

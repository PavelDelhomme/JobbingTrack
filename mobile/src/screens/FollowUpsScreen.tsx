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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FollowUp {
  id: string;
  applicationId: string;
  contactId?: string;
  type: 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'MESSAGE' | 'MEETING';
  scheduledDate: string;
  completed: boolean;
  completedDate?: string;
  sentDate?: string;
  subject: string;
  message?: string;
  response?: string;
  responseDate?: string;
  status: 'PENDING_FOLLOWUP' | 'POSITIVE_RESPONSE' | 'NEGATIVE_RESPONSE' | 'NO_RESPONSE' | 'SCHEDULED_FOLLOWUP';
  application?: {
    position: string;
    company?: {
      name: string;
    };
  };
  contact?: {
    firstName: string;
    lastName: string;
  };
}

const FollowUpsScreen: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [filteredFollowUps, setFilteredFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchFollowUps();
  }, []);

  useEffect(() => {
    filterFollowUps();
  }, [followUps, searchText, filterStatus, filterType]);

  const fetchFollowUps = async () => {
    try {
      // TODO: Implémenter l'appel API pour récupérer les relances
      // const response = await followupService.getAll();
      // setFollowUps(response.data.followups || []);

      // Données mockées pour le développement
      const mockFollowUps: FollowUp[] = [
        {
          id: '1',
          applicationId: 'app1',
          type: 'EMAIL',
          scheduledDate: '2024-01-15T10:00:00Z',
          completed: true,
          completedDate: '2024-01-15T10:05:00Z',
          sentDate: '2024-01-15T10:00:00Z',
          subject: 'Suivi candidature Développeur Frontend',
          message: 'Bonjour, j\'aimerais avoir des nouvelles concernant ma candidature...',
          response: 'Nous avons bien reçu votre candidature et vous contacterons prochainement.',
          responseDate: '2024-01-16T14:30:00Z',
          status: 'POSITIVE_RESPONSE',
          application: {
            position: 'Développeur Frontend',
            company: { name: 'TechCorp' }
          },
          contact: {
            firstName: 'Marie',
            lastName: 'Dubois'
          }
        },
        {
          id: '2',
          applicationId: 'app2',
          type: 'PHONE',
          scheduledDate: '2024-01-20T15:00:00Z',
          completed: false,
          status: 'PENDING_FOLLOWUP',
          subject: 'Relance téléphonique',
          application: {
            position: 'Chef de Projet',
            company: { name: 'StartupInc' }
          }
        },
        {
          id: '3',
          applicationId: 'app3',
          type: 'LINKEDIN',
          scheduledDate: '2024-01-25T09:00:00Z',
          completed: false,
          status: 'SCHEDULED_FOLLOWUP',
          subject: 'Message LinkedIn',
          message: 'Bonjour, je me permets de vous recontacter au sujet de ma candidature...',
          application: {
            position: 'Designer UX/UI',
            company: { name: 'DesignStudio' }
          }
        }
      ];
      setFollowUps(mockFollowUps);
    } catch (error) {
      console.error('Erreur chargement relances:', error);
      Alert.alert('Erreur', 'Impossible de charger les relances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterFollowUps = () => {
    let filtered = followUps;

    // Filtrer par recherche
    if (searchText) {
      filtered = filtered.filter(followup =>
        followup.subject.toLowerCase().includes(searchText.toLowerCase()) ||
        followup.application?.position.toLowerCase().includes(searchText.toLowerCase()) ||
        followup.application?.company?.name.toLowerCase().includes(searchText.toLowerCase()) ||
        followup.contact?.firstName.toLowerCase().includes(searchText.toLowerCase()) ||
        followup.contact?.lastName.toLowerCase().includes(searchText.toLowerCase()) ||
        followup.message?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(followup => followup.status === filterStatus);
    }

    // Filtrer par type
    if (filterType !== 'all') {
      filtered = filtered.filter(followup => followup.type === filterType);
    }

    setFilteredFollowUps(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowUps();
  };

  const markAsCompleted = async (followUpId: string) => {
    try {
      // TODO: Implémenter l'appel API pour marquer comme terminé
      // await followupService.complete(followUpId);

      // Mise à jour locale pour le développement
      setFollowUps(prev => prev.map(followup =>
        followup.id === followUpId
          ? { ...followup, completed: true, completedDate: new Date().toISOString() }
          : followup
      ));

      Alert.alert('Succès', 'Relance marquée comme terminée');
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de marquer la relance comme terminée');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'POSITIVE_RESPONSE': return '#10B981';
      case 'NEGATIVE_RESPONSE': return '#EF4444';
      case 'NO_RESPONSE': return '#F59E0B';
      case 'PENDING_FOLLOWUP': return '#3B82F6';
      case 'SCHEDULED_FOLLOWUP': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'POSITIVE_RESPONSE': return 'Retour positif';
      case 'NEGATIVE_RESPONSE': return 'Retour négatif';
      case 'NO_RESPONSE': return 'Aucun retour';
      case 'PENDING_FOLLOWUP': return 'En attente';
      case 'SCHEDULED_FOLLOWUP': return 'Programmée';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return '✉️';
      case 'PHONE': return '📞';
      case 'LINKEDIN': return '💼';
      case 'MESSAGE': return '💬';
      case 'MEETING': return '🤝';
      default: return '📝';
    }
  };

  const isOverdue = (scheduledDate: string) => {
    return new Date(scheduledDate) < new Date() && !followUps.find(f => f.id === scheduledDate)?.completed;
  };

  const renderFollowUpItem = ({ item }: { item: FollowUp }) => (
    <TouchableOpacity style={[
      styles.followUpItem,
      isOverdue(item.scheduledDate) && styles.overdueItem
    ]}>
      <View style={styles.followUpHeader}>
        <View style={styles.followUpMainInfo}>
          <Text style={styles.subject}>{item.subject}</Text>
          <Text style={styles.applicationInfo}>
            📋 {item.application?.position} chez {item.application?.company?.name}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.followUpDetails}>
        <Text style={styles.followUpInfo}>
          {getTypeIcon(item.type)} {item.contact ? `${item.contact.firstName} ${item.contact.lastName}` : 'Relance générale'}
        </Text>

        <Text style={[
          styles.scheduledDate,
          isOverdue(item.scheduledDate) && styles.overdueText
        ]}>
          📅 {format(new Date(item.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
          {isOverdue(item.scheduledDate) && ' (En retard)'}
        </Text>

        {item.sentDate && (
          <Text style={styles.sentDate}>
            ✅ Envoyée le {format(new Date(item.sentDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </Text>
        )}

        {item.completedDate && (
          <Text style={styles.completedDate}>
            ✓ Terminée le {format(new Date(item.completedDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </Text>
        )}

        {item.response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Réponse :</Text>
            <Text style={styles.responseText}>{item.response}</Text>
          </View>
        )}

        {item.message && (
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        )}
      </View>

      {!item.completed && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => markAsCompleted(item.id)}
          >
            <Text style={styles.completeButtonText}>✓ Marquer comme terminée</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement des relances...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec filtres */}
      <View style={styles.header}>
        <Text style={styles.title}>🔄 Gestion des Relances</Text>

        <View style={styles.filters}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.activeFilterText]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'PENDING_FOLLOWUP' && styles.activeFilter]}
            onPress={() => setFilterStatus('PENDING_FOLLOWUP')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'PENDING_FOLLOWUP' && styles.activeFilterText]}>
              En attente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'POSITIVE_RESPONSE' && styles.activeFilter]}
            onPress={() => setFilterStatus('POSITIVE_RESPONSE')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'POSITIVE_RESPONSE' && styles.activeFilterText]}>
              Positif
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {followUps.filter(f => !f.completed).length}
          </Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {followUps.filter(f => f.status === 'POSITIVE_RESPONSE').length}
          </Text>
          <Text style={styles.statLabel}>Réponses positives</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {followUps.filter(f => isOverdue(f.scheduledDate) && !f.completed).length}
          </Text>
          <Text style={styles.statLabel}>En retard</Text>
        </View>
      </View>

      {/* Liste des relances */}
      <FlatList
        data={filteredFollowUps}
        renderItem={renderFollowUpItem}
        keyExtractor={(item) => item.id}
        style={styles.followUpsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune relance trouvée</Text>
          </View>
        }
      />

      {/* Bouton d'ajout rapide */}
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>➕ Nouvelle Relance</Text>
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
  filters: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  followUpsList: {
    flex: 1,
    padding: 15,
  },
  followUpItem: {
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
  overdueItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  followUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  followUpMainInfo: {
    flex: 1,
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  applicationInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  followUpDetails: {
    gap: 5,
  },
  followUpInfo: {
    fontSize: 14,
    color: '#374151',
  },
  scheduledDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  sentDate: {
    fontSize: 14,
    color: '#10B981',
  },
  completedDate: {
    fontSize: 14,
    color: '#059669',
  },
  responseContainer: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  responseText: {
    fontSize: 14,
    color: '#047857',
    fontStyle: 'italic',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
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

export default FollowUpsScreen;

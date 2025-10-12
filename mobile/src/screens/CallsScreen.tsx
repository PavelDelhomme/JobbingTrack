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
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { apiService, pushNotificationService } from '../services/api';
import { localStorageService } from '../services/storage';

interface Call {
  id: string;
  applicationId: string;
  contactId?: string;
  type: 'OUTGOING' | 'INCOMING' | 'MISSED';
  scheduledDate?: string;
  callDate?: string;
  duration?: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_ANSWER' | 'VOICEMAIL' | 'RESCHEDULED';
  notes?: string;
  outcome?: string;
  followUpNeeded: boolean;
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

const CallsScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isOnline, isSyncing, syncNow } = useOfflineSync();

  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchCalls();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterCalls();
  }, [calls, selectedDate, searchText, filterStatus]);

  const fetchCalls = async () => {
    try {
      setLoading(true);

      // Essayer de récupérer depuis l'API en ligne
      if (isOnline) {
        try {
          const response = await apiService.getCalls({
            page: 1,
            limit: 100
          });

          if (response.success && response.data) {
            setCalls(response.data.data);
            // Sauvegarder en local pour usage offline
            await localStorageService.saveCalls(response.data.data);
            return;
          }
        } catch (error) {
          console.error('Erreur API appels:', error);
        }
      }

      // Fallback vers les données locales
      const localCalls = await localStorageService.getCalls();
      setCalls(localCalls);

    } catch (error) {
      console.error('Erreur chargement appels:', error);
      Alert.alert('Erreur', 'Impossible de charger les appels');

      // Essayer de charger depuis le stockage local en cas d'erreur complète
      try {
        const localCalls = await localStorageService.getCalls();
        setCalls(localCalls);
      } catch (localError) {
        console.error('Erreur chargement local:', localError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    // Forcer une synchronisation si en ligne
    if (isOnline) {
      await syncNow();
    }

    await fetchCalls();
  };

  const filterCalls = () => {
    let filtered = calls;

    // Filtrer par date
    if (selectedDate) {
      filtered = filtered.filter(call =>
        call.scheduledDate?.startsWith(selectedDate) ||
        call.callDate?.startsWith(selectedDate)
      );
    }

    // Filtrer par recherche
    if (searchText) {
      filtered = filtered.filter(call =>
        call.application?.position.toLowerCase().includes(searchText.toLowerCase()) ||
        call.application?.company?.name.toLowerCase().includes(searchText.toLowerCase()) ||
        call.contact?.firstName.toLowerCase().includes(searchText.toLowerCase()) ||
        call.contact?.lastName.toLowerCase().includes(searchText.toLowerCase()) ||
        call.notes?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(call => call.status === filterStatus);
    }

    setFilteredCalls(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10B981';
      case 'SCHEDULED': return '#3B82F6';
      case 'CANCELLED': return '#EF4444';
      case 'NO_ANSWER': return '#F59E0B';
      case 'VOICEMAIL': return '#8B5CF6';
      case 'RESCHEDULED': return '#06B6D4';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Terminé';
      case 'SCHEDULED': return 'Planifié';
      case 'CANCELLED': return 'Annulé';
      case 'NO_ANSWER': return 'Pas de réponse';
      case 'VOICEMAIL': return 'Message vocal';
      case 'RESCHEDULED': return 'Replanifié';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OUTGOING': return '📞';
      case 'INCOMING': return '📲';
      case 'MISSED': return '❌';
      default: return '📞';
    }
  };

  const renderCallItem = ({ item }: { item: Call }) => (
    <TouchableOpacity style={styles.callItem}>
      <View style={styles.callHeader}>
        <View style={styles.callMainInfo}>
          <Text style={styles.position}>{item.application?.position}</Text>
          <Text style={styles.company}>{item.application?.company?.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.callDetails}>
        <Text style={styles.callInfo}>
          {getTypeIcon(item.type)} {item.contact ? `${item.contact.firstName} ${item.contact.lastName}` : 'Appel général'}
        </Text>

        {item.scheduledDate && (
          <Text style={styles.callDate}>
            📅 {format(new Date(item.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </Text>
        )}

        {item.callDate && (
          <Text style={styles.callDate}>
            ⏰ {format(new Date(item.callDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </Text>
        )}

        {item.duration && (
          <Text style={styles.callDuration}>
            ⏱️ {Math.floor(item.duration / 60)}min {item.duration % 60}s
          </Text>
        )}

        {item.outcome && (
          <Text style={styles.outcome}>📝 {item.outcome}</Text>
        )}

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
        )}

        {item.followUpNeeded && (
          <View style={styles.followUpBadge}>
            <Text style={styles.followUpText}>🔄 Relance nécessaire</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement des appels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec statut de connexion */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>📞 Gestion des Appels</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#EF4444' }]}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
            {isSyncing && <Text style={styles.syncText}>🔄 Sync...</Text>}
          </View>
        </View>

        <View style={styles.filters}>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Text style={styles.calendarButtonText}>
              📅 {format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Bouton de synchronisation manuelle */}
        {!isOnline && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={syncNow}
            disabled={isSyncing}
          >
            <Text style={styles.syncButtonText}>
              {isSyncing ? '🔄 Synchronisation...' : '📡 Synchroniser'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calendrier */}
      {showCalendar && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#3B82F6' }
            }}
            theme={{
              selectedDayBackgroundColor: '#3B82F6',
              todayTextColor: '#3B82F6',
              arrowColor: '#3B82F6',
            }}
          />
        </View>
      )}

      {/* Liste des appels */}
      <FlatList
        data={filteredCalls}
        renderItem={renderCallItem}
        keyExtractor={(item) => item.id}
        style={styles.callsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Chargement des appels...' : 'Aucun appel trouvé'}
            </Text>
            {isOnline && !loading && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchCalls}
              >
                <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Bouton d'ajout rapide */}
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>➕ Nouvel Appel</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  calendarButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calendarButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  syncButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  callsList: {
    flex: 1,
    padding: 15,
  },
  callItem: {
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
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  callMainInfo: {
    flex: 1,
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  company: {
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
  callDetails: {
    gap: 5,
  },
  callInfo: {
    fontSize: 14,
    color: '#374151',
  },
  callDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  callDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  outcome: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  followUpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  followUpText: {
    color: '#92400E',
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
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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

export default CallsScreen;

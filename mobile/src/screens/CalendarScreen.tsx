import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description?: string;
  type: 'APPLICATION' | 'INTERVIEW' | 'FOLLOWUP' | 'DEADLINE' | 'MEETING' | 'OTHER';
  startDate: string;
  endDate?: string;
  allDay: boolean;
  applicationId?: string;
  relatedTo: string;
  relatedId: string;
  application?: {
    position: string;
    company?: {
      name: string;
    };
  };
}

const CalendarScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedDate, viewMode]);

  const fetchEvents = async () => {
    try {
      // TODO: Implémenter l'appel API pour récupérer les événements
      // const response = await eventService.getAll();
      // setEvents(response.data.events || []);

      // Données mockées pour le développement
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Candidature: Développeur Frontend',
          description: 'Candidature envoyée pour le poste de Développeur Frontend chez TechCorp',
          type: 'APPLICATION',
          startDate: '2024-01-15T00:00:00Z',
          allDay: true,
          relatedTo: 'APPLICATION',
          relatedId: 'app1',
          application: {
            position: 'Développeur Frontend',
            company: { name: 'TechCorp' }
          }
        },
        {
          id: '2',
          title: 'Entretien technique',
          description: 'Entretien technique avec l\'équipe développement',
          type: 'INTERVIEW',
          startDate: '2024-01-20T14:00:00Z',
          endDate: '2024-01-20T15:00:00Z',
          allDay: false,
          relatedTo: 'INTERVIEW',
          relatedId: 'int1',
          application: {
            position: 'Chef de Projet',
            company: { name: 'StartupInc' }
          }
        },
        {
          id: '3',
          title: 'Relance téléphonique',
          description: 'Appeler Marie Dubois pour suivi candidature',
          type: 'FOLLOWUP',
          startDate: '2024-01-25T10:00:00Z',
          allDay: false,
          relatedTo: 'FOLLOWUP',
          relatedId: 'fol1'
        },
        {
          id: '4',
          title: 'Deadline candidature',
          description: 'Date limite pour répondre à la candidature Designer UX',
          type: 'DEADLINE',
          startDate: '2024-01-30T23:59:59Z',
          allDay: true,
          relatedTo: 'APPLICATION',
          relatedId: 'app2'
        }
      ];
      setEvents(mockEvents);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      Alert.alert('Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (viewMode === 'day') {
      // Afficher seulement les événements du jour sélectionné
      filtered = filtered.filter(event => {
        const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd');
        return eventDate === selectedDate;
      });
    } else if (viewMode === 'week') {
      // Afficher les événements de la semaine du jour sélectionné
      const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }); // Lundi
      const weekEnd = endOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    }
    // Pour viewMode === 'month', on affiche tous les événements mais avec les marqueurs de calendrier

    setFilteredEvents(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'APPLICATION': return '#3B82F6';
      case 'INTERVIEW': return '#10B981';
      case 'FOLLOWUP': return '#8B5CF6';
      case 'DEADLINE': return '#EF4444';
      case 'MEETING': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION': return '📝';
      case 'INTERVIEW': return '🎤';
      case 'FOLLOWUP': return '🔄';
      case 'DEADLINE': return '⏰';
      case 'MEETING': return '🤝';
      default: return '📅';
    }
  };

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'APPLICATION': return 'Candidature';
      case 'INTERVIEW': return 'Entretien';
      case 'FOLLOWUP': return 'Relance';
      case 'DEADLINE': return 'Échéance';
      case 'MEETING': return 'Rendez-vous';
      default: return 'Événement';
    }
  };

  // Préparer les dates marquées pour le calendrier
  const getMarkedDates = () => {
    const markedDates: any = {};

    events.forEach(event => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
      if (!markedDates[dateKey]) {
        markedDates[dateKey] = {
          marked: true,
          dotColor: getEventTypeColor(event.type),
        };
      }

      // Ajouter la date sélectionnée
      if (dateKey === selectedDate) {
        markedDates[dateKey] = {
          ...markedDates[dateKey],
          selected: true,
          selectedColor: '#3B82F6',
        };
      }
    });

    return markedDates;
  };

  const renderEventItem = ({ item }: { item: Event }) => (
    <TouchableOpacity style={[
      styles.eventItem,
      { borderLeftColor: getEventTypeColor(item.type), borderLeftWidth: 4 }
    ]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventTypeContainer}>
          <Text style={styles.eventTypeIcon}>{getEventTypeIcon(item.type)}</Text>
          <Text style={[styles.eventTypeText, { color: getEventTypeColor(item.type) }]}>
            {getEventTypeText(item.type)}
          </Text>
        </View>
        {!item.allDay && (
          <Text style={styles.eventTime}>
            {format(new Date(item.startDate), 'HH:mm')}
            {item.endDate && ` - ${format(new Date(item.endDate), 'HH:mm')}`}
          </Text>
        )}
      </View>

      <Text style={styles.eventTitle}>{item.title}</Text>

      {item.application && (
        <Text style={styles.eventApplication}>
          📋 {item.application.position}
          {item.application.company && ` chez ${item.application.company.name}`}
        </Text>
      )}

      {item.description && (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {item.allDay && (
        <Text style={styles.allDayText}>Toute la journée</Text>
      )}
    </TouchableOpacity>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <View style={styles.weekContainer}>
        {weekDays.map(day => {
          const dayEvents = events.filter(event =>
            isSameDay(new Date(event.startDate), day)
          );

          return (
            <View key={day.toISOString()} style={styles.dayColumn}>
              <Text style={styles.dayHeader}>
                {format(day, 'EEE dd', { locale: fr })}
              </Text>
              {dayEvents.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.miniEvent, { backgroundColor: getEventTypeColor(event.type) }]}
                >
                  <Text style={styles.miniEventText} numberOfLines={1}>
                    {format(new Date(event.startDate), 'HH:mm')} {event.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement du calendrier...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec contrôles de vue */}
      <View style={styles.header}>
        <Text style={styles.title}>📅 Calendrier</Text>

        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'month' && styles.activeViewButton]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'month' && styles.activeViewButtonText]}>
              Mois
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'week' && styles.activeViewButton]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'week' && styles.activeViewButtonText]}>
              Semaine
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'day' && styles.activeViewButton]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'day' && styles.activeViewButtonText]}>
              Jour
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendrier mensuel */}
      {viewMode === 'month' && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={currentMonth}
            onMonthChange={(month) => setCurrentMonth(month.dateString.substring(0, 7))}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            theme={{
              selectedDayBackgroundColor: '#3B82F6',
              todayTextColor: '#3B82F6',
              arrowColor: '#3B82F6',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>
      )}

      {/* Vue semaine */}
      {viewMode === 'week' && (
        <View style={styles.weekViewContainer}>
          {renderWeekView()}
        </View>
      )}

      {/* Vue jour avec événements détaillés */}
      {viewMode === 'day' && (
        <View style={styles.dayViewContainer}>
          <Text style={styles.dayTitle}>
            Événements du {format(new Date(selectedDate), 'EEEE dd MMMM yyyy', { locale: fr })}
          </Text>

          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            style={styles.eventsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun événement ce jour</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Liste des événements (pour les vues mois et semaine) */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsSectionTitle}>
            Événements du {format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}
          </Text>

          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            style={styles.eventsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun événement</Text>
              </View>
            }
          />
        </View>
      )}
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
  viewControls: {
    flexDirection: 'row',
    gap: 10,
  },
  viewButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeViewButton: {
    backgroundColor: '#3B82F6',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activeViewButtonText: {
    color: '#FFFFFF',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekViewContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekContainer: {
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    marginHorizontal: 2,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 5,
  },
  miniEvent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  miniEventText: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  dayViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
    textAlign: 'center',
  },
  eventsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  eventsList: {
    flex: 1,
  },
  eventItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTypeIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  eventApplication: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  allDayText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 4,
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
});

export default CalendarScreen;

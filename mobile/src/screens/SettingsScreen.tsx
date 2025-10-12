import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { apiService, pushNotificationService } from '../services/api';
import { localStorageService } from '../services/storage';
import { notificationService } from '../services/notifications';

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  notifications: {
    email: boolean;
    push: boolean;
    interviewReminders: boolean;
    followUpReminders: boolean;
    applicationDeadlines: boolean;
  };
  preferences: {
    defaultApplicationStatus: string;
    defaultInterviewDuration: number;
    autoArchiveOldApplications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

const SettingsScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isOnline, isSyncing, syncNow, exportData, importData } = useOfflineSync();

  const [settings, setSettings] = useState<UserSettings>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notifications: {
      email: true,
      push: true,
      interviewReminders: true,
      followUpReminders: true,
      applicationDeadlines: true,
    },
    preferences: {
      defaultApplicationStatus: 'CANDIDATE_PENDING',
      defaultInterviewDuration: 60,
      autoArchiveOldApplications: true,
      theme: 'auto',
      language: 'fr',
    },
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserSettings();
      checkNotificationPermissions();
    }
  }, [isAuthenticated]);

  const fetchUserSettings = async () => {
    try {
      // Essayer de récupérer depuis l'API en ligne
      if (isOnline) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.success && response.data) {
            setSettings(prev => ({
              ...prev,
              firstName: response.data.firstName || prev.firstName,
              lastName: response.data.lastName || prev.lastName,
              email: response.data.email || prev.email,
              phone: response.data.phone || prev.phone,
            }));
            return;
          }
        } catch (error) {
          console.error('Erreur API paramètres:', error);
        }
      }

      // Fallback vers les données utilisateur du stockage
      if (user) {
        setSettings(prev => ({
          ...prev,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
        }));
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      Alert.alert('Erreur', 'Impossible de charger les paramètres');
    }
  };

  const checkNotificationPermissions = async () => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      setPushEnabled(hasPermission);
    } catch (error) {
      console.error('Erreur vérification permissions notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserSettings();
    setRefreshing(false);
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // TODO: Implémenter l'appel API pour sauvegarder les paramètres
      // await userService.updateSettings(settings);

      Alert.alert('Succès', 'Paramètres sauvegardés avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const updatePreference = (key: keyof UserSettings['preferences'], value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CANDIDATE_PENDING': return 'Candidaté et en attente';
      case 'NO_RESPONSE': return 'Aucune réponse';
      case 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP': return 'Aucune réponse après 1 relance';
      case 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP': return 'Aucune réponse après 2 relance';
      case 'FIRST_INTERVIEW_PENDING': return '1er entretien en attente';
      case 'OTHER_INTERVIEW_PENDING': return 'Autre entretien en attente';
      case 'ACCEPTED_AFTER_INTERVIEW': return 'Retenue après entretien';
      case 'REJECTED_WITHOUT_INTERVIEW': return 'Non retenue sans entretien';
      case 'REJECTED_AFTER_INTERVIEW': return 'Non retenue après entretien';
      default: return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Section Profil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profil Utilisateur</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Prénom</Text>
          <TextInput
            style={[styles.textInput, !isEditing && styles.disabledInput]}
            value={settings.firstName}
            onChangeText={(text) => setSettings(prev => ({ ...prev, firstName: text }))}
            editable={isEditing}
            placeholder="Votre prénom"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nom</Text>
          <TextInput
            style={[styles.textInput, !isEditing && styles.disabledInput]}
            value={settings.lastName}
            onChangeText={(text) => setSettings(prev => ({ ...prev, lastName: text }))}
            editable={isEditing}
            placeholder="Votre nom"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.textInput, !isEditing && styles.disabledInput]}
            value={settings.email}
            onChangeText={(text) => setSettings(prev => ({ ...prev, email: text }))}
            editable={isEditing}
            placeholder="redacted@example.invalid"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Téléphone</Text>
          <TextInput
            style={[styles.textInput, !isEditing && styles.disabledInput]}
            value={settings.phone}
            onChangeText={(text) => setSettings(prev => ({ ...prev, phone: text }))}
            editable={isEditing}
            placeholder="+33123456789"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Section Synchronisation Offline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Synchronisation</Text>

        <View style={styles.statusItem}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
          {isSyncing && <Text style={styles.syncingText}>🔄 Synchronisation...</Text>}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, !isOnline && styles.disabledButton]}
          onPress={syncNow}
          disabled={!isOnline || isSyncing}
        >
          <Text style={styles.actionButtonText}>
            {isSyncing ? '🔄 Synchronisation...' : '📡 Synchroniser maintenant'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            try {
              const data = await exportData();
              Alert.alert('Export réussi', `Données exportées (${data.length} caractères)`);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'exporter les données');
            }
          }}
        >
          <Text style={styles.actionButtonText}>📤 Exporter les données</Text>
        </TouchableOpacity>
      </View>

      {/* Section Notifications Push */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications Push</Text>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Notifications push activées</Text>
          <Switch
            value={pushEnabled}
            onValueChange={async (value) => {
              if (value) {
                const granted = await notificationService.requestPermissions();
                setPushEnabled(granted);
                if (!granted) {
                  Alert.alert('Permissions refusées', 'Les notifications push nécessitent une autorisation');
                }
              } else {
                setPushEnabled(false);
              }
            }}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Rappels d'entretiens</Text>
          <Switch
            value={settings.notifications.interviewReminders}
            onValueChange={(value) => updateNotification('interviewReminders', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Rappels de relances</Text>
          <Switch
            value={settings.notifications.followUpReminders}
            onValueChange={(value) => updateNotification('followUpReminders', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Échéances de candidatures</Text>
          <Switch
            value={settings.notifications.applicationDeadlines}
            onValueChange={(value) => updateNotification('applicationDeadlines', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        {pushEnabled && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              notificationService.scheduleNotification({
                title: 'Test de notification',
                body: 'Ceci est un test de notification push',
                type: 'system',
              });
            }}
          >
            <Text style={styles.testButtonText}>🔔 Tester la notification</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Notifications par email</Text>
          <Switch
            value={settings.notifications.email}
            onValueChange={(value) => updateNotification('email', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Notifications push</Text>
          <Switch
            value={settings.notifications.push}
            onValueChange={(value) => updateNotification('push', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Rappels d'entretiens</Text>
          <Switch
            value={settings.notifications.interviewReminders}
            onValueChange={(value) => updateNotification('interviewReminders', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Rappels de relances</Text>
          <Switch
            value={settings.notifications.followUpReminders}
            onValueChange={(value) => updateNotification('followUpReminders', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Échéances de candidatures</Text>
          <Switch
            value={settings.notifications.applicationDeadlines}
            onValueChange={(value) => updateNotification('applicationDeadlines', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>
      </View>

      {/* Section Préférences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Préférences</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Statut par défaut des candidatures</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              // TODO: Implémenter un picker pour choisir le statut
              Alert.alert('Sélectionner un statut', '', [
                { text: 'Candidaté et en attente', onPress: () => updatePreference('defaultApplicationStatus', 'CANDIDATE_PENDING') },
                { text: 'Aucune réponse', onPress: () => updatePreference('defaultApplicationStatus', 'NO_RESPONSE') },
              ]);
            }}
          >
            <Text style={styles.pickerText}>
              {getStatusLabel(settings.preferences.defaultApplicationStatus)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Durée par défaut des entretiens (minutes)</Text>
          <TextInput
            style={styles.textInput}
            value={settings.preferences.defaultInterviewDuration.toString()}
            onChangeText={(text) => updatePreference('defaultInterviewDuration', parseInt(text) || 60)}
            keyboardType="numeric"
            placeholder="60"
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Archivage automatique des anciennes candidatures</Text>
          <Switch
            value={settings.preferences.autoArchiveOldApplications}
            onValueChange={(value) => updatePreference('autoArchiveOldApplications', value)}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Thème</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert('Sélectionner un thème', '', [
                { text: 'Clair', onPress: () => updatePreference('theme', 'light') },
                { text: 'Sombre', onPress: () => updatePreference('theme', 'dark') },
                { text: 'Automatique', onPress: () => updatePreference('theme', 'auto') },
              ]);
            }}
          >
            <Text style={styles.pickerText}>
              {settings.preferences.theme === 'light' ? '☀️ Clair' :
               settings.preferences.theme === 'dark' ? '🌙 Sombre' : '🔄 Automatique'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.actionButton, isEditing && styles.saveButton]}
          onPress={() => {
            if (isEditing) {
              saveSettings();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={loading}
        >
          <Text style={[styles.actionButtonText, isEditing && styles.saveButtonText]}>
            {isEditing ? (loading ? 'Sauvegarde...' : '💾 Sauvegarder') : '✏️ Modifier'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => {
              setIsEditing(false);
              fetchUserSettings(); // Restaurer les valeurs originales
            }}
          >
            <Text style={styles.cancelButtonText}>❌ Annuler</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={() => {
            Alert.alert(
              'Déconnexion',
              'Êtes-vous sûr de vouloir vous déconnecter ?',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Déconnexion', style: 'destructive', onPress: () => {
                  // TODO: Implémenter la déconnexion
                  console.log('Déconnexion demandée');
                }},
              ]
            );
          }}
        >
          <Text style={styles.logoutButtonText}>🚪 Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Version de l'app */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>JobbingTrack Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#374151',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationLabel: {
    fontSize: 16,
    color: '#374151',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#6B7280',
  },
  logoutButtonText: {
    color: '#FFFFFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  syncingText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default SettingsScreen;

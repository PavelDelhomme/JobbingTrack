import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { pushNotificationService } from './api';

export interface NotificationData {
  title: string;
  body: string;
  type: 'interview' | 'followup' | 'application' | 'system';
  data?: any;
  scheduled?: boolean;
  date?: Date;
}

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.configure();
  }

  private configure() {
    PushNotification.configure({
      // Configuration pour Android
      onNotification: (notification) => {
        console.log('Notification reçue:', notification);
        // Traiter la notification reçue
        this.handleNotification(notification);
      },

      // Configuration pour iOS
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Créer les canaux de notification pour Android
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  private createNotificationChannels() {
    PushNotification.createChannel(
      {
        channelId: 'interviews',
        channelName: 'Entretiens',
        channelDescription: 'Notifications concernant les entretiens',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Canal entretiens créé: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'followups',
        channelName: 'Relances',
        channelDescription: 'Notifications concernant les relances',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Canal relances créé: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'applications',
        channelName: 'Candidatures',
        channelDescription: 'Notifications concernant les candidatures',
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`Canal candidatures créé: ${created}`)
    );
  }

  private handleNotification(notification: any) {
    // Traiter la notification selon son type
    if (notification.data?.type) {
      switch (notification.data.type) {
        case 'interview':
          this.handleInterviewNotification(notification);
          break;
        case 'followup':
          this.handleFollowUpNotification(notification);
          break;
        case 'application':
          this.handleApplicationNotification(notification);
          break;
      }
    }
  }

  private handleInterviewNotification(notification: any) {
    console.log('Notification entretien:', notification.data);
    // Ici on pourrait déclencher une action spécifique pour les entretiens
  }

  private handleFollowUpNotification(notification: any) {
    console.log('Notification relance:', notification.data);
    // Ici on pourrait déclencher une action spécifique pour les relances
  }

  private handleApplicationNotification(notification: any) {
    console.log('Notification candidature:', notification.data);
    // Ici on pourrait déclencher une action spécifique pour les candidatures
  }

  // Demander les permissions de notification
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const granted = await PushNotification.requestPermissions();
        return granted;
      } else {
        // Pour Android, les permissions sont demandées automatiquement
        return true;
      }
    } catch (error) {
      console.error('Erreur demande permissions notifications:', error);
      return false;
    }
  }

  // Programmer une notification locale
  scheduleNotification(data: NotificationData, delay: number = 0): string {
    const notificationId = `notif_${Date.now()}_${Math.random()}`;

    const notificationData = {
      id: notificationId,
      title: data.title,
      message: data.body,
      userInfo: {
        type: data.type,
        data: data.data,
      },
      channelId: this.getChannelId(data.type),
    };

    if (data.scheduled && data.date) {
      // Notification programmée
      PushNotification.localNotificationSchedule({
        ...notificationData,
        date: data.date,
        allowWhileIdle: true,
      });
    } else {
      // Notification immédiate (avec délai optionnel)
      PushNotification.localNotification({
        ...notificationData,
        playSound: true,
        soundName: 'default',
        ignoreInForeground: false,
      });

      if (delay > 0) {
        setTimeout(() => {
          PushNotification.localNotification(notificationData);
        }, delay);
      }
    }

    return notificationId;
  }

  private getChannelId(type: NotificationData['type']): string {
    switch (type) {
      case 'interview': return 'interviews';
      case 'followup': return 'followups';
      case 'application': return 'applications';
      default: return 'default';
    }
  }

  // Annuler une notification programmée
  cancelNotification(notificationId: string) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  // Annuler toutes les notifications
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  // Obtenir les notifications programmées
  getScheduledNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }

  // Programmer un rappel d'entretien
  scheduleInterviewReminder(interview: any): string {
    const interviewTime = new Date(interview.scheduledAt);
    const now = new Date();
    const timeUntilInterview = interviewTime.getTime() - now.getTime();

    // Programmer un rappel 1 heure avant
    const reminderTime = timeUntilInterview - (60 * 60 * 1000);

    if (reminderTime > 0) {
      const reminderDate = new Date(now.getTime() + reminderTime);

      return this.scheduleNotification({
        title: 'Rappel: Entretien imminent',
        body: `${interview.application.position} chez ${interview.application.company.name}`,
        type: 'interview',
        data: { interviewId: interview.id },
        scheduled: true,
        date: reminderDate,
      });
    }

    return '';
  }

  // Programmer un rappel de relance
  scheduleFollowUpReminder(followUp: any): string {
    const followUpTime = new Date(followUp.scheduledDate);
    const now = new Date();
    const timeUntilFollowUp = followUpTime.getTime() - now.getTime();

    // Programmer un rappel 30 minutes avant
    const reminderTime = timeUntilFollowUp - (30 * 60 * 1000);

    if (reminderTime > 0) {
      const reminderDate = new Date(now.getTime() + reminderTime);

      return this.scheduleNotification({
        title: 'Rappel: Relance à effectuer',
        body: `${followUp.subject} - ${followUp.application.position}`,
        type: 'followup',
        data: { followUpId: followUp.id },
        scheduled: true,
        date: reminderDate,
      });
    }

    return '';
  }

  // Créer une notification pour une candidature mise à jour
  createApplicationNotification(application: any, status: string): string {
    return this.scheduleNotification({
      title: 'Candidature mise à jour',
      body: `${application.position} chez ${application.company.name} - ${status}`,
      type: 'application',
      data: { applicationId: application.id },
    });
  }

  // Créer une notification système
  createSystemNotification(title: string, message: string): string {
    return this.scheduleNotification({
      title,
      body: message,
      type: 'system',
    });
  }
}

// Exporter le service
export const notificationService = NotificationService.getInstance();
export default notificationService;

import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/local_phone_integrations_service.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/push_notification_service.dart';

/// Purge des données utilisateur locales lors d'une **déconnexion volontaire**.
/// Distinct du mode hors-ligne : sans réseau, la session et les files restent.
class UserSessionCleanup {
  UserSessionCleanup._();

  static Future<void> onLogout({String? authToken}) async {
    await PushNotificationService.instance.unregister(authToken: authToken);
    await ApiConfigStore.clearAuthSession();
    await ApiConfigStore.saveKeepLoggedIn(false);
    // Identifiants empreinte conservés : reconnexion rapide après déconnexion volontaire.
    // Suppression via Paramètres ou « Oublier ce compte » sur l'écran login.
    await ApiConfigStore.clearAnalyticsSessionId();
    await AnalyticsTelemetryQueue.instance.clearAll();
    await OfflineBusinessSyncQueue.instance.clearAll();
    await LocalPhoneIntegrationsService.clearLocalCaches();
    await MobileAnalyticsService.instance.onUserLogout();
  }
}

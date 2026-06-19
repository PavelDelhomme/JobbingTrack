/// Types métier affichés dans le centre de notifications (candidatures, relances, entretiens…).
/// Exclut crash, erreurs techniques et notifications système (backoffice uniquement).
const inAppNotificationTypes = <String>{
  'REMINDER',
  'APPLICATION_UPDATE',
  'INTERVIEW_SCHEDULED',
  'FOLLOWUP_DUE',
  'DEADLINE',
  'STATUS_CHANGE',
};

bool isInAppNotificationType(String type) =>
    inAppNotificationTypes.contains(type.toUpperCase());

List<T> filterInAppNotifications<T>(
  Iterable<T> items,
  String Function(T item) typeOf,
) =>
    items.where((item) => isInAppNotificationType(typeOf(item))).toList();

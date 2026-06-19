import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/utils/notification_navigation.dart';

AppNotification _n({String? entityType, String type = 'REMINDER', String entityId = 'id-1'}) {
  return AppNotification(
    id: 'n1',
    title: 't',
    message: 'm',
    type: type,
    read: false,
    entityType: entityType,
    entityId: entityId,
    createdAt: DateTime.now(),
  );
}

void main() {
  test('resolveNotificationEntityKind depuis entityType', () {
    expect(resolveNotificationEntityKind(_n(entityType: 'Application')), NotificationEntityKind.application);
    expect(resolveNotificationEntityKind(_n(entityType: 'Interview')), NotificationEntityKind.interview);
    expect(resolveNotificationEntityKind(_n(entityType: 'FollowUp')), NotificationEntityKind.followUp);
    expect(resolveNotificationEntityKind(_n(entityType: 'Call')), NotificationEntityKind.call);
  });

  test('resolveNotificationEntityKind depuis type si entityType absent', () {
    expect(
      resolveNotificationEntityKind(_n(entityType: null, type: 'STATUS_CHANGE')),
      NotificationEntityKind.application,
    );
    expect(
      resolveNotificationEntityKind(_n(entityType: null, type: 'INTERVIEW_SCHEDULED')),
      NotificationEntityKind.interview,
    );
    expect(
      resolveNotificationEntityKind(_n(entityType: null, type: 'FOLLOWUP_DUE')),
      NotificationEntityKind.followUp,
    );
  });
}

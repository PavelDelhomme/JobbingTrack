import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/utils/in_app_notification_types.dart';

void main() {
  test('isInAppNotificationType accepte les types métier', () {
    expect(isInAppNotificationType('FOLLOWUP_DUE'), isTrue);
    expect(isInAppNotificationType('interview_scheduled'), isTrue);
    expect(isInAppNotificationType('CRASH_REPORT'), isFalse);
    expect(isInAppNotificationType('ERROR_REPORT'), isFalse);
    expect(isInAppNotificationType('SYSTEM'), isFalse);
  });

  test('filterInAppNotifications retire crash et système', () {
    final items = [
      AppNotification(
        id: '1',
        title: 'Relance',
        message: 'm',
        type: 'FOLLOWUP_DUE',
        read: false,
        createdAt: DateTime.now(),
      ),
      AppNotification(
        id: '2',
        title: 'Crash',
        message: 'm',
        type: 'CRASH_REPORT',
        read: false,
        createdAt: DateTime.now(),
      ),
    ];
    final filtered = filterInAppNotifications(items, (n) => n.type);
    expect(filtered, hasLength(1));
    expect(filtered.first.id, '1');
  });
}

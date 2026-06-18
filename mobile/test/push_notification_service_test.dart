import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/push_notification_service.dart';

void main() {
  test('buildDevPushToken est déterministe', () {
    expect(
      PushNotificationService.buildDevPushToken('abc-123'),
      'dev-push-abc-123',
    );
  });
}

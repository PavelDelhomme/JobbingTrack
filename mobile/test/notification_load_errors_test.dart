import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/utils/notification_load_errors.dart';

void main() {
  test('friendlyNotificationLoadError — réseau', () {
    final msg = friendlyNotificationLoadError(
      Exception('Erreur réseau: Connection refused'),
      apiBaseUrl: 'http://127.0.0.1:5002',
    );
    expect(msg, contains('Connexion API impossible'));
    expect(msg, contains('adb reverse'));
  });

  test('friendlyNotificationLoadError — session', () {
    final msg = friendlyNotificationLoadError(
      Exception('Erreur HTTP 401'),
      apiBaseUrl: 'http://127.0.0.1:5002',
    );
    expect(msg, contains('Session expirée'));
  });
}

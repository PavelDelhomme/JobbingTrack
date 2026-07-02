import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_service.dart';

void main() {
  group('AppVersionParts', () {
    test('compare semver + build', () {
      final current = AppVersionParts.parse('1.0.0+1');
      final latest = AppVersionParts.parse('1.0.1+2');
      final min = AppVersionParts.parse('1.0.0+1');

      expect(current.isOlderThan(latest), isTrue);
      expect(current.isOlderThan(min), isFalse);
      expect(latest.isOlderThan(current), isFalse);
    });
  });
}

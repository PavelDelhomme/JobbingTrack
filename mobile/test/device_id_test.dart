import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/utils/device_id.dart';

void main() {
  group('DeviceId', () {
    test('generateUuidV4 produit un UUID v4 valide', () {
      final id = DeviceId.generateUuidV4();
      expect(DeviceId.isUuidV4(id), isTrue);
      expect(id.length, 36);
    });

    test('isUuidV4 rejette les anciens identifiants mob-*', () {
      expect(DeviceId.isUuidV4('mob-1718654321-42'), isFalse);
    });

    test('chaque génération produit un identifiant distinct', () {
      final a = DeviceId.generateUuidV4();
      final b = DeviceId.generateUuidV4();
      expect(a, isNot(equals(b)));
    });
  });
}

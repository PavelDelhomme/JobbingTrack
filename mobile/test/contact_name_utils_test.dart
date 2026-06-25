import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/utils/contact_name_utils.dart';

void main() {
  group('capitalizePersonName', () {
    test('met la première lettre de chaque mot en majuscule', () {
      expect(capitalizePersonName('jean'), 'Jean');
      expect(capitalizePersonName('marie-claire dupont'), 'Marie-claire Dupont');
    });

    test('trim les espaces', () {
      expect(capitalizePersonName('  paul  '), 'Paul');
    });
  });

  group('parsePersonName', () {
    test('nom seul → prénom + nom point', () {
      final r = parsePersonName('Dupont');
      expect(r.firstName, 'Dupont');
      expect(r.lastName, '.');
    });

    test('prénom et nom', () {
      final r = parsePersonName('jean dupont');
      expect(r.firstName, 'Jean');
      expect(r.lastName, 'Dupont');
    });
  });
}

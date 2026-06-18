import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/call.dart';

void main() {
  test('Call.fromJson distingue contact et entreprise seule', () {
    final withContact = Call.fromJson({
      'id': 'c1',
      'applicationId': 'a1',
      'contactId': 'ct1',
      'subject': 'Appel RH',
      'callDate': '2026-06-18T10:00:00.000Z',
      'contact': {'firstName': 'Marie', 'lastName': 'Dupont'},
    });
    expect(withContact.isCompanyOnly, isFalse);
    expect(withContact.targetLabel, 'Marie Dupont');

    final withoutContact = Call.fromJson({
      'id': 'c2',
      'applicationId': 'a1',
      'subject': 'Appel entreprise',
      'callDate': '2026-06-18T11:00:00.000Z',
    });
    expect(withoutContact.isCompanyOnly, isTrue);
    expect(withoutContact.targetLabel, 'Entreprise (sans contact)');
  });
}

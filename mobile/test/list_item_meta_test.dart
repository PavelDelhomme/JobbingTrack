import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';

void main() {
  test('companyListSubtitle inclut compteurs et métadonnées', () {
    final c = Company(
      id: '1',
      name: 'Atos',
      website: 'https://atos.net',
      industry: 'IT',
      size: '',
      location: 'Paris',
      description: '',
      logo: '',
      isActive: true,
      isDeleted: false,
      createdBy: User.fromJson({}),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      applicationsCount: 2,
      contactsCount: 1,
    );
    final s = companyListSubtitle(c);
    expect(s, contains('IT'));
    expect(s, contains('Paris'));
    expect(s, contains('2 candidatures'));
    expect(s, contains('1 contact'));
  });

  test('contactListSubtitle joint entreprise + coords', () {
    final s = contactListSubtitle({
      'firstName': 'Marie',
      'lastName': 'Dupont',
      'email': 'marie@ex.com',
      'phone': '0600000000',
      'companies': [
        {
          'company': {'name': 'Capgemini'},
        },
      ],
    });
    expect(s, contains('Capgemini'));
    expect(s, contains('marie@ex.com'));
    expect(s, contains('0600000000'));
  });

  test('FollowUp/Interview/Call parsent poste + entreprise imbriqués', () {
    final nested = {
      'id': 'x1',
      'applicationId': 'a1',
      'followUpDate': '2026-07-29T10:00:00.000Z',
      'status': 'PENDING',
      'application': {
        'position': 'DevOps',
        'company': {'name': 'OVHcloud'},
      },
    };
    final f = FollowUp.fromJson(nested);
    expect(f.applicationPosition, 'DevOps');
    expect(f.companyName, 'OVHcloud');

    final i = Interview.fromJson({
      'id': 'i1',
      'applicationId': 'a1',
      'interviewDate': '2026-07-29T10:00:00.000Z',
      'location': 'Visio',
      'application': {
        'position': 'DevOps',
        'company': {'name': 'OVHcloud'},
      },
    });
    expect(i.applicationPosition, 'DevOps');
    expect(i.companyName, 'OVHcloud');

    final call = Call.fromJson({
      'id': 'c1',
      'applicationId': 'a1',
      'subject': 'Appel RH',
      'callDate': '2026-07-29T10:00:00.000Z',
      'contactId': 'ct1',
      'contact': {'firstName': 'Luc', 'lastName': 'Petit'},
      'application': {
        'position': 'DevOps',
        'company': {'name': 'OVHcloud'},
      },
    });
    expect(call.applicationPosition, 'DevOps');
    expect(call.companyName, 'OVHcloud');
    expect(call.targetLabel, 'Luc Petit');
  });

  test('linkedOfferCompanyLine assemble poste · entreprise', () {
    final line = linkedOfferCompanyLine(
      applicationId: 'a1',
      position: 'DevOps',
      companyName: 'OVHcloud',
    );
    expect(line, 'DevOps · OVHcloud');
  });
}

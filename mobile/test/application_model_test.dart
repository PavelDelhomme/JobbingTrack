import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/application.dart';

void main() {
  test('Application.fromJson parse liste API (companyId + status objet)', () {
    final app = Application.fromJson({
      'id': 'app1',
      'companyId': 'cmp1',
      'position': 'DevOps Engineer',
      'applicationDate': '2026-05-12T22:25:48.234Z',
      'status': {
        'code': 'NO_RESPONSE',
        'name': 'Aucune réponse',
      },
      'createdAt': '2026-05-12T22:25:48.234Z',
      'updatedAt': '2026-05-12T22:25:48.234Z',
    });
    expect(app.position, 'DevOps Engineer');
    expect(app.company.id, 'cmp1');
    expect(app.status, 'NO_RESPONSE');
  });

  test('Application.fromJson parse company embarquée', () {
    final app = Application.fromJson({
      'id': 'app2',
      'position': 'Backend',
      'company': {'id': 'c2', 'name': 'Airbnb'},
      'status': {'code': 'SENT'},
      'applicationDate': '2026-01-01T00:00:00.000Z',
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-01T00:00:00.000Z',
    });
    expect(app.company.name, 'Airbnb');
    expect(app.status, 'SENT');
  });
}

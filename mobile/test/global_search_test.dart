import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/services/global_search.dart';

User _user() => User.fromJson({});

Application _app({required String position, String company = 'Acme'}) {
  return Application(
    id: '1',
    position: position,
    description: '',
    company: Company(
      id: 'c1',
      name: company,
      website: '',
      industry: '',
      size: '',
      location: '',
      description: '',
      logo: '',
      isActive: true,
      isDeleted: false,
      createdBy: _user(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    status: 'SENT',
    priority: 'MEDIUM',
    appliedDate: DateTime(2026, 6, 10),
    location: 'Paris',
    salary: '',
    notes: '',
    tags: const [],
    createdBy: _user(),
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('fr_FR');
  });

  test('recherche globale trouve une candidature par poste', () {
    final hits = searchGlobal(
      query: 'flutter',
      applications: [_app(position: 'Dev Flutter')],
    );
    expect(hits.length, 1);
    expect(hits.first.category, GlobalSearchCategory.application);
    expect(hits.first.title, contains('Flutter'));
  });

  test('recherche globale trouve par entreprise', () {
    final hits = searchGlobal(
      query: 'acme',
      applications: [_app(position: 'Chef de projet', company: 'Acme Corp')],
    );
    expect(hits.length, 1);
    expect(hits.first.subtitle, contains('Acme'));
  });

  test('filtre catégorie limite les résultats', () {
    final hits = searchGlobal(
      query: 'test',
      category: GlobalSearchCategory.company,
      applications: [_app(position: 'Test job')],
      companies: [
        Company(
          id: 'co',
          name: 'Test SA',
          website: '',
          industry: '',
          size: '',
          location: '',
          description: '',
          logo: '',
          isActive: true,
          isDeleted: false,
          createdBy: _user(),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      ],
    );
    expect(hits.every((h) => h.category == GlobalSearchCategory.company), isTrue);
  });
}

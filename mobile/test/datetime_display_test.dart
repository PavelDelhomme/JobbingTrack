import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('fr_FR');
  });

  final ref = DateTime(2026, 6, 17, 15, 30);

  test('aujourd\'hui affiche l\'heure', () {
    final dt = DateTime(2026, 6, 17, 9, 45);
    expect(formatSmartPostulationDate(dt, reference: ref), 'Aujourd\'hui, 09:45');
  });

  test('hier affiche l\'heure', () {
    final dt = DateTime(2026, 6, 16, 14, 10);
    expect(formatSmartPostulationDate(dt, reference: ref), 'Hier, 14:10');
  });

  test('même année sans année explicite', () {
    final dt = DateTime(2026, 3, 5);
    expect(formatSmartPostulationDate(dt, reference: ref), contains('5'));
    expect(formatSmartPostulationDate(dt, reference: ref), isNot(contains('2026')));
  });

  test('autre année inclut l\'année', () {
    final dt = DateTime(2024, 12, 1);
    expect(formatSmartPostulationDate(dt, reference: ref), contains('2024'));
  });
}

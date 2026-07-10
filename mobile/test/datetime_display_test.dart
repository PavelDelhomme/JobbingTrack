import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('fr_FR');
  });

  // Référence porteur : vendredi 10/07/2026 à 19h10
  final ref = DateTime(2026, 7, 10, 19, 10);

  test('moins de 24 h — heure seule (hier soir)', () {
    final dt = DateTime(2026, 7, 9, 22, 53);
    expect(formatSmartPostulationDate(dt, reference: ref), '22h53');
  });

  test('moins de 24 h — heure seule (ce matin)', () {
    final dt = DateTime(2026, 7, 10, 8, 27);
    expect(formatSmartPostulationDate(dt, reference: ref), '08h27');
  });

  test('même mois, plus de 24 h — jour abrégé + heure', () {
    final dt = DateTime(2026, 7, 8, 19, 2);
    expect(formatSmartPostulationDate(dt, reference: ref), 'mer. 8, 19h02');
  });

  test('même mois — jeu. 2', () {
    final dt = DateTime(2026, 7, 2, 19, 6);
    expect(formatSmartPostulationDate(dt, reference: ref), 'jeu. 2, 19h06');
  });

  test('autre mois, moins de 30 j — jour + mois + heure', () {
    final dt = DateTime(2026, 6, 22, 14, 48);
    expect(formatSmartPostulationDate(dt, reference: ref), 'lun. 22 Juin, 14h48');
  });

  test('même année, plus de 30 j — jour mois + heure', () {
    final dt = DateTime(2026, 6, 9, 17, 33);
    expect(formatSmartPostulationDate(dt, reference: ref), '9 Juin, 17h33');
  });

  test('autre année — date courte seule', () {
    final dt = DateTime(2025, 12, 1, 11, 9);
    expect(formatSmartPostulationDate(dt, reference: ref), '01/12/2025');
  });

  test('formatSmartEventDate délègue à formatSmartPostulationDate', () {
    final dt = DateTime(2026, 7, 10, 8, 27);
    expect(formatSmartEventDate(dt, reference: ref), formatSmartPostulationDate(dt, reference: ref));
  });
}

import 'package:intl/date_symbol_data_local.dart';

/// Initialise les formats de date français (évite LocaleDataException sur Relances, etc.).
Future<void> initAppLocale() async {
  await initializeDateFormatting('fr_FR', null);
}

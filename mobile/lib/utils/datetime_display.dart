import 'package:intl/intl.dart';

/// Affiche une date/heure stockée côté API (ISO, en pratique UTC) dans le **fuseau local** de l’appareil.
/// À utiliser pour les listes, logs et détails lus depuis le backend.
String formatUserLocalDateTime(
  String? iso, {
  String pattern = "dd/MM/yyyy HH:mm",
  String locale = 'fr_FR',
}) {
  if (iso == null || iso.isEmpty) return '—';
  try {
    final dt = DateTime.parse(iso).toLocal();
    return DateFormat(pattern, locale).format(dt);
  } catch (_) {
    return '—';
  }
}

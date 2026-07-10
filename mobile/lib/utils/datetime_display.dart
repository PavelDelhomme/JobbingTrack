import 'package:intl/intl.dart';

/// Affiche une date/heure stockée côté API (ISO, en pratique UTC) dans le **fuseau local** de l'appareil.
String formatUserLocalDateTime(
  String? iso, {
  String pattern = 'dd/MM/yyyy HH:mm',
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

String _formatHourMinute(DateTime dt) {
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
  return '${h}h$m';
}

String _weekdayShort(DateTime dt) {
  final raw = DateFormat('EEE', 'fr_FR').format(dt).toLowerCase();
  final trimmed = raw.replaceAll('.', '').trim();
  return '$trimmed.';
}

String _monthName(DateTime dt) {
  final raw = DateFormat('MMMM', 'fr_FR').format(dt);
  if (raw.isEmpty) return raw;
  return '${raw[0].toUpperCase()}${raw.substring(1)}';
}

/// Date/heure relative lisible (candidatures, relances, entretiens, appels, événements).
///
/// Règles (référence = maintenant, fuseau local) :
/// - **< 24 h** : `22h53`
/// - **≥ 24 h, même mois** : `mer. 8, 19h02`
/// - **≥ 24 h, autre mois mais < 30 j** : `lun. 22 Juin, 14h48`
/// - **≥ 30 j, même année** : `9 Juin, 17h33`
/// - **autre année** : `01/12/2025`
String formatSmartPostulationDate(DateTime dateTime, {DateTime? reference}) {
  final dt = dateTime.toLocal();
  final now = (reference ?? DateTime.now()).toLocal();

  final elapsed = now.difference(dt);
  final until = dt.difference(now);
  final within24h = elapsed.inHours >= 0 && elapsed.inHours < 24 ||
      (dt.isAfter(now) && until.inHours < 24);
  if (within24h) {
    return _formatHourMinute(dt);
  }

  if (dt.year != now.year) {
    return DateFormat('dd/MM/yyyy', 'fr_FR').format(dt);
  }

  final daysAgo = elapsed.inDays;
  if (daysAgo >= 30) {
    return '${dt.day} ${_monthName(dt)}, ${_formatHourMinute(dt)}';
  }

  if (dt.month != now.month) {
    return '${_weekdayShort(dt)} ${dt.day} ${_monthName(dt)}, ${_formatHourMinute(dt)}';
  }

  return '${_weekdayShort(dt)} ${dt.day}, ${_formatHourMinute(dt)}';
}

String formatSmartEventDate(DateTime dateTime, {DateTime? reference}) {
  return formatSmartPostulationDate(dateTime, reference: reference);
}

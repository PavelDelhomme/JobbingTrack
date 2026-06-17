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

/// Date de postulation lisible sur les cartes candidatures.
/// — Aujourd'hui / hier : avec l'heure
/// — Cette semaine : « mar. 17 »
/// — Même année : « 17 juin » (sans année)
/// — Autre année : « 17 juin 2024 »
String formatSmartPostulationDate(DateTime dateTime, {DateTime? reference}) {
  final dt = dateTime.toLocal();
  final now = (reference ?? DateTime.now()).toLocal();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(dt.year, dt.month, dt.day);
  final dayDiff = target.difference(today).inDays;

  if (dayDiff == 0) {
    return "Aujourd'hui, ${DateFormat('HH:mm', 'fr_FR').format(dt)}";
  }
  if (dayDiff == -1) {
    return "Hier, ${DateFormat('HH:mm', 'fr_FR').format(dt)}";
  }
  if (dayDiff > -7 && dayDiff < 0) {
    final raw = DateFormat('EEE d', 'fr_FR').format(dt);
    return raw.replaceAll(RegExp(r'\s+'), ' ').trim();
  }
  if (dt.year == now.year) {
    return DateFormat('d MMM', 'fr_FR').format(dt);
  }
  return DateFormat('d MMM y', 'fr_FR').format(dt);
}

String formatSmartEventDate(DateTime dateTime, {DateTime? reference}) {
  return formatSmartPostulationDate(dateTime, reference: reference);
}

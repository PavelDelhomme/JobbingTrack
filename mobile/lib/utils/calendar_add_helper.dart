import 'package:url_launcher/url_launcher.dart';

/// Ouvre Google Calendar (TEMPLATE) pour ajouter un entretien confirmé — style Gmail.
Future<bool> openGoogleCalendarTemplate({
  required String title,
  required DateTime start,
  DateTime? end,
  String? description,
  String? location,
  String? inviteLink,
}) async {
  final endAt = end ?? start.add(const Duration(hours: 1));
  String fmt(DateTime d) {
    final u = d.toUtc();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${u.year}${two(u.month)}${two(u.day)}T${two(u.hour)}${two(u.minute)}${two(u.second)}Z';
  }

  final details = [
    if (description != null && description.trim().isNotEmpty) description.trim(),
    if (inviteLink != null && inviteLink.trim().isNotEmpty) 'Invitation : $inviteLink',
  ].join('\n\n');

  final uri = Uri.https('calendar.google.com', '/calendar/render', {
    'action': 'TEMPLATE',
    'text': title,
    'dates': '${fmt(start)}/${fmt(endAt)}',
    if (details.isNotEmpty) 'details': details,
    if (location != null && location.trim().isNotEmpty) 'location': location.trim(),
  });

  if (!await canLaunchUrl(uri)) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}

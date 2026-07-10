import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

/// Statuts modifiables manuellement par l'utilisateur (pas les statuts calculés par relances/délais).
const kManualApplicationStatusCodes = [
  'REJECTED_WITHOUT_INTERVIEW',
  'REJECTED_AFTER_INTERVIEW',
  'REJECTED',
  'WITHDRAWN',
  'ACCEPTED_AFTER_INTERVIEW',
  'OFFER_RECEIVED',
];

/// Codes statuts candidature (réf. docs/database/STRUCTURE_ACTUELLE.md + seed-status-tables.sql).
const kApplicationStatusCodes = [
  'CANDIDATE_PENDING',
  'NO_RESPONSE',
  'RELANCED_PENDING',
  'AWAITING_INTERVIEW',
  'INTERVIEW_SOON',
  'NO_RESPONSE_AFTER_FIRST_FOLLOWUP',
  'NO_RESPONSE_AFTER_SECOND_FOLLOWUP',
  'FIRST_INTERVIEW_PENDING',
  'OTHER_INTERVIEW_PENDING',
  'TECHNICAL_TEST_PENDING',
  'OFFER_RECEIVED',
  'ACCEPTED_AFTER_INTERVIEW',
  'REJECTED_WITHOUT_INTERVIEW',
  'REJECTED_AFTER_INTERVIEW',
  'WITHDRAWN',
];

String applicationStatusLabel(String status) {
  switch (status) {
    case 'CANDIDATE_PENDING':
      return 'Candidaté et en attente';
    case 'NO_RESPONSE':
      return 'À relancer';
    case 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP':
    case 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP':
    case 'NO_RESPONSE_AFTER_FOLLOWUP':
      return 'Pas de réponse après relance';
    case 'RELANCED_PENDING':
      return 'Relancée — à relancer';
    case 'FIRST_INTERVIEW_PENDING':
    case 'INTERVIEW_PENDING':
    case 'AWAITING_INTERVIEW':
      return 'Entretien à venir';
    case 'OTHER_INTERVIEW_PENDING':
      return 'Autre entretien en attente';
    case 'INTERVIEW_SOON':
      return 'Entretien imminent';
    case 'TECHNICAL_TEST_PENDING':
      return 'Test technique en cours';
    case 'OFFER_RECEIVED':
      return 'Offre reçue';
    case 'ACCEPTED_AFTER_INTERVIEW':
    case 'ACCEPTED':
      return 'Retenue';
    case 'REJECTED_WITHOUT_INTERVIEW':
    case 'NO_RESPONSE_NO_INTERVIEW':
      return 'Non retenue (sans entretien)';
    case 'REJECTED_AFTER_INTERVIEW':
    case 'REJECTED':
      return 'Refusée';
    case 'WITHDRAWN':
      return 'Candidature retirée';
    case 'INTERVIEW_DONE':
    case 'POST_INTERVIEW_FEEDBACK':
      return 'Entretien passé — retour en attente';
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW':
      return 'Entretien programmé';
    case 'SENT':
    case 'APPLIED':
      return 'Envoyée';
    case 'IN_PROGRESS':
      return 'En cours';
    default:
      if (status.isEmpty) return '—';
      return status.replaceAll('_', ' ').toLowerCase();
  }
}

Color applicationStatusColor(String status) {
  if (status.contains('ACCEPTED') || status == 'OFFER_RECEIVED') return Colors.teal;
  if (status.contains('REJECTED') || status.contains('NO_RESPONSE')) return Colors.red;
  if (status.contains('INTERVIEW') || status.contains('PENDING')) return Colors.purple;
  if (status == 'WITHDRAWN') return Colors.grey;
  if (status == 'CANDIDATE_PENDING') return Colors.blue;
  return Colors.grey;
}

Future<String?> showApplicationStatusPicker(BuildContext context, {String? current, bool manualOnly = true}) {
  final codes = manualOnly ? kManualApplicationStatusCodes : kApplicationStatusCodes;
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: ListView(
        shrinkWrap: true,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              manualOnly ? 'Indiquer le résultat' : 'Changer le statut',
              style: Theme.of(ctx).textTheme.titleMedium,
            ),
          ),
          if (manualOnly)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Les statuts « à relancer » ou « entretien » se mettent à jour automatiquement quand vous ajoutez une relance ou un entretien.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ),
          if (current != null && current.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Actuel : ${applicationStatusLabel(current)}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ),
          ...codes.map((code) {
            final selected = code == current;
            return ListTile(
              leading: Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: selected ? Theme.of(ctx).colorScheme.primary : null,
              ),
              title: Text(applicationStatusLabel(code)),
              onTap: () => Navigator.pop(ctx, code),
            );
          }),
        ],
      ),
    ),
  );
}

String followUpStatusLabel(String status) {
  switch (status) {
    case 'PENDING':
      return 'À faire';
    case 'COMPLETED':
      return 'Terminée';
    case 'CANCELLED':
      return 'Annulée';
    default:
      return status;
  }
}

/// Canal extrait des notes `[Canal: Email]` (formulaire relance).
String followUpChannelFromNotes(String? notes) {
  final match = RegExp(r'\[Canal:\s*([^\]]+)\]').firstMatch(notes ?? '');
  return match?.group(1)?.trim() ?? '';
}

/// Notes sans la ligne canal (affichage liste).
String followUpNotesWithoutChannel(String? notes) {
  if (notes == null || notes.isEmpty) return '';
  return notes
      .split('\n')
      .where((line) => !line.trim().startsWith('[Canal:'))
      .join('\n')
      .trim();
}

/// Titre liste relance : date + canal.
String followUpListTitle(FollowUp followUp) {
  final channel = followUpChannelFromNotes(followUp.notes);
  final dateLabel = formatSmartEventDate(followUp.scheduledDate);
  if (channel.isNotEmpty) return '$dateLabel · $channel';
  return dateLabel;
}

String contactDisplayName(Map<String, dynamic> contact) {
  final fn = (contact['firstName'] ?? '').toString().trim();
  final ln = (contact['lastName'] ?? '').toString().trim();
  if (ln == '.' || ln == '—') return fn;
  if (fn == '.' || fn == '—') return ln;
  final name = '$fn $ln'.trim();
  if (name.isNotEmpty) return name;
  final email = contact['email']?.toString();
  if (email != null && email.isNotEmpty) return email;
  return 'Contact';
}

/// Libellé entreprise principal d'un contact (liste / carte).
String contactPrimaryCompanyName(Map<String, dynamic> contact) {
  final companies = contact['companies'];
  if (companies is List && companies.isNotEmpty) {
    for (final entry in companies) {
      if (entry is Map) {
        final nested = entry['company'];
        if (nested is Map) {
          final name = nested['name']?.toString().trim() ?? '';
          if (name.isNotEmpty) return name;
        }
        final name = entry['name']?.toString().trim() ?? '';
        if (name.isNotEmpty) return name;
      }
    }
  }
  final direct = contact['company'];
  if (direct is Map) {
    final name = direct['name']?.toString().trim() ?? '';
    if (name.isNotEmpty) return name;
  }
  return contact['companyName']?.toString().trim() ?? '';
}

String applicationListTitle(Application app) {
  final position = app.position.trim();
  if (position.isNotEmpty) return position;
  if (app.company.name.trim().isNotEmpty) return app.company.name.trim();
  return 'Candidature';
}

String? applicationListSubtitle(Application app) {
  final position = app.position.trim();
  final company = app.company.name.trim();
  if (position.isNotEmpty && company.isNotEmpty) return company;
  return null;
}

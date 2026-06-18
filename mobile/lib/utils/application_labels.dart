import 'package:flutter/material.dart';

/// Codes statuts candidature (réf. docs/database/STRUCTURE_ACTUELLE.md).
const kApplicationStatusCodes = [
  'CANDIDATE_PENDING',
  'NO_RESPONSE',
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
      return 'Candidaté';
    case 'NO_RESPONSE':
      return 'Aucune réponse';
    case 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP':
      return 'Pas de réponse (1 relance)';
    case 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP':
      return 'Pas de réponse (2 relances)';
    case 'FIRST_INTERVIEW_PENDING':
    case 'INTERVIEW_PENDING':
    case 'AWAITING_INTERVIEW':
      return '1er entretien en attente';
    case 'OTHER_INTERVIEW_PENDING':
    case 'INTERVIEW_SOON':
      return 'Autre entretien en attente';
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
      return 'Non retenue (après entretien)';
    case 'WITHDRAWN':
      return 'Candidature retirée';
    case 'RELANCED_PENDING':
      return 'Relancé — en attente';
    case 'INTERVIEW_DONE':
    case 'POST_INTERVIEW_FEEDBACK':
      return 'Entretien passé — retour en attente';
    case 'NO_RESPONSE_AFTER_FOLLOWUP':
      return 'Pas de réponse après relance';
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

Future<String?> showApplicationStatusPicker(BuildContext context, {String? current}) {
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: ListView(
        shrinkWrap: true,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text('Changer le statut', style: Theme.of(ctx).textTheme.titleMedium),
          ),
          if (current != null && current.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Actuel : ${applicationStatusLabel(current)}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ),
          ...kApplicationStatusCodes.map((code) {
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

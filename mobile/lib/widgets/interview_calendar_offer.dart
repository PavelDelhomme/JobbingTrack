import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/utils/calendar_add_helper.dart';
import 'package:jobbingtrack_mobile/utils/meeting_place_policy.dart';

/// Après validation d’une date d’entretien : propose d’ajouter à Google Agenda.
Future<void> offerAddInterviewToCalendar(
  BuildContext context, {
  required Interview interview,
  String? notesExtra,
}) async {
  final modality = MeetingPlacePolicy.detectModality(
    location: interview.location,
    videoLink: interview.videoLink,
    text: interview.notes,
  );
  final isBilan = MeetingPlacePolicy.isBilanDeCompetences(interview.notes);
  final title = isBilan
      ? 'Bilan de compétences${interview.companyName != null ? ' — ${interview.companyName}' : ''}'
      : 'Entretien${interview.companyName != null ? ' — ${interview.companyName}' : ''}'
          '${interview.applicationPosition != null ? ' (${interview.applicationPosition})' : ''}';

  final modalityLabel = MeetingPlacePolicy.modalityLabelFr(modality);
  final locationForCal = modality == MeetingModality.visio
      ? (interview.videoLink ?? interview.location)
      : interview.location;

  final details = [
    'Format : $modalityLabel',
    if (isBilan) 'Type : bilan de compétences (pas un entretien d’embauche classique).',
    if (interview.videoLink != null && interview.videoLink!.isNotEmpty)
      'Visio : ${interview.videoLink}',
    if (notesExtra != null && notesExtra.trim().isNotEmpty) notesExtra.trim(),
    if (interview.notes != null && interview.notes!.trim().isNotEmpty) interview.notes!.trim(),
  ].join('\n');

  if (!context.mounted) return;
  final go = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Ajouter à l’agenda ?'),
      content: Text(
        'Date confirmée le ${interview.interviewDate.day.toString().padLeft(2, '0')}/'
        '${interview.interviewDate.month.toString().padLeft(2, '0')}/'
        '${interview.interviewDate.year}.\n\n'
        '$modalityLabel'
        '${locationForCal != null && locationForCal.isNotEmpty ? '\n$locationForCal' : ''}'
        '\n\nOuvrir Google Agenda pour créer l’événement (comme depuis Gmail) ?',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Plus tard')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ajouter')),
      ],
    ),
  );
  if (go != true || !context.mounted) return;

  final ok = await openGoogleCalendarTemplate(
    title: title,
    start: interview.interviewDate,
    end: interview.interviewDate.add(
      Duration(minutes: interview.estimatedDuration ?? 60),
    ),
    description: details,
    location: locationForCal,
    inviteLink: interview.videoLink,
  );
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(ok ? 'Agenda ouvert — vérifiez puis enregistrez.' : 'Impossible d’ouvrir l’agenda'),
    ),
  );
}

/// Recalcule le format Présentiel/Distanciel/Hybride quand le lieu ou la visio change.
void applyLocationAutoStyle({
  required String location,
  required String videoLink,
  required void Function(String style) setStyle,
}) {
  final modality = MeetingPlacePolicy.detectModality(
    location: location,
    videoLink: videoLink,
  );
  if (modality == MeetingModality.inconnu) return;
  setStyle(MeetingPlacePolicy.styleForForm(modality));
}

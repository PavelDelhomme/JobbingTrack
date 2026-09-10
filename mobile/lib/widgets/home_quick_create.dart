import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/widgets/contact_create_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/followup_create_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/call_create_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/interview_create_sheet.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

enum HomeQuickCreateAction { application, contact, followUp, interview, call }

Future<HomeQuickCreateAction?> showHomeQuickCreateSheet(BuildContext context) {
  return showModalBottomSheet<HomeQuickCreateAction>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      final soft = ctx.softPrimary;
      final accent = ctx.cs.primary;
      return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: CircleAvatar(
              backgroundColor: soft,
              child: Icon(Icons.assignment_outlined, color: accent),
            ),
            title: const Text('Nouvelle candidature'),
            subtitle: const Text('Poste, entreprise, statut…'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.application),
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: soft,
              child: Icon(Icons.person_add_outlined, color: accent),
            ),
            title: const Text('Nouveau contact'),
            subtitle: const Text('Nom + entreprise (nouvelle ou existante)'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.contact),
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: soft,
              child: Icon(Icons.schedule_send_outlined, color: accent),
            ),
            title: const Text('Nouvelle relance'),
            subtitle: const Text('Choisir une candidature puis planifier'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.followUp),
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: soft,
              child: Icon(Icons.event_available_outlined, color: accent),
            ),
            title: const Text('Nouvel entretien'),
            subtitle: const Text('Date, lieu / visio, contacts'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.interview),
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: soft,
              child: Icon(Icons.phone_outlined, color: accent),
            ),
            title: const Text('Nouvel appel'),
            subtitle: const Text('Objet + candidature liée'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.call),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
    },
  );
}

Future<bool> handleHomeQuickCreate(BuildContext context) async {
  final action = await showHomeQuickCreateSheet(context);
  if (action == null || !context.mounted) return false;
  switch (action) {
    case HomeQuickCreateAction.application:
      final result = await ApplicationFormScreen.showCreateSheet(context);
      return result == true;
    case HomeQuickCreateAction.contact:
      final created = await showCreateContactSheet(context);
      if (created != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Contact créé')),
        );
        return true;
      }
      return false;
    case HomeQuickCreateAction.followUp:
      final created = await showCreateFollowUpSheet(context);
      return created != null;
    case HomeQuickCreateAction.interview:
      return showCreateInterviewSheet(context);
    case HomeQuickCreateAction.call:
      final created = await showCreateCallSheet(context);
      return created != null;
  }
}

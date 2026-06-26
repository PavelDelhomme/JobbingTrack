import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/widgets/contact_create_sheet.dart';

enum HomeQuickCreateAction { application, contact }

Future<HomeQuickCreateAction?> showHomeQuickCreateSheet(BuildContext context) {
  return showModalBottomSheet<HomeQuickCreateAction>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue.shade100,
              child: Icon(Icons.assignment_outlined, color: Colors.blue.shade800),
            ),
            title: const Text('Nouvelle candidature'),
            subtitle: const Text('Poste, entreprise, statut…'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.application),
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.green.shade100,
              child: Icon(Icons.person_add_outlined, color: Colors.green.shade800),
            ),
            title: const Text('Nouveau contact'),
            subtitle: const Text('Nom + entreprise (nouvelle ou existante)'),
            onTap: () => Navigator.pop(ctx, HomeQuickCreateAction.contact),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
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
  }
}

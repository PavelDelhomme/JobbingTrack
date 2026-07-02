import 'package:flutter/material.dart';

Future<bool> _confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
      ],
    ),
  );
  return confirmed == true;
}

/// Confirmation dialogue avant action admin sensible (sans biométrie — évite les blocages empreinte).
Future<bool> confirmSensitiveAdminAction(
  BuildContext context, {
  required String title,
  required String message,
}) async {
  if (!context.mounted) return false;
  return _confirmDialog(context, title: title, message: message);
}

import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/biometric_auth_service.dart';

/// Confirmation biométrique avant action admin sensible (rôle, suppression, etc.).
Future<bool> confirmSensitiveAdminAction(
  BuildContext context, {
  required String title,
  required String message,
}) async {
  final bioAvailable = await BiometricAuthService.isAvailable();
  if (bioAvailable) {
    final result = await BiometricAuthService.authenticate(
      reason: message,
      biometricOnly: false,
    );
    if (result.success) return true;
    if (!context.mounted) return false;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Authentification annulée ou refusée')),
    );
    return false;
  }

  if (!context.mounted) return false;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text('$message\n\n(Biométrie indisponible — confirmation manuelle)'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
      ],
    ),
  );
  return confirmed == true;
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';

/// Déconnexion volontaire : purge locale + navigation login (sans fermer l'app).
class AuthLogout {
  AuthLogout._();

  static Future<void> confirmAndPerform(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text(
          'Vous serez déconnecté et les données locales de session seront effacées. '
          'Le mode hors-ligne (sans internet) reste actif tant que vous restez connecté.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    await perform(context);
  }

  static Future<void> perform(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.logout();
    if (!context.mounted) return;
    _clearProviderCaches(context);
    if (!context.mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  static void _clearProviderCaches(BuildContext context) {
    context.read<ApplicationProvider>().clearUserCache();
    context.read<CompanyProvider>().clearUserCache();
    context.read<ContactProvider>().clearUserCache();
    context.read<InterviewProvider>().clearUserCache();
    context.read<FollowUpProvider>().clearUserCache();
    context.read<NotificationProvider>().clearUserCache();
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
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
    final dialogContext = _providerContext(context);
    if (dialogContext == null) return;

    final confirm = await showDialog<bool>(
      context: dialogContext,
      useRootNavigator: true,
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
    if (confirm != true) return;
    await perform();
  }

  static Future<void> perform() async {
    final beforeLogout = appNavigatorKey.currentContext;
    if (beforeLogout == null) return;

    final auth = Provider.of<AuthProvider>(beforeLogout, listen: false);
    await auth.logout();
    _navigateToLogin();

    final providerContext = appNavigatorKey.currentContext;
    if (providerContext != null && providerContext.mounted) {
      _clearProviderCaches(providerContext);
    }
  }

  static BuildContext? _providerContext(BuildContext context) {
    return appNavigatorKey.currentContext ?? (context.mounted ? context : null);
  }

  static void _navigateToLogin() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      appNavigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false);
    });
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

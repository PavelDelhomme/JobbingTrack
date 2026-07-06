import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

/// Gestion session impersonnalisation (sortie admin). Pas de bannière persistante — drawer uniquement.
class ImpersonationBanner extends StatelessWidget {
  final Widget? child;

  const ImpersonationBanner({super.key, required this.child});

  static Future<void> exitAndRestoreAdminSession(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isImpersonating) return;
    final returnRoute = auth.impersonationReturnRoute;
    await auth.exitImpersonation();
    final nav = appNavigatorKey.currentState;
    if (nav == null) return;
    nav.pushNamedAndRemoveUntil(returnRoute, (route) => false);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session administrateur restaurée — liste utilisateurs')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return child ?? const SizedBox.shrink();
  }
}

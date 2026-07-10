import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

/// Bannière persistante + sortie impersonnalisation (session admin requise en amont).
class ImpersonationBanner extends StatelessWidget {
  final Widget? child;

  const ImpersonationBanner({super.key, required this.child});

  static Future<void> exitAndRestoreAdminSession(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isImpersonating) return;
    await auth.exitImpersonation();
    final nav = appNavigatorKey.currentState;
    if (nav == null) return;
    // Shell principal + hub admin : drawer et barre basse restent accessibles.
    nav.pushNamedAndRemoveUntil('/home', (route) => false);
    nav.pushNamed('/admin');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session administrateur restaurée — hub admin')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final content = child ?? const SizedBox.shrink();

    if (!auth.isImpersonating) {
      return content;
    }

    final targetEmail = auth.user?.email ?? '';
    final adminEmail = auth.impersonatorEmail ?? 'administrateur';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          elevation: 4,
          color: Colors.orange.shade100,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Icon(Icons.switch_account, color: Colors.orange.shade900),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Impersonnalisation — $targetEmail',
                          style: TextStyle(
                            color: Colors.orange.shade900,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          'Admin : $adminEmail — touchez Désimpersonnaliser pour revenir',
                          style: TextStyle(
                            color: Colors.orange.shade900.withValues(alpha: 0.85),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => exitAndRestoreAdminSession(context),
                    child: Text(
                      'Désimpersonnaliser',
                      style: TextStyle(
                        color: Colors.orange.shade900,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(child: content),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

/// Bannière persistante pendant l'impersonnalisation admin (tous les écrans).
class ImpersonationBanner extends StatelessWidget {
  final Widget? child;

  const ImpersonationBanner({super.key, required this.child});

  static double topInset(BuildContext context, {required bool visible}) {
    if (!visible) return 0;
    return MediaQuery.paddingOf(context).top + 52;
  }

  static Future<void> exitAndRestoreAdminSession(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isImpersonating) return;
    await auth.exitImpersonation();
    final nav = appNavigatorKey.currentState;
    if (nav == null) return;
    nav.pushNamedAndRemoveUntil('/admin', (route) => route.isFirst);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session administrateur restaurée')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = this.child;
    if (child == null) return const SizedBox.shrink();

    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (!auth.isImpersonating) return child;

        final email = auth.user?.email ?? '';
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Padding(
              padding: EdgeInsets.only(
                top: ImpersonationBanner.topInset(context, visible: true),
              ),
              child: child,
            ),
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: Material(
                elevation: 8,
                color: Colors.orange.shade100,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(
                      children: [
                        Icon(Icons.switch_account, color: Colors.orange.shade900, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Impersonnalisation — $email',
                            style: TextStyle(
                              color: Colors.orange.shade900,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        TextButton(
                          onPressed: () => exitAndRestoreAdminSession(context),
                          child: const Text('Désimpersonnaliser'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

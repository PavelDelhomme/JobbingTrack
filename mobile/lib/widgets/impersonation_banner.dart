import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

/// Bannière compacte + sortie impersonnalisation (session admin requise en amont).
class ImpersonationBanner extends StatelessWidget {
  final Widget? child;

  const ImpersonationBanner({super.key, required this.child});

  static Future<void> exitAndRestoreAdminSession(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isImpersonating) return;
    await auth.exitImpersonation();
    final nav = appNavigatorKey.currentState;
    if (nav == null) return;
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          elevation: 2,
          color: Colors.orange.shade100,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              child: Row(
                children: [
                  Icon(Icons.switch_account, size: 18, color: Colors.orange.shade900),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      targetEmail,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.orange.shade900,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Désimpersonnaliser',
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    onPressed: () => exitAndRestoreAdminSession(context),
                    icon: Icon(Icons.switch_account, color: Colors.orange.shade900, size: 22),
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

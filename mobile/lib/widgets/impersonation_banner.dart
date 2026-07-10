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
    rootScaffoldMessengerKey.currentState?.showSnackBar(
      const SnackBar(content: Text('Session administrateur restaurée — hub admin')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final content = child ?? const SizedBox.shrink();

    if (!auth.isImpersonating) {
      return content;
    }

    final targetEmail = auth.user?.email ?? '';
    final bannerTopInset = MediaQuery.paddingOf(context).top + 36;

    // Stack (pas Column+Expanded) : le builder MaterialApp n'a pas encore d'Overlay —
    // évite « No Overlay widget found » sur IconButton / SnackBar.
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(
          padding: EdgeInsets.only(top: bannerTopInset),
          child: content,
        ),
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: Material(
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
                    Semantics(
                      label: 'Désimpersonnaliser',
                      button: true,
                      child: IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                        onPressed: () => exitAndRestoreAdminSession(context),
                        icon: Icon(Icons.switch_account, color: Colors.orange.shade900, size: 22),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

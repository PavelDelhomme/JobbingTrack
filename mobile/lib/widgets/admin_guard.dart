import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';

/// Bloque l'accès aux écrans admin si l'utilisateur n'est pas autorisé.
class AdminGuard extends StatelessWidget {
  final Widget child;

  const AdminGuard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    if (!AdminAccess.canAccessAdmin(user)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accès refusé')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.lock_outline, size: 64, color: Colors.grey.shade500),
                const SizedBox(height: 16),
                const Text(
                  'Cette section est réservée aux comptes administrateur autorisés.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: const Text('Retour'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return child;
  }
}

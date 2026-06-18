import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/global_search.dart';

/// Menu ⋮ : recherche, paramètres, déconnexion (logout retiré de l'app bar accueil).
class ShellAppBarMenu extends StatelessWidget {
  const ShellAppBarMenu({super.key});

  Future<void> _confirmLogout(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
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
    await auth.logout();
    if (!context.mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Menu',
      onSelected: (value) async {
        switch (value) {
          case 'search':
            openGlobalSearch(context);
          case 'settings':
            Navigator.of(context).pushNamed('/settings');
          case 'logout':
            await _confirmLogout(context);
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'search',
          child: Material(
            color: Colors.transparent,
            child: ListTile(
              leading: const Icon(Icons.search),
              title: const Text('Recherche globale'),
              contentPadding: EdgeInsets.zero,
            ),
          ),
        ),
        PopupMenuItem(
          value: 'settings',
          child: Material(
            color: Colors.transparent,
            child: ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Paramètres'),
              contentPadding: EdgeInsets.zero,
            ),
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'logout',
          child: Material(
            color: Colors.transparent,
            child: ListTile(
              leading: Icon(Icons.logout, color: Colors.red.shade700),
              title: Text('Déconnexion', style: TextStyle(color: Colors.red.shade700)),
              contentPadding: EdgeInsets.zero,
            ),
          ),
        ),
      ],
    );
  }
}

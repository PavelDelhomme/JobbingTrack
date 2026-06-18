import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/global_search.dart';
import 'package:jobbingtrack_mobile/utils/auth_logout.dart';

/// Menu ⋮ : recherche, paramètres, déconnexion (logout retiré de l'app bar accueil).
class ShellAppBarMenu extends StatelessWidget {
  const ShellAppBarMenu({super.key});

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
            await AuthLogout.confirmAndPerform(context);
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

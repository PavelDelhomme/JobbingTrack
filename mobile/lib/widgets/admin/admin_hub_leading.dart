import 'package:flutter/material.dart';

/// Navigation cohérente entre écrans admin (hub, utilisateurs, analytics…).
class AdminHubNavigation {
  static void openHub(BuildContext context) {
    final nav = Navigator.of(context);
    if (nav.canPop()) {
      var foundAdmin = false;
      nav.popUntil((route) {
        if (route.settings.name == '/admin') {
          foundAdmin = true;
          return true;
        }
        return route.isFirst;
      });
      if (!foundAdmin) {
        nav.pushNamed('/admin');
      }
      return;
    }
    nav.pushNamedAndRemoveUntil('/home', (route) => false);
    nav.pushNamed('/admin');
  }

  static void openMainApp(BuildContext context) {
    Navigator.of(context).pushNamedAndRemoveUntil('/home', (route) => false);
  }
}

/// Bouton retour hub admin ou retour standard si la pile le permet.
class AdminHubLeading extends StatelessWidget {
  const AdminHubLeading({super.key});

  @override
  Widget build(BuildContext context) {
    if (Navigator.of(context).canPop()) {
      return const BackButton();
    }
    return IconButton(
      icon: const Icon(Icons.admin_panel_settings_outlined),
      tooltip: 'Hub administration',
      onPressed: () => AdminHubNavigation.openHub(context),
    );
  }
}

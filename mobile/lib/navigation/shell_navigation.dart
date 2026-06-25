import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/main_shell_screen.dart';

/// Onglet shell courant (barre basse) — lu par le drawer pour le retour « page précédente ».
class ShellTabRegistry {
  static int currentTab = 0;
  static int currentApplicationsSubTab = 0;

  static void setCurrentTab(int tab, {int? applicationsSubTab}) {
    currentTab = tab.clamp(0, 3);
    if (applicationsSubTab != null) {
      currentApplicationsSubTab = applicationsSubTab.clamp(0, 4);
    }
  }
}

/// Arguments pour ouvrir le shell principal sur un onglet précis.
class MainShellArgs {
  final int initialTab;
  final int applicationsTabIndex;
  final String? applicationStatusFilter;
  /// Onglet shell à restaurer au bouton retour système (ex. Profil → Calendrier drawer).
  final int? returnTabOnBack;

  const MainShellArgs({
    this.initialTab = 0,
    this.applicationsTabIndex = 0,
    this.applicationStatusFilter,
    this.returnTabOnBack,
  });
}

/// Navigation cohérente avec la barre basse (4 onglets).
class ShellNavigation {
  static const _shellRoutes = <String, MainShellArgs>{
    '/home': MainShellArgs(initialTab: 0),
    '/applications': MainShellArgs(initialTab: 1, applicationsTabIndex: 0),
    '/companies': MainShellArgs(initialTab: 1, applicationsTabIndex: 1),
    '/contacts': MainShellArgs(initialTab: 1, applicationsTabIndex: 2),
    '/interviews': MainShellArgs(initialTab: 1, applicationsTabIndex: 3),
    '/followups': MainShellArgs(initialTab: 1, applicationsTabIndex: 4),
    '/events': MainShellArgs(initialTab: 2),
    '/profile': MainShellArgs(initialTab: 3),
  };

  static MainShellArgs? argsForRoute(String route) => _shellRoutes[route];

  static Widget buildShell(BuildContext context, {MainShellArgs? fallback}) {
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is MainShellArgs) {
      return MainShellScreen(
        initialTab: args.initialTab,
        applicationsTabIndex: args.applicationsTabIndex,
        applicationStatusFilter: args.applicationStatusFilter,
        returnTabOnBack: args.returnTabOnBack,
      );
    }
    final fb = fallback ?? const MainShellArgs();
    return MainShellScreen(
      initialTab: fb.initialTab,
      applicationsTabIndex: fb.applicationsTabIndex,
      applicationStatusFilter: fb.applicationStatusFilter,
      returnTabOnBack: fb.returnTabOnBack,
    );
  }

  /// Depuis le drawer : bascule l'onglet shell au lieu d'empiler un écran sans barre basse.
  static void navigateFromDrawer(BuildContext context, String route) {
    Navigator.of(context).pop(); // fermer le drawer

    final shellArgs = _shellRoutes[route];
    if (shellArgs != null) {
      final currentTab = ShellTabRegistry.currentTab;
      final targetTab = shellArgs.initialTab;
      final enriched = MainShellArgs(
        initialTab: shellArgs.initialTab,
        applicationsTabIndex: shellArgs.applicationsTabIndex,
        applicationStatusFilter: shellArgs.applicationStatusFilter,
        returnTabOnBack:
            currentTab != targetTab ? currentTab : null,
      );
      Navigator.of(context).pushNamedAndRemoveUntil(
        '/home',
        (r) => r.isFirst,
        arguments: enriched,
      );
      return;
    }

    final current = ModalRoute.of(context)?.settings.name;
    if (current == route) return;
    Navigator.of(context).pushNamed(route);
  }
}

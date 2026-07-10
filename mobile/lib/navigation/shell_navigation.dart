import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/main_shell_screen.dart';

/// Onglet shell courant (barre basse) — lu par le drawer pour le retour « page précédente ».
class ShellTabRegistry {
  static int currentTab = 0;
  static int currentApplicationsSubTab = 0;
  static final ValueNotifier<int> revision = ValueNotifier(0);

  static void setCurrentTab(int tab, {int? applicationsSubTab}) {
    currentTab = tab.clamp(0, 3);
    if (applicationsSubTab != null) {
      currentApplicationsSubTab = applicationsSubTab.clamp(0, 5);
    }
    revision.value++;
  }
}

/// Sous-onglets Candidatures (Entreprises, Contacts, …) — retour vers liste principale.
class ApplicationsSubTabRegistry {
  static VoidCallback? _goToFirstSubTab;
  static int currentIndex = 0;

  static void registerGoToFirstSubTab(VoidCallback? callback) {
    _goToFirstSubTab = callback;
  }

  static void setCurrentIndex(int index) {
    currentIndex = index.clamp(0, 5);
  }

  static void goToFirstSubTab() {
    _goToFirstSubTab?.call();
  }
}

/// Ferme les drawers des onglets shell encore montés (IndexedStack).
class ShellDrawerRegistry {
  static final Set<GlobalKey<ScaffoldState>> _keys = {};

  static void register(GlobalKey<ScaffoldState> key) {
    _keys.add(key);
  }

  static void unregister(GlobalKey<ScaffoldState> key) {
    _keys.remove(key);
  }

  static void closeAllDrawers() {
    for (final key in _keys.toList()) {
      final state = key.currentState;
      if (state?.isDrawerOpen == true) {
        state!.closeDrawer();
      }
    }
  }

  /// Ferme le premier drawer ouvert ; retourne true si un drawer a été fermé.
  static bool closeAnyOpenDrawer() {
    for (final key in _keys.toList()) {
      final state = key.currentState;
      if (state?.isDrawerOpen == true) {
        state!.closeDrawer();
        return true;
      }
    }
    return false;
  }
}

/// Délègue le retour système au [MainShellScreen] quand un onglet shell consomme déjà le PopScope.
class ShellBackRegistry {
  static VoidCallback? _handler;

  static void registerSystemBackHandler(VoidCallback? handler) {
    _handler = handler;
  }

  static void invokeSystemBack() {
    _handler?.call();
  }
}

/// Bascule d’onglet shell sans recréer la route (préserve retour barre basse).
class ShellNavigationRegistry {
  static void Function(MainShellArgs args)? _apply;

  static void registerApplyHandler(void Function(MainShellArgs args)? handler) {
    _apply = handler;
  }

  static bool applyInPlace(MainShellArgs args) {
    if (_apply == null) return false;
    _apply!(args);
    return true;
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
    '/calls': MainShellArgs(initialTab: 1, applicationsTabIndex: 5),
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
      final targetSubTab = shellArgs.applicationsTabIndex;

      if (targetTab == currentTab &&
          targetTab == 1 &&
          targetSubTab == ShellTabRegistry.currentApplicationsSubTab) {
        return;
      }

      int? returnTab;
      if (targetTab != currentTab) {
        returnTab = currentTab;
      }

      final enriched = MainShellArgs(
        initialTab: shellArgs.initialTab,
        applicationsTabIndex: shellArgs.applicationsTabIndex,
        applicationStatusFilter: shellArgs.applicationStatusFilter,
        returnTabOnBack: returnTab,
      );

      final routeName = ModalRoute.of(context)?.settings.name;
      if (routeName == '/home' && ShellNavigationRegistry.applyInPlace(enriched)) {
        return;
      }

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

  /// Indique si une entrée drawer correspond à l’onglet / sous-onglet shell actif.
  static bool isDrawerRouteSelected(String route) {
    final shellArgs = _shellRoutes[route];
    if (shellArgs == null) return false;
    if (shellArgs.initialTab != ShellTabRegistry.currentTab) return false;
    if (shellArgs.initialTab == 1) {
      return shellArgs.applicationsTabIndex == ShellTabRegistry.currentApplicationsSubTab;
    }
    return true;
  }
}

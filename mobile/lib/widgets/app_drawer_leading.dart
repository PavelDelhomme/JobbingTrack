import 'package:flutter/material.dart';

/// Bouton menu drawer explicite — évite l'état « sélectionné / enfoncé » permanent
/// du [DrawerButton] Material 3 (drawer ouvert en arrière-plan via IndexedStack).
class AppDrawerLeadingButton extends StatelessWidget {
  const AppDrawerLeadingButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: true,
      selected: false,
      checked: false,
      label: 'Menu',
      child: IconButton(
        icon: const Icon(Icons.menu),
        tooltip: 'Menu',
        onPressed: () {
          final scaffold = Scaffold.maybeOf(context);
          if (scaffold?.hasDrawer ?? false) {
            if (scaffold!.isDrawerOpen) {
              scaffold.closeDrawer();
            } else {
              scaffold.openDrawer();
            }
          }
        },
        style: IconButton.styleFrom(
          foregroundColor: Theme.of(context).appBarTheme.foregroundColor ??
              Theme.of(context).colorScheme.onSurface,
          backgroundColor: Colors.transparent,
          overlayColor: Colors.transparent,
          splashFactory: NoSplash.splashFactory,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
        ),
      ),
    );
  }
}

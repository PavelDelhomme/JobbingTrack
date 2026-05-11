import 'package:flutter/material.dart';

/// Enveloppe le body d'un Scaffold avec drawer pour que la touche Back :
/// - ferme le drawer s'il est ouvert (au lieu de quitter l'app),
/// - revienne à l'écran précédent si la pile le permet,
/// - ne fasse rien si on est à la racine (évite de fermer l'app par erreur dans les parcours).
class DrawerBackScope extends StatelessWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;
  final Widget child;

  const DrawerBackScope({
    super.key,
    required this.scaffoldKey,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) {
        if (didPop) return;
        final state = scaffoldKey.currentState;
        if (state?.isDrawerOpen == true) {
          state!.closeDrawer();
          return;
        }
        if (Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
      },
      child: child,
    );
  }
}

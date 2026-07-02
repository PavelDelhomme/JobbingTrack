import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';

/// Enveloppe le body d'un Scaffold avec drawer pour que la touche Back :
/// - ferme le drawer s'il est ouvert (au lieu de quitter l'app),
/// - revienne à l'écran précédent si la pile le permet,
/// - sinon délègue au shell (onglet précédent ou double retour Accueil → arrière-plan).
class DrawerBackScope extends StatefulWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;
  final Widget child;

  const DrawerBackScope({
    super.key,
    required this.scaffoldKey,
    required this.child,
  });

  @override
  State<DrawerBackScope> createState() => _DrawerBackScopeState();
}

class _DrawerBackScopeState extends State<DrawerBackScope> {
  @override
  void initState() {
    super.initState();
    ShellDrawerRegistry.register(widget.scaffoldKey);
  }

  @override
  void dispose() {
    ShellDrawerRegistry.unregister(widget.scaffoldKey);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) {
        if (didPop) return;
        final state = widget.scaffoldKey.currentState;
        if (state?.isDrawerOpen == true) {
          state!.closeDrawer();
          return;
        }
        if (Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
          return;
        }
        ShellBackRegistry.handleBack();
      },
      child: widget.child,
    );
  }
}

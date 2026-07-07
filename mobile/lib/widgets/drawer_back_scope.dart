import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';

/// Enveloppe le body d'un Scaffold avec drawer pour que la touche Back :
/// - ferme le drawer s'il est ouvert (au lieu de quitter l'app),
/// - revienne à l'écran précédent si la pile Navigator le permet,
/// - sinon laisse le [MainShellScreen] gérer le retour shell (via son PopScope).
///
/// [active] : false pour les onglets shell invisibles (IndexedStack) — évite
/// plusieurs PopScope qui interceptent le retour système en parallèle.
class DrawerBackScope extends StatefulWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;
  final Widget child;
  final bool active;

  const DrawerBackScope({
    super.key,
    required this.scaffoldKey,
    required this.child,
    this.active = true,
  });

  @override
  State<DrawerBackScope> createState() => _DrawerBackScopeState();
}

class _DrawerBackScopeState extends State<DrawerBackScope> {
  @override
  void initState() {
    super.initState();
    if (widget.active) {
      ShellDrawerRegistry.register(widget.scaffoldKey);
    }
  }

  @override
  void didUpdateWidget(DrawerBackScope oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      if (oldWidget.active) ShellDrawerRegistry.unregister(widget.scaffoldKey);
      if (widget.active) ShellDrawerRegistry.register(widget.scaffoldKey);
    }
  }

  @override
  void dispose() {
    if (widget.active) {
      ShellDrawerRegistry.unregister(widget.scaffoldKey);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) return widget.child;

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
        ShellBackRegistry.invokeSystemBack();
      },
      child: widget.child,
    );
  }
}

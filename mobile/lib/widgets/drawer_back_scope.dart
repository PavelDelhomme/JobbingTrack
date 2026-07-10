import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';

/// Enregistre le [ScaffoldState] pour fermeture drawer au retour shell.
///
/// Le retour système est géré **uniquement** par [MainShellScreen] (un seul PopScope)
/// afin d'éviter un double traitement (ex. Calendrier → Profil → Accueil en un seul geste).
///
/// [active] : false pour les onglets shell invisibles (IndexedStack).
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
  Widget build(BuildContext context) => widget.child;
}

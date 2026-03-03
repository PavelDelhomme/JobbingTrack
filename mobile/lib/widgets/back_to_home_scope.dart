import 'package:flutter/material.dart';

/// Enveloppe un écran ouvert depuis le drawer pour que la touche Back
/// (ou le bouton retour de l'AppBar) ramène à l'accueil au lieu d'un seul pop.
/// Utilisé sur Corbeille, Paramètres, Statistiques, Profil, Logs, etc.
class BackToHomeScope extends StatelessWidget {
  final Widget child;

  const BackToHomeScope({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) {
        if (didPop) return;
        final navigator = Navigator.of(context);
        if (navigator.canPop()) {
          navigator.popUntil((Route<dynamic> route) =>
              route.settings.name == '/home' || route.isFirst);
        }
      },
      child: child,
    );
  }
}

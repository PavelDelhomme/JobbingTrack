import 'package:flutter/material.dart';

/// Hauteur approximative de la barre de navigation du [MainShellScreen].
const double kShellBottomNavHeight = 56;

/// Fraction du décalage FAB au-dessus de la bottom bar (1 = ancien comportement, trop haut).
const double kShellFabBottomLiftFactor = 0.25;

/// Espace à réserver au-dessus de la barre de navigation basse du shell.
double shellBottomExtra(BuildContext context) {
  return kShellBottomNavHeight + MediaQuery.paddingOf(context).bottom;
}

/// Décalage vertical du FAB au-dessus de la barre basse du shell.
double shellFabBottomLift(BuildContext context) {
  return shellBottomExtra(context) * kShellFabBottomLiftFactor;
}

/// FAB / contenu flottant au-dessus de la bottom bar du shell.
Widget shellFabPadding(BuildContext context, {required Widget child}) {
  return Padding(
    padding: EdgeInsets.only(bottom: shellFabBottomLift(context)),
    child: child,
  );
}

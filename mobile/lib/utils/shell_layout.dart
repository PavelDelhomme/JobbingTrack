import 'package:flutter/material.dart';

/// Hauteur approximative de la barre de navigation du [MainShellScreen].
const double kShellBottomNavHeight = 56;

/// Espace à réserver au-dessus de la barre de navigation basse du shell.
double shellBottomExtra(BuildContext context) {
  return kShellBottomNavHeight + MediaQuery.paddingOf(context).bottom;
}

/// FAB / contenu flottant au-dessus de la bottom bar du shell.
Widget shellFabPadding(BuildContext context, {required Widget child}) {
  return Padding(
    padding: EdgeInsets.only(bottom: shellBottomExtra(context)),
    child: child,
  );
}

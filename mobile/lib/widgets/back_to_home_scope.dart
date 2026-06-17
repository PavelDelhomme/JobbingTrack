import 'package:flutter/material.dart';

/// Ancien wrapper « retour accueil » — comportement normal : un pop = page précédente.
class BackToHomeScope extends StatelessWidget {
  final Widget child;

  const BackToHomeScope({super.key, required this.child});

  @override
  Widget build(BuildContext context) => child;
}

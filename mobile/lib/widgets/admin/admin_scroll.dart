import 'package:flutter/material.dart';

/// Padding bas pour listes admin — évite le chevauchement avec la barre système.
EdgeInsets adminScrollPadding(BuildContext context, {EdgeInsets base = EdgeInsets.zero}) {
  final bottom = MediaQuery.paddingOf(context).bottom + 24;
  return base.copyWith(bottom: base.bottom + bottom);
}

/// Colonne admin avec SafeArea bas (hors AppBar).
class AdminSafeBody extends StatelessWidget {
  final Widget child;

  const AdminSafeBody({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return SafeArea(top: false, bottom: true, child: child);
  }
}

import 'package:flutter/material.dart';

/// Padding bas de listes : barre système Android (gestes) + marge confort.
EdgeInsets scrollSafePadding(BuildContext context, {double horizontal = 16, double top = 16, double extraBottom = 16}) {
  final bottomInset = MediaQuery.paddingOf(context).bottom;
  return EdgeInsets.fromLTRB(horizontal, top, horizontal, top + bottomInset + extraBottom);
}

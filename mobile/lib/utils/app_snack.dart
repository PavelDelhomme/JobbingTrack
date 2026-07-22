import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';

/// Snackbars courtes, file vidée avant affichage (évite barres collées + messages perdus).
abstract final class AppSnack {
  static const Duration defaultDuration = Duration(seconds: 2);

  static ScaffoldMessengerState? get _messenger =>
      rootScaffoldMessengerKey.currentState;

  static void clear() {
    _messenger?.clearSnackBars();
  }

  static void show(
    String message, {
    Duration duration = defaultDuration,
    Color? backgroundColor,
    SnackBarAction? action,
    BuildContext? context,
  }) {
    final messenger = _messenger ??
        (context != null && context.mounted
            ? ScaffoldMessenger.maybeOf(context)
            : null);
    if (messenger == null) return;

    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        behavior: SnackBarBehavior.floating,
        backgroundColor: backgroundColor,
        // Action optionnelle : durée toujours forcée (sinon Material 3 peut
        // garder la barre jusqu’à dismiss manuel et bloquer la file).
        action: action,
        dismissDirection: DismissDirection.down,
      ),
    );
  }

  static void success(String message, {BuildContext? context}) =>
      show(message, backgroundColor: Colors.green.shade700, context: context);

  static void error(String message, {BuildContext? context}) =>
      show(
        message,
        backgroundColor: Colors.red.shade700,
        duration: const Duration(seconds: 3),
        context: context,
      );

  static void info(String message, {BuildContext? context}) =>
      show(message, context: context);
}

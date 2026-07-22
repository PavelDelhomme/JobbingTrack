import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';

abstract class AppSnackbar {
  static void show(
    BuildContext context,
    String message, {
    bool success = false,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: success ? AppColors.green : AppColors.primaryDark,
      ),
    );
  }

  static void info(BuildContext context, String message) =>
      show(context, message);

  static void success(BuildContext context, String message) =>
      show(context, message, success: true);
}

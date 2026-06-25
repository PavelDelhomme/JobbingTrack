import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/app_permissions_service.dart';

/// Navigation post-auth : permissions obligatoires puis destination.
class PostAuthNavigation {
  PostAuthNavigation._();

  static Future<void> go(
    BuildContext context,
    String route, {
    bool skipPermissionsCheck = false,
  }) async {
    if (!skipPermissionsCheck) {
      final permsOk = await AppPermissionsService.instance.areRequiredPermissionsGranted();
      if (!context.mounted) return;
      if (!permsOk) {
        Navigator.of(context).pushReplacementNamed(
          '/permissions-gate',
          arguments: route,
        );
        return;
      }
    }
    if (!context.mounted) return;
    Navigator.of(context).pushReplacementNamed(route);
  }
}

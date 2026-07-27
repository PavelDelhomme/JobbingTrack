import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';

/// FAB JobbingTrack — wrapper Material avec sémantique produit.
class AppFab extends StatelessWidget {
  const AppFab({
    super.key,
    required this.onPressed,
    required this.tooltip,
    this.icon = Icons.add,
    this.label,
  });

  final VoidCallback? onPressed;
  final String tooltip;
  final IconData icon;
  final String? label;

  @override
  Widget build(BuildContext context) {
    if (label != null && label!.isNotEmpty) {
      return FloatingActionButton.extended(
        onPressed: onPressed,
        tooltip: tooltip,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: Icon(icon),
        label: Text(label!),
      );
    }
    return FloatingActionButton(
      onPressed: onPressed,
      tooltip: tooltip,
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      child: Icon(icon),
    );
  }
}

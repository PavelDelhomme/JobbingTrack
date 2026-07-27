import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';

class ActionTile extends StatelessWidget {
  const ActionTile({
    super.key,
    required this.label,
    required this.color,
    required this.onTap,
    this.emoji,
    this.icon,
  }) : assert(emoji != null || icon != null);

  final String label;
  final Color color;
  final VoidCallback onTap;
  final String? emoji;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
      elevation: 2,
      shadowColor: color.withValues(alpha: 0.35),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (emoji != null)
                Text(emoji!, style: const TextStyle(fontSize: 32))
              else
                Icon(icon, size: 32, color: Colors.white),
              const SizedBox(height: AppSpacing.sm),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

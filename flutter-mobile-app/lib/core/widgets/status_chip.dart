import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  factory StatusChip.fromApplicationStatus(String status) {
    switch (status) {
      case 'INTERVIEW_SCHEDULED':
        return const StatusChip(label: 'Entretien programmé', color: AppColors.green);
      case 'SENT':
        return const StatusChip(label: 'Envoyée', color: AppColors.primary);
      case 'REJECTED':
        return const StatusChip(label: 'Refusée', color: AppColors.red);
      default:
        return StatusChip(
          label: status.replaceAll('_', ' ').toLowerCase(),
          color: AppColors.textSecondary,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}

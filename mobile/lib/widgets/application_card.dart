import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

/// Carte candidature : tap → détail, swipe droite → archiver, swipe gauche → corbeille.
class ApplicationCard extends StatelessWidget {
  final Application application;
  final VoidCallback onTap;
  final Future<bool> Function(DismissDirection direction) onDismiss;

  const ApplicationCard({
    super.key,
    required this.application,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = applicationStatusColor(application.status);
    final statusText = applicationStatusLabel(application.status);
    final dateLabel = formatSmartPostulationDate(application.appliedDate);

    return Dismissible(
      key: ValueKey(application.id),
      direction: DismissDirection.horizontal,
      confirmDismiss: onDismiss,
      background: _swipeBackground(
        alignment: Alignment.centerLeft,
        color: Colors.amber.shade700,
        icon: Icons.archive_outlined,
        label: 'Archiver',
      ),
      secondaryBackground: _swipeBackground(
        alignment: Alignment.centerRight,
        color: Colors.red.shade600,
        icon: Icons.delete_outline,
        label: 'Corbeille',
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        elevation: 0,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.purple.shade50,
                      child: Icon(Icons.business, size: 20, color: Colors.purple.shade700),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            application.company.name.isNotEmpty
                                ? application.company.name
                                : 'Entreprise non renseignée',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.purple.shade800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            application.position,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: statusColor.withValues(alpha: 0.35)),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.event, size: 16, color: Colors.grey.shade500),
                    const SizedBox(width: 6),
                    Text(
                      'Postulé · $dateLabel',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                    const Spacer(),
                    Icon(Icons.chevron_right, color: Colors.grey.shade400),
                  ],
                ),
                if (application.location.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.place_outlined, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          application.location,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _swipeBackground({
    required Alignment alignment,
    required Color color,
    required IconData icon,
    required String label,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (alignment == Alignment.centerLeft) ...[
            Icon(icon, color: Colors.white),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ] else ...[
            Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            const SizedBox(width: 8),
            Icon(icon, color: Colors.white),
          ],
        ],
      ),
    );
  }
}

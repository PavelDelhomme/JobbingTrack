import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/entity_swipe_confirm.dart';
import 'package:jobbingtrack_mobile/widgets/list_item_swipe_actions.dart';

/// Carte candidature : tap → détail ; swipe droite → archiver ; swipe gauche → modifier + corbeille.
class ApplicationCard extends StatelessWidget {
  final Application application;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final Future<void> Function() onArchive;
  final Future<void> Function() onTrash;

  const ApplicationCard({
    super.key,
    required this.application,
    required this.onTap,
    required this.onEdit,
    required this.onArchive,
    required this.onTrash,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = applicationStatusColor(application.status);
    final statusText = applicationStatusLabel(application.status);
    final dateLabel = formatSmartPostulationDate(application.appliedDate);
    final title = applicationListTitle(application);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ListItemSwipeActions(
        itemKey: ValueKey(application.id),
        startActions: [
          SwipeListAction(
            icon: Icons.archive_outlined,
            label: 'Archiver',
            color: Colors.amber.shade700,
            onPressed: () async {
              if (!await confirmArchiveEntity(
                context,
                title: 'Archiver la candidature ?',
                message: '« $title » sera retirée de la liste active.',
              )) {
                return;
              }
              await onArchive();
            },
          ),
        ],
        endActions: [
          SwipeListAction(
            icon: Icons.edit_outlined,
            label: 'Modifier',
            color: Colors.blue.shade600,
            onPressed: onEdit,
          ),
          SwipeListAction(
            icon: Icons.delete_outline,
            label: 'Corbeille',
            color: Colors.red.shade600,
            onPressed: () async {
              if (!await confirmTrashEntity(
                context,
                title: 'Supprimer la candidature ?',
                message: '« $title » sera déplacée vers la corbeille.',
              )) {
                return;
              }
              await onTrash();
            },
          ),
        ],
        child: InkWell(
          onTap: onTap,
          child: Container(
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
                            title,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade900,
                            ),
                          ),
                          if (applicationListSubtitle(application) != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              applicationListSubtitle(application)!,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.purple.shade800,
                              ),
                            ),
                          ],
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
}

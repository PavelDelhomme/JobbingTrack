import 'package:flutter/material.dart';

/// Bandeau discret quand les données affichées proviennent du cache local.
class OfflineModeBanner extends StatelessWidget {
  const OfflineModeBanner({
    super.key,
    this.pendingSyncCount = 0,
    this.onRetry,
  });

  final int pendingSyncCount;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final syncLabel = pendingSyncCount > 0
        ? ' · $pendingSyncCount modification(s) en attente de sync'
        : '';
    return Material(
      color: cs.tertiaryContainer,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(Icons.cloud_off, size: 18, color: cs.onTertiaryContainer),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Mode hors ligne — données en cache$syncLabel',
                style: TextStyle(fontSize: 13, color: cs.onTertiaryContainer),
              ),
            ),
            if (onRetry != null)
              TextButton(
                onPressed: onRetry,
                child: Text('Réessayer', style: TextStyle(color: cs.onTertiaryContainer)),
              ),
          ],
        ),
      ),
    );
  }
}

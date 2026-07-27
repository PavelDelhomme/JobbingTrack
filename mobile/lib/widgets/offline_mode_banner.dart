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
    final syncLabel = pendingSyncCount > 0
        ? ' · $pendingSyncCount modification(s) en attente de sync'
        : '';
    return Material(
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(Icons.cloud_off, size: 18, color: Colors.orange.shade800),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Mode hors ligne — données en cache$syncLabel',
                style: TextStyle(fontSize: 13, color: Colors.orange.shade900),
              ),
            ),
            if (onRetry != null)
              TextButton(
                onPressed: onRetry,
                child: const Text('Réessayer'),
              ),
          ],
        ),
      ),
    );
  }
}

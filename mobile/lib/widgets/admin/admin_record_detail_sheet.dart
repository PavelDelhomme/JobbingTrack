import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/utils/user_friendly_error.dart';

/// Fiche détail admin — champs structurés, pas de JSON brut pour l'utilisateur mobile.
void showAdminRecordDetailSheet(
  BuildContext context, {
  required String title,
  required Map<String, dynamic> data,
  bool adminContext = true,
  List<Widget>? actions,
}) {
  final fields = _buildFields(data, adminContext: adminContext);
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      builder: (_, scroll) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).padding.bottom),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(title, style: Theme.of(ctx).textTheme.titleMedium),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.all(16),
                children: [
                  for (final f in fields) _DetailRow(label: f.$1, value: f.$2),
                  if (actions != null && actions.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    ...actions,
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          SelectableText(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

List<(String, String)> _buildFields(Map<String, dynamic> data, {required bool adminContext}) {
  final out = <(String, String)>[];

  void add(String label, dynamic v, {bool friendly = false}) {
    if (v == null) return;
    final raw = v.toString().trim();
    if (raw.isEmpty) return;
    out.add((label, friendly ? userFriendlyError(raw, adminContext: adminContext) : raw));
  }

  add('Horodatage', _formatTs(data['timestamp'] ?? data['createdAt']));
  add('Type', data['errorName'] ?? data['crashType'] ?? data['eventName'] ?? data['metricName']);
  add('Catégorie', data['category'] ?? data['eventType'] ?? data['metricType']);
  add('Message', data['errorMessage'] ?? data['message'], friendly: true);
  add('Page / écran', data['page'] ?? data['screenName'] ?? data['screen']);
  add('Gravité', data['severity']);
  if (data.containsKey('resolved')) {
    add('Statut', data['resolved'] == true ? 'Traité' : 'Ouvert');
  }
  add('Plateforme', data['platform']);
  add('Version app', data['appVersion']);
  add('Appareil', data['device'] ?? data['deviceModel'] ?? _sessionField(data, 'deviceModel'));
  add('OS', data['osVersion'] ?? _sessionField(data, 'osVersion'));
  add('Utilisateur', data['userId']?.toString());
  add('Session', data['sessionId']?.toString());
  add('Durée (ms)', data['duration'] ?? data['durationMs'] ?? data['networkLatency']);
  add('CPU app (%)', data['cpuUsage']);
  add('Mémoire app', data['memoryUsage']);
  add('Endpoint', data['properties'] is Map ? (data['properties'] as Map)['endpoint'] : null);

  return out;
}

String? _sessionField(Map<String, dynamic> data, String key) {
  final session = data['session'];
  if (session is Map) return session[key]?.toString();
  return null;
}

String _formatTs(dynamic t) {
  if (t == null) return '';
  return DateTime.tryParse(t.toString())?.toLocal().toString().substring(0, 19) ?? t.toString();
}

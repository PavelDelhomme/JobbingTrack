import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/utils/user_friendly_error.dart';

/// Fiche détail admin — champs structurés + stack trace si disponible.
void showAdminRecordDetailSheet(
  BuildContext context, {
  required String title,
  required Map<String, dynamic> data,
  bool adminContext = true,
  List<Widget>? actions,
}) {
  final merged = _mergeRecordData(data);
  final fields = _buildFields(merged, adminContext: adminContext);
  final stackTrace = _extractStackTrace(merged);

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
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
                  if (fields.isEmpty)
                    Text(
                      'Données brutes limitées pour cet enregistrement.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  for (final f in fields) _DetailRow(label: f.$1, value: f.$2),
                  if (stackTrace != null && stackTrace.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Stack trace',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: SelectableText(
                        stackTrace,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                      ),
                    ),
                  ],
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

Map<String, dynamic> _mergeRecordData(Map<String, dynamic> data) {
  final merged = Map<String, dynamic>.from(data);
  final meta = data['metadata'];
  if (meta is Map) {
    for (final entry in meta.entries) {
      if (entry.key == 'metadata') continue;
      merged.putIfAbsent(entry.key, () => entry.value);
    }
    final nested = meta['metadata'];
    if (nested is Map) {
      for (final entry in nested.entries) {
        merged.putIfAbsent(entry.key, () => entry.value);
      }
    }
  }
  final device = data['device'];
  if (device is Map) {
    merged.putIfAbsent('deviceModel', () => device['model'] ?? device['name']);
    merged.putIfAbsent('osVersion', () => device['osVersion'] ?? device['version']);
  }
  return merged;
}

String? _extractStackTrace(Map<String, dynamic> data) {
  for (final key in ['stackTrace', 'stack', 'stacktrace']) {
    final v = data[key];
    if (v != null && v.toString().trim().isNotEmpty) return v.toString().trim();
  }
  return null;
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
    if (raw.isEmpty || raw == 'null') return;
    out.add((label, friendly ? userFriendlyError(raw, adminContext: adminContext) : raw));
  }

  add('Identifiant', data['id']);
  add('Horodatage', _formatTs(data['timestamp'] ?? data['createdAt']));
  add('Type', data['errorName'] ?? data['crashType'] ?? data['eventName'] ?? data['metricName']);
  add('Catégorie', data['category'] ?? data['eventType'] ?? data['metricType']);
  add('Message', data['errorMessage'] ?? data['message'], friendly: true);
  add('Page / écran', data['page'] ?? data['screenName'] ?? data['screen']);
  add('Gravité', data['severity']);
  if (data.containsKey('resolved')) {
    add('Statut', data['resolved'] == true ? 'Traité' : 'Ouvert');
  }
  add('Source', data['source']);
  add('Plateforme', data['platform']);
  add('Version app', data['appVersion'] ?? data['version']);
  add('Appareil', data['deviceModel'] ?? _deviceLabel(data['device']));
  add('OS', data['osVersion'] ?? _deviceOs(data['device']));
  add('Email utilisateur', data['userEmail']);
  add('Utilisateur', data['userId']?.toString());
  add('Session', data['sessionId']?.toString());
  add('Durée (ms)', data['duration'] ?? data['durationMs'] ?? data['networkLatency']);
  add('CPU app (%)', data['cpuUsage']);
  add('Mémoire app', data['memoryUsage']);
  add('Endpoint', data['properties'] is Map ? (data['properties'] as Map)['endpoint'] : null);

  return out;
}

String? _deviceLabel(dynamic device) {
  if (device is Map) {
    return device['model']?.toString() ?? device['name']?.toString();
  }
  return device?.toString();
}

String? _deviceOs(dynamic device) {
  if (device is Map) {
    return device['osVersion']?.toString() ?? device['version']?.toString();
  }
  return null;
}

String _formatTs(dynamic t) {
  if (t == null) return '';
  return DateTime.tryParse(t.toString())?.toLocal().toString().substring(0, 19) ?? t.toString();
}

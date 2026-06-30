import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  AdminTimeRange _range = AdminTimeRange.d7;
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _timeline = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final results = await Future.wait([
        AdminApiService.fetchStatistics(token: token),
        AdminApiService.fetchStatisticsTimeline(token: token, range: _range),
      ]);
      if (mounted) {
        setState(() {
          _stats = Map<String, dynamic>.from(results[0] as Map);
          _timeline = List<Map<String, dynamic>>.from(
            (results[1] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int _n(List<String> paths) {
    dynamic cur = _stats;
    for (final p in paths) {
      if (cur is! Map) return 0;
      cur = cur[p];
    }
    if (cur is num) return cur.toInt();
    if (cur is Map && cur['total'] is num) return (cur['total'] as num).toInt();
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistiques plateforme'),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          const MobileNotificationCenter(),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      AdminTimeRangeBar(value: _range, onChanged: (r) {
                        setState(() => _range = r);
                        _load();
                      }),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('Vue d\'ensemble', style: Theme.of(context).textTheme.titleMedium),
                      ),
                      _grid([
                        _stat('Utilisateurs', _n(['users', 'total']), Icons.people, Colors.indigo),
                        _stat('Actifs', _n(['users', 'active']), Icons.person, Colors.green),
                        _stat('Candidatures', _n(['applications', 'total']), Icons.work, Colors.blue),
                        _stat('Entreprises', _n(['companies', 'total']), Icons.business, Colors.purple),
                        _stat('Contacts', _n(['contacts', 'total']), Icons.contact_mail, Colors.teal),
                        _stat('Entretiens', _n(['interviews', 'total']), Icons.event, Colors.orange),
                      ]),
                      if (_timeline.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                          child: Text('Évolution (${_range.label})', style: Theme.of(context).textTheme.titleMedium),
                        ),
                        ..._timeline.take(20).map((point) {
                          final ts = DateTime.tryParse(point['timestamp']?.toString() ?? '')?.toLocal().toString().substring(0, 10) ?? '';
                          final apps = point['total_applications'] ?? 0;
                          final users = point['total_users'] ?? 0;
                          return ListTile(
                            dense: true,
                            title: Text(ts),
                            subtitle: Text('Users: $users · Candidatures: $apps'),
                            trailing: Text('+$apps', style: const TextStyle(fontWeight: FontWeight.bold)),
                          );
                        }),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _grid(List<Widget> children) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Wrap(spacing: 8, runSpacing: 8, children: children),
    );
  }

  Widget _stat(String label, int value, IconData icon, Color color) {
    return SizedBox(
      width: 160,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color),
              const SizedBox(height: 8),
              Text('$value', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ),
        ),
      ),
    );
  }
}

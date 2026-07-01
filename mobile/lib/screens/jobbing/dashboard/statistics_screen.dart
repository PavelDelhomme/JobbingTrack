import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_kpi_tile.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
import 'package:jobbingtrack_mobile/widgets/admin/simple_pie_chart.dart';
import 'package:jobbingtrack_mobile/utils/user_friendly_error.dart';
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
      if (mounted) setState(() => _error = userFriendlyError(e, adminContext: true));
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

  Map<String, dynamic> _map(List<String> paths) {
    dynamic cur = _stats;
    for (final p in paths) {
      if (cur is! Map) return {};
      cur = cur[p];
    }
    return cur is Map ? Map<String, dynamic>.from(cur) : {};
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
      body: AdminSafeBody(
        child: _loading
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
                      padding: adminScrollPadding(context),
                      children: [
                        AdminTimeRangeBar(value: _range, onChanged: (r) {
                          setState(() => _range = r);
                          _load();
                        }),
                        const AdminSectionTitle(title: 'Vue d\'ensemble métier'),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              AdminKpiTile(label: 'Utilisateurs', value: '${_n(['users', 'total'])}', icon: Icons.people, color: Colors.indigo),
                              AdminKpiTile(label: 'Actifs (30 min)', value: '${_n(['users', 'active'])}', icon: Icons.person, color: Colors.green),
                              AdminKpiTile(label: 'Candidatures', value: '${_n(['applications', 'total'])}', icon: Icons.work, color: Colors.blue),
                              AdminKpiTile(label: 'Entreprises', value: '${_n(['companies', 'total'])}', icon: Icons.business, color: Colors.purple),
                              AdminKpiTile(label: 'Contacts', value: '${_n(['contacts', 'total'])}', icon: Icons.contact_mail, color: Colors.teal),
                              AdminKpiTile(label: 'Entretiens', value: '${_n(['interviews', 'total'])}', icon: Icons.event, color: Colors.orange),
                              AdminKpiTile(label: 'Appels', value: '${_n(['calls', 'total'])}', icon: Icons.phone, color: Colors.cyan),
                              AdminKpiTile(label: 'Relances', value: '${_n(['followups', 'total'])}', icon: Icons.notifications_active, color: Colors.amber.shade800),
                              AdminKpiTile(label: 'Événements', value: '${_n(['events', 'total'])}', icon: Icons.calendar_month, color: Colors.deepOrange),
                            ],
                          ),
                        ),
                        const AdminSectionTitle(title: 'Activité récente', subtitle: 'Cette semaine / ce mois'),
                        _activityCard(),
                        ..._pieSection('Candidatures par statut', _map(['applications', 'by_status'])),
                        ..._pieSection('Relances par statut', _map(['followups', 'by_status'])),
                        ..._pieSection('Appels par statut', _map(['calls', 'by_status'])),
                        ..._pieSection('Entretiens par statut', _map(['interviews', 'by_status'])),
                        if (_timeline.length > 1) ...[
                          AdminSectionTitle(title: 'Évolution (${_range.label})'),
                          ..._timeline.take(20).map(_timelineTile),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _activityCard() {
    final appsWeek = _n(['applications', 'this_week']);
    final appsMonth = _n(['applications', 'this_month']);
    final usersWeek = _n(['users', 'new_this_week']);
    final overdue = _n(['followups', 'overdue']);
    final upcomingInterviews = _n(['interviews', 'upcoming']);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _activityRow('Nouvelles candidatures (semaine)', appsWeek),
            _activityRow('Nouvelles candidatures (mois)', appsMonth),
            _activityRow('Nouveaux utilisateurs (semaine)', usersWeek),
            _activityRow('Relances en retard', overdue, highlight: overdue > 0),
            _activityRow('Entretiens à venir', upcomingInterviews),
          ],
        ),
      ),
    );
  }

  Widget _activityRow(String label, int value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            '$value',
            style: TextStyle(fontWeight: FontWeight.bold, color: highlight ? Colors.red : null),
          ),
        ],
      ),
    );
  }

  List<Widget> _pieSection(String title, Map<String, dynamic> buckets) {
    if (buckets.isEmpty) return [];
    return [
      AdminSectionTitle(title: title),
      SimplePieChart(data: buckets),
      const SizedBox(height: 8),
    ];
  }

  Widget _timelineTile(Map<String, dynamic> point) {
    final ts = DateTime.tryParse(point['timestamp']?.toString() ?? '')?.toLocal().toString().substring(0, 10) ?? '';
    return ListTile(
      dense: true,
      title: Text(ts),
      subtitle: Text(
        'Users ${point['total_users'] ?? 0} · Apps ${point['total_applications'] ?? 0} · '
        'Relances ${point['total_followups'] ?? 0}',
      ),
    );
  }
}

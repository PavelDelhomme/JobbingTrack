import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_kpi_tile.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_record_detail_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
import 'package:jobbingtrack_mobile/utils/user_friendly_error.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Analytics serveur mobile (API backoffice).
class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  AdminTimeRange _range = AdminTimeRange.d7;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _events = [];
  List<Map<String, dynamic>> _perf = [];
  List<Map<String, dynamic>> _errors = [];
  List<Map<String, dynamic>> _feedback = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final results = await Future.wait([
        AdminApiService.fetchApplicationEvents(token: token, range: _range, limit: 150),
        AdminApiService.fetchApplicationPerformance(token: token, range: _range, limit: 150),
        AdminApiService.fetchApplicationErrors(token: token, range: _range, limit: 150),
        AdminApiService.fetchCrashReports(token: token, limit: 150),
      ]);
      if (mounted) {
        setState(() {
          _events = results[0];
          _perf = results[1];
          _errors = results[2];
          _feedback = results[3].where(AdminApiService.isUserFeedbackCrash).toList();
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = userFriendlyError(e, adminContext: true));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _openErrors => _errors.where((e) => e['resolved'] != true).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics mobile'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: [
            Tab(text: 'Événements (${_events.length})'),
            Tab(text: 'Perf (${_perf.length})'),
            Tab(text: 'Erreurs (${_errors.length})'),
            Tab(text: 'Retours (${_feedback.length})'),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          const MobileNotificationCenter(),
        ],
      ),
      body: AdminSafeBody(
        child: Column(
          children: [
            AdminTimeRangeBar(value: _range, onChanged: (r) {
              setState(() => _range = r);
              _load();
            }),
            if (!_loading && _error == null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    AdminKpiTile(
                      label: 'Événements',
                      value: '${_events.length}',
                      icon: Icons.timeline,
                      color: Colors.blue,
                    ),
                    AdminKpiTile(
                      label: 'Perf',
                      value: '${_perf.length}',
                      icon: Icons.speed,
                      color: Colors.teal,
                    ),
                    AdminKpiTile(
                      label: 'Erreurs ouvertes',
                      value: '$_openErrors',
                      icon: Icons.error_outline,
                      color: Colors.orange,
                    ),
                    AdminKpiTile(
                      label: 'Retours',
                      value: '${_feedback.length}',
                      icon: Icons.feedback_outlined,
                      color: Colors.purple,
                    ),
                  ],
                ),
              ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            FilledButton(onPressed: _load, child: const Text('Réessayer')),
          ],
        ),
      );
    }
    return TabBarView(
      controller: _tabs,
      children: [
        _list(_events, _eventTile, empty: 'Aucun événement'),
        _list(_perf, _perfTile, empty: 'Aucune mesure perf'),
        _list(_errors, _errorTile, empty: 'Aucune erreur'),
        _list(_feedback, _feedbackTile, empty: 'Aucun retour'),
      ],
    );
  }

  Widget _list(
    List<Map<String, dynamic>> items,
    Widget Function(Map<String, dynamic>) builder, {
    required String empty,
  }) {
    if (items.isEmpty) {
      return Center(child: Text(empty));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: adminScrollPadding(context),
        itemCount: items.length,
        itemBuilder: (_, i) => builder(items[i]),
      ),
    );
  }

  Widget _eventTile(Map<String, dynamic> e) {
    final name = e['eventName'] ?? e['eventType'] ?? 'event';
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        leading: const Icon(Icons.bolt_outlined, size: 20),
        title: Text('$name', maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text('${e['page'] ?? e['category'] ?? ''} · ${_ts(e)}'),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Événement', data: e),
      ),
    );
  }

  Widget _perfTile(Map<String, dynamic> p) {
    final name = p['metricName'] ?? p['metricType'] ?? 'perf';
    final ms = p['duration'] ?? p['value'] ?? p['networkLatency'];
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        leading: const Icon(Icons.speed, size: 20),
        title: Text('$name · ${ms ?? '?'} ms'),
        subtitle: Text('${p['page'] ?? p['endpoint'] ?? ''} · ${_ts(p)}'),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Performance', data: p),
      ),
    );
  }

  Widget _errorTile(Map<String, dynamic> e) {
    final msg = userFriendlyError(e['errorMessage'] ?? e['errorName'] ?? 'Erreur', adminContext: true);
    final resolved = e['resolved'] == true;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      color: resolved ? null : Colors.red.shade50,
      child: ListTile(
        leading: Icon(resolved ? Icons.check_circle_outline : Icons.error_outline,
            color: resolved ? Colors.green : Colors.red, size: 20),
        title: Text(msg, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${e['severity'] ?? ''} · ${_ts(e)}'),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Erreur', data: e),
      ),
    );
  }

  Widget _feedbackTile(Map<String, dynamic> f) {
    final msg = (f['message'] ?? '').toString().replaceFirst(
          RegExp(r'^\[(bug|suggestion|signalement)\]\s*', caseSensitive: false),
          '',
        );
    final cat = AdminApiService.feedbackCategory(f);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        leading: const Icon(Icons.feedback_outlined, size: 20),
        title: Text(msg.isEmpty ? '(sans message)' : msg, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${cat.toUpperCase()} · ${_ts(f)}'),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Retour', data: f),
      ),
    );
  }

  String _ts(Map<String, dynamic> row) {
    final t = row['timestamp'] ?? row['createdAt'];
    return DateTime.tryParse(t?.toString() ?? '')?.toLocal().toString().substring(0, 16) ?? '';
  }
}

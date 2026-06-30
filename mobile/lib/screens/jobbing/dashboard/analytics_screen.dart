import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
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
        AdminApiService.fetchApplicationEvents(token: token, range: _range, limit: 80),
        AdminApiService.fetchApplicationPerformance(token: token, range: _range, limit: 80),
        AdminApiService.fetchApplicationErrors(token: token, range: _range, limit: 80),
        AdminApiService.fetchCrashReports(token: token, limit: 80),
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
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
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
            Tab(text: 'Events (${_events.length})'),
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
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Row(
                  children: [
                    Chip(label: Text('$_openErrors erreurs ouvertes'), visualDensity: VisualDensity.compact),
                    const SizedBox(width: 8),
                    Chip(label: Text('Période : ${_range.label}'), visualDensity: VisualDensity.compact),
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
        _list(_events, _eventTile),
        _list(_perf, _perfTile),
        _list(_errors, _errorTile),
        _list(_feedback, _feedbackTile),
      ],
    );
  }

  Widget _list(List<Map<String, dynamic>> items, Widget Function(Map<String, dynamic>) builder) {
    if (items.isEmpty) {
      return const Center(child: Text('Aucune donnée sur cette période'));
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
    final page = e['page'] ?? e['screen'] ?? e['route'] ?? '';
    final user = e['userId']?.toString();
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        title: Text('$name', maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text('$page${user != null ? '\nuser: ${user.length > 8 ? '${user.substring(0, 8)}…' : user}' : ''}'),
        trailing: Text(_ts(e), style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ),
    );
  }

  Widget _perfTile(Map<String, dynamic> p) {
    final name = p['metricName'] ?? p['metricType'] ?? 'perf';
    final ms = p['duration'] ?? p['value'] ?? p['durationMs'];
    final path = p['path'] ?? p['endpoint'] ?? p['page'] ?? '';
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        title: Text('$name · ${ms ?? '?'} ms'),
        subtitle: Text(path.toString()),
        trailing: Text(_ts(p), style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ),
    );
  }

  Widget _errorTile(Map<String, dynamic> e) {
    final msg = e['errorMessage'] ?? e['errorName'] ?? 'Erreur';
    final severity = e['severity'] ?? 'error';
    final resolved = e['resolved'] == true;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      color: resolved ? null : Colors.red.shade50,
      child: ListTile(
        title: Text(msg.toString(), maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('$severity · ${e['platform'] ?? 'mobile'} · ${_ts(e)}'),
        trailing: resolved ? const Icon(Icons.check, color: Colors.green, size: 20) : const Icon(Icons.error_outline, color: Colors.red, size: 20),
      ),
    );
  }

  Widget _feedbackTile(Map<String, dynamic> f) {
    final msg = (f['message'] ?? '').toString().replaceFirst(
          RegExp(r'^\[(bug|suggestion|signalement)\]\s*', caseSensitive: false),
          '',
        );
    final cat = AdminApiService.feedbackCategory(f);
    final device = f['device'] ?? f['deviceInfo'];
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        title: Text(msg.isEmpty ? '(sans message)' : msg, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${cat.toUpperCase()} · ${device ?? f['appVersion'] ?? ''}\n${_ts(f)}'),
      ),
    );
  }

  String _ts(Map<String, dynamic> row) {
    final t = row['timestamp'] ?? row['createdAt'];
    return DateTime.tryParse(t?.toString() ?? '')?.toLocal().toString().substring(0, 16) ?? '';
  }
}

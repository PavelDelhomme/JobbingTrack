import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
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
      body: Column(
        children: [
          AdminTimeRangeBar(value: _range, onChanged: (r) {
            setState(() => _range = r);
            _load();
          }),
          Expanded(child: _buildBody()),
        ],
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
        _simpleList(_events, (e) => '${e['eventName'] ?? e['eventType']} · ${e['page'] ?? ''}', (e) => _ts(e)),
        _simpleList(_perf, (p) => '${p['metricName'] ?? p['metricType']} · ${p['duration'] ?? p['value'] ?? ''} ms', (p) => _ts(p)),
        _simpleList(_errors, (e) => e['errorMessage']?.toString() ?? e['errorName']?.toString() ?? 'Erreur', (e) => _ts(e)),
        _simpleList(_feedback, (f) => f['message']?.toString() ?? 'Retour', (f) => _ts(f)),
      ],
    );
  }

  Widget _simpleList(
    List<Map<String, dynamic>> items,
    String Function(Map<String, dynamic>) title,
    String Function(Map<String, dynamic>) subtitle,
  ) {
    if (items.isEmpty) return const Center(child: Text('Aucune donnée'));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: items.length,
        itemBuilder: (_, i) {
          final row = items[i];
          return ListTile(
            title: Text(title(row), maxLines: 2, overflow: TextOverflow.ellipsis),
            subtitle: Text(subtitle(row)),
          );
        },
      ),
    );
  }

  String _ts(Map<String, dynamic> row) {
    final t = row['timestamp'] ?? row['createdAt'];
    return DateTime.tryParse(t?.toString() ?? '')?.toLocal().toString().substring(0, 16) ?? '';
  }
}

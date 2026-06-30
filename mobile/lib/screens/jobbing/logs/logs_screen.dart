import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  AdminTimeRange _range = AdminTimeRange.d7;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _crashes = [];
  List<Map<String, dynamic>> _errors = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
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
        AdminApiService.fetchCrashReports(token: token, limit: 150),
        AdminApiService.fetchApplicationErrors(token: token, range: _range),
      ]);
      if (mounted) {
        setState(() {
          _crashes = results[0];
          _errors = results[1];
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _feedback =>
      _crashes.where(AdminApiService.isUserFeedbackCrash).toList();

  List<Map<String, dynamic>> get _autoCrashes =>
      _crashes.where((c) => !AdminApiService.isUserFeedbackCrash(c)).toList();

  @override
  Widget build(BuildContext context) {
    final bugs = _feedback.where((c) => AdminApiService.feedbackCategory(c) == 'bug').length;
    final openErrors = _errors.where((e) => e['resolved'] != true).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Logs mobile'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(text: 'Retours (${_feedback.length})'),
            Tab(text: 'Crashs (${_autoCrashes.length})'),
            Tab(text: 'Erreurs (${_errors.length})'),
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                _chip('Bugs', '$bugs', Colors.red),
                const SizedBox(width: 8),
                _chip('Ouvertes', '$openErrors', Colors.orange),
              ],
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _chip(String label, String value, Color color) {
    return Chip(
      avatar: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.2),
        child: Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
      label: Text(label),
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
        _list(_feedback, _feedbackTile),
        _list(_autoCrashes, _crashTile),
        _list(_errors, _errorTile),
      ],
    );
  }

  Widget _list(List<Map<String, dynamic>> items, Widget Function(Map<String, dynamic>) builder) {
    if (items.isEmpty) {
      return const Center(child: Text('Aucune entrée sur cette période'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: items.length,
        itemBuilder: (_, i) => builder(items[i]),
      ),
    );
  }

  Widget _feedbackTile(Map<String, dynamic> c) {
    final msg = (c['message'] ?? '').toString().replaceFirst(
          RegExp(r'^\[(bug|suggestion|signalement)\]\s*', caseSensitive: false),
          '',
        );
    final cat = AdminApiService.feedbackCategory(c);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text(msg.isEmpty ? '(sans message)' : msg, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${cat.toUpperCase()} · ${_ts(c)}'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showDetail(c, title: 'Retour utilisateur'),
      ),
    );
  }

  Widget _crashTile(Map<String, dynamic> c) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text((c['crashType'] ?? 'Crash').toString()),
        subtitle: Text('${c['message'] ?? ''}\n${_ts(c)}', maxLines: 2, overflow: TextOverflow.ellipsis),
        onTap: () => _showDetail(c, title: 'Crash auto'),
      ),
    );
  }

  Widget _errorTile(Map<String, dynamic> e) {
    final resolved = e['resolved'] == true;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text((e['errorMessage'] ?? e['errorName'] ?? 'Erreur').toString(), maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${e['severity'] ?? ''} · ${_ts(e)}'),
        trailing: resolved
            ? const Icon(Icons.check, color: Colors.green)
            : IconButton(
                icon: const Icon(Icons.done_outline),
                tooltip: 'Marquer traité',
                onPressed: () async {
                  final token = Provider.of<AuthProvider>(context, listen: false).token;
                  try {
                    await AdminApiService.resolveApplicationError(e['id'].toString(), token: token);
                    _load();
                  } catch (err) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$err')));
                  }
                },
              ),
        onTap: () => _showDetail(e, title: 'Erreur applicative'),
      ),
    );
  }

  String _ts(Map<String, dynamic> row) {
    final t = row['timestamp'] ?? row['createdAt'];
    if (t == null) return '';
    return DateTime.tryParse(t.toString())?.toLocal().toString().substring(0, 16) ?? t.toString();
  }

  void _showDetail(Map<String, dynamic> data, {required String title}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (_, scroll) => Padding(
          padding: const EdgeInsets.all(16),
          child: ListView(
            controller: scroll,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              SelectableText(const JsonEncoder.withIndent('  ').convert(data)),
            ],
          ),
        ),
      ),
    );
  }
}

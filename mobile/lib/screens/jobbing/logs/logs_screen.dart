import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';
import 'package:jobbingtrack_mobile/utils/user_friendly_error.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_time_range_bar.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_record_detail_sheet.dart';
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
  String _searchQuery = '';
  String _feedbackFilter = 'all';
  String _errorFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() {});
    });
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
      if (mounted) setState(() => _error = userFriendlyError(e, adminContext: true));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _feedback =>
      _crashes.where(AdminApiService.isUserFeedbackCrash).toList();

  List<Map<String, dynamic>> get _autoCrashes =>
      _crashes.where((c) => !AdminApiService.isUserFeedbackCrash(c)).toList();

  bool _matchesQuery(Map<String, dynamic> row, List<String> keys) {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    for (final k in keys) {
      if (row[k]?.toString().toLowerCase().contains(q) ?? false) return true;
    }
    return row.toString().toLowerCase().contains(q);
  }

  List<Map<String, dynamic>> get _filteredFeedback => _feedback.where((c) {
        if (_feedbackFilter != 'all' && AdminApiService.feedbackCategory(c) != _feedbackFilter) return false;
        return _matchesQuery(c, ['message', 'crashType', 'appVersion', 'device', 'osVersion']);
      }).toList();

  List<Map<String, dynamic>> get _filteredCrashes => _autoCrashes.where((c) {
        return _matchesQuery(c, ['message', 'crashType', 'stackTrace', 'appVersion']);
      }).toList();

  List<Map<String, dynamic>> get _filteredErrors => _errors.where((e) {
        if (_errorFilter == 'open' && e['resolved'] == true) return false;
        if (_errorFilter == 'resolved' && e['resolved'] != true) return false;
        return _matchesQuery(e, ['errorMessage', 'errorName', 'severity', 'page', 'stackTrace']);
      }).toList();

  @override
  Widget build(BuildContext context) {
    final bugs = _filteredFeedback.where((c) => AdminApiService.feedbackCategory(c) == 'bug').length;
    final openErrors = _filteredErrors.where((e) => e['resolved'] != true).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Logs mobile'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(text: 'Retours (${_filteredFeedback.length})'),
            Tab(text: 'Crashs (${_filteredCrashes.length})'),
            Tab(text: 'Erreurs (${_filteredErrors.length})'),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Rechercher message, type, appareil…',
                  prefixIcon: const Icon(Icons.search),
                  border: const OutlineInputBorder(),
                  isDense: true,
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(() => _searchQuery = ''))
                      : null,
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
            ),
            if (_tabs.index == 0)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    for (final f in ['all', 'bug', 'suggestion', 'signalement'])
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(f == 'all' ? 'Tous' : f),
                          selected: _feedbackFilter == f,
                          onSelected: (_) => setState(() => _feedbackFilter = f),
                        ),
                      ),
                  ],
                ),
              ),
            if (_tabs.index == 2)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    for (final f in ['all', 'open', 'resolved'])
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(f == 'all' ? 'Toutes' : f == 'open' ? 'Ouvertes' : 'Traitées'),
                          selected: _errorFilter == f,
                          onSelected: (_) => setState(() => _errorFilter = f),
                        ),
                      ),
                  ],
                ),
              ),
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
        _list(_filteredFeedback, _feedbackTile, emptyLabel: 'Aucun retour pour cette recherche'),
        _list(_filteredCrashes, _crashTile, emptyLabel: 'Aucun crash pour cette recherche'),
        _list(_filteredErrors, _errorTile, emptyLabel: 'Aucune erreur pour cette recherche'),
      ],
    );
  }

  Widget _list(
    List<Map<String, dynamic>> items,
    Widget Function(Map<String, dynamic>) builder, {
    required String emptyLabel,
  }) {
    if (items.isEmpty) {
      return Center(child: Text(emptyLabel));
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

  String _safeLogMessage(String? raw) {
    final msg = (raw ?? '').trim();
    if (msg.isEmpty) return '(sans message)';
    if (msg.contains('SocketException') ||
        msg.contains('Connection refused') ||
        msg.contains('ClientException')) {
      return userFriendlyError(msg, adminContext: true);
    }
    return msg.replaceFirst(RegExp(r'^\[(bug|suggestion|signalement)\]\s*', caseSensitive: false), '').trim();
  }

  Widget _feedbackTile(Map<String, dynamic> c) {
    final title = _safeLogMessage(c['message']?.toString());
    final cat = AdminApiService.feedbackCategory(c);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text('${cat.toUpperCase()} · ${_ts(c)}'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Retour utilisateur', data: c),
      ),
    );
  }

  Widget _crashTile(Map<String, dynamic> c) {
    final title = _safeLogMessage(c['crashType']?.toString() ?? c['message']?.toString());
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text(title),
        subtitle: Text(_ts(c)),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Crash', data: c),
      ),
    );
  }

  Widget _errorTile(Map<String, dynamic> e) {
    final resolved = e['resolved'] == true;
    final raw = (e['errorMessage'] ?? e['errorName'] ?? 'Erreur').toString();
    final title = _safeLogMessage(raw);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
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
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(userFriendlyError(err, adminContext: true))),
                      );
                    }
                  }
                },
              ),
        onTap: () => showAdminRecordDetailSheet(context, title: 'Erreur', data: e),
      ),
    );
  }

  String _ts(Map<String, dynamic> row) {
    final t = row['timestamp'] ?? row['createdAt'];
    if (t == null) return '';
    return DateTime.tryParse(t.toString())?.toLocal().toString().substring(0, 16) ?? t.toString();
  }
}

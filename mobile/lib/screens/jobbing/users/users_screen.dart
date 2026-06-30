import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<User> _users = [];
  List<User> _filtered = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _applyFilter() {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) {
      _filtered = _users;
      return;
    }
    _filtered = _users.where((u) {
      return u.email.toLowerCase().contains(q) ||
          u.firstName.toLowerCase().contains(q) ||
          u.lastName.toLowerCase().contains(q) ||
          u.role.toLowerCase().contains(q);
    }).toList();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final users = await AdminApiService.fetchUsers(token: token);
      if (mounted) {
        setState(() {
          _users = users;
          _applyFilter();
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cleanTestUsers() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nettoyer utilisateurs test'),
        content: const Text('Supprimer les comptes marqués comme données de test ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Nettoyer')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      await AdminApiService.cleanTestUsers(token: token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Utilisateurs test nettoyés')));
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _users.where((u) => u.isActive).length;
    final admins = _users.where((u) => u.role == 'ADMIN' || u.role == 'SUPER_ADMIN').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Utilisateurs'),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.cleaning_services_outlined), tooltip: 'Nettoyer test', onPressed: _cleanTestUsers),
          const MobileNotificationCenter(),
        ],
      ),
      body: AdminSafeBody(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  _kpi('Total', '${_users.length}'),
                  const SizedBox(width: 8),
                  _kpi('Actifs', '$active'),
                  const SizedBox(width: 8),
                  _kpi('Admins', '$admins'),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Rechercher email, nom, rôle…',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onChanged: (v) => setState(() {
                  _query = v;
                  _applyFilter();
                }),
              ),
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _kpi(String label, String value) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Column(
            children: [
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
            ],
          ),
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
            const SizedBox(height: 12),
            FilledButton(onPressed: _load, child: const Text('Réessayer')),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: _filtered.isEmpty
          ? ListView(
              padding: adminScrollPadding(context),
              children: const [SizedBox(height: 80), Center(child: Text('Aucun utilisateur'))],
            )
          : ListView.builder(
              padding: adminScrollPadding(context),
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final u = _filtered[i];
                return ListTile(
                  leading: CircleAvatar(child: Text(u.firstName.isNotEmpty ? u.firstName[0] : '?')),
                  title: Text('${u.firstName} ${u.lastName}'.trim()),
                  subtitle: Text('${u.email}\n${u.role}${u.emailVerified ? '' : ' · email non vérifié'}'),
                  isThreeLine: true,
                  trailing: Icon(u.isActive ? Icons.check_circle_outline : Icons.block, color: u.isActive ? Colors.green : Colors.grey),
                  onTap: () async {
                    await Navigator.of(context).pushNamed('/user-detail', arguments: u.id);
                    if (mounted) _load();
                  },
                );
              },
            ),
    );
  }
}

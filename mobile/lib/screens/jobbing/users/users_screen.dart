import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

enum _UserListFilter { all, active, inactive, admins }

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
  _UserListFilter _listFilter = _UserListFilter.all;

  @override
  void initState() {
    super.initState();
    _load();
  }

  bool _isAdmin(User u) => u.role == 'ADMIN' || u.role == 'SUPER_ADMIN';

  void _applyFilter() {
    Iterable<User> list = _users;
    switch (_listFilter) {
      case _UserListFilter.active:
        list = list.where((u) => u.isActive);
        break;
      case _UserListFilter.inactive:
        list = list.where((u) => !u.isActive);
        break;
      case _UserListFilter.admins:
        list = list.where(_isAdmin);
        break;
      case _UserListFilter.all:
        break;
    }

    final q = _query.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((u) {
        return u.email.toLowerCase().contains(q) ||
            u.firstName.toLowerCase().contains(q) ||
            u.lastName.toLowerCase().contains(q) ||
            u.role.toLowerCase().contains(q);
      });
    }
    _filtered = list.toList();
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
        content: const Text(
          'Supprime les comptes smoke (test+mob…, @jobbingtrack.test, Porteur Auto, isTestData).\n\n'
          'Les comptes admin et TEST_USER_EMAIL du .env sont conservés.',
        ),
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateurs test / smoke supprimés')),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  void _setFilter(_UserListFilter filter) {
    setState(() {
      _listFilter = filter;
      _applyFilter();
    });
  }

  @override
  Widget build(BuildContext context) {
    final active = _users.where((u) => u.isActive).length;
    final inactive = _users.where((u) => !u.isActive).length;
    final admins = _users.where(_isAdmin).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Utilisateurs'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.cleaning_services_outlined),
            tooltip: 'Nettoyer comptes smoke',
            onPressed: _cleanTestUsers,
          ),
          const MobileNotificationCenter(),
        ],
      ),
      body: AdminSafeBody(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  _filterChip('Tous', '${_users.length}', _UserListFilter.all),
                  _filterChip('Actifs', '$active', _UserListFilter.active),
                  _filterChip('Inactifs', '$inactive', _UserListFilter.inactive),
                  _filterChip('Admins', '$admins', _UserListFilter.admins),
                ],
              ),
            ),
            if (_listFilter != _UserListFilter.all)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _filterSubtitle(_listFilter, _filtered.length),
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
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

  String _filterSubtitle(_UserListFilter f, int shown) {
    switch (f) {
      case _UserListFilter.active:
        return 'Filtre : comptes actifs — $shown affiché(s)';
      case _UserListFilter.inactive:
        return 'Filtre : comptes inactifs — $shown affiché(s)';
      case _UserListFilter.admins:
        return 'Filtre : administrateurs — $shown affiché(s)';
      case _UserListFilter.all:
        return '';
    }
  }

  Widget _filterChip(String label, String value, _UserListFilter filter) {
    final selected = _listFilter == filter;
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? colorScheme.primaryContainer : colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _setFilter(filter),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: selected ? colorScheme.onPrimaryContainer : null,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: selected
                      ? colorScheme.onPrimaryContainer.withValues(alpha: 0.85)
                      : Colors.grey.shade600,
                ),
              ),
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
              children: [
                const SizedBox(height: 80),
                Center(
                  child: Text(
                    _listFilter == _UserListFilter.all
                        ? 'Aucun utilisateur'
                        : 'Aucun utilisateur pour ce filtre',
                  ),
                ),
              ],
            )
          : ListView.builder(
              padding: adminScrollPadding(context),
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final u = _filtered[i];
                return ListTile(
                  leading: CircleAvatar(child: Text(u.firstName.isNotEmpty ? u.firstName[0] : '?')),
                  title: Text('${u.firstName} ${u.lastName}'.trim()),
                  subtitle: Text(
                    '${u.email}\n${u.role}${u.emailVerified ? '' : ' · email non vérifié'}${u.isActive ? '' : ' · inactif'}',
                  ),
                  isThreeLine: true,
                  trailing: Icon(
                    u.isActive ? Icons.check_circle_outline : Icons.block,
                    color: u.isActive ? Colors.green : Colors.grey,
                  ),
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

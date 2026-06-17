import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<User> _users = [];
  bool _loading = true;
  String? _error;

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
      final users = await ApiService.getUsers(token: token);
      if (mounted) setState(() => _users = users);
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
        title: const Text('Utilisateurs'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _users.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            Center(child: Text('Aucun utilisateur')),
                          ],
                        )
                      : ListView.builder(
                          itemCount: _users.length,
                          itemBuilder: (_, i) {
                            final u = _users[i];
                            return ListTile(
                              leading: CircleAvatar(child: Text(u.firstName.isNotEmpty ? u.firstName[0] : '?')),
                              title: Text('${u.firstName} ${u.lastName}'.trim()),
                              subtitle: Text('${u.email} · ${u.role}'),
                              trailing: Icon(
                                u.isActive ? Icons.check_circle_outline : Icons.block,
                                color: u.isActive ? Colors.green : Colors.grey,
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

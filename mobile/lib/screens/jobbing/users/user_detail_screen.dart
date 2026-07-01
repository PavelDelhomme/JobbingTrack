import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_sensitive_action_guard.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class UserDetailScreen extends StatefulWidget {
  final String userId;

  const UserDetailScreen({super.key, required this.userId});

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen> {
  Map<String, dynamic>? _raw;
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
      final data = await AdminApiService.fetchUser(widget.userId, token: token);
      if (mounted) setState(() => _raw = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  User? get _user => _raw != null ? User.fromJson(_raw!) : null;

  Future<bool> _guard(String title, String message) =>
      confirmSensitiveAdminAction(context, title: title, message: message);

  Future<void> _run(
    Future<void> Function() action,
    String success, {
    required String guardTitle,
    required String guardMessage,
  }) async {
    if (!await _guard(guardTitle, guardMessage)) return;
    try {
      await action();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(success)));
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _pickRole() async {
    final u = _user;
    if (u == null) return;
    const roles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    final picked = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: roles
              .map((r) => ListTile(
                    title: Text(r),
                    trailing: u.role == r ? const Icon(Icons.check) : null,
                    onTap: () => Navigator.pop(ctx, r),
                  ))
              .toList(),
        ),
      ),
    );
    if (picked == null || picked == u.role) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _run(
      () => AdminApiService.updateUserRole(u.id, picked, token: token),
      'Rôle mis à jour',
      guardTitle: 'Changer le rôle',
      guardMessage: 'Confirmez le changement de rôle vers $picked pour ${u.email}',
    );
  }

  Future<void> _toggleActive() async {
    final u = _user;
    if (u == null) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _run(
      () => AdminApiService.toggleUserStatus(u.id, !u.isActive, token: token),
      u.isActive ? 'Compte désactivé' : 'Compte activé',
      guardTitle: u.isActive ? 'Désactiver le compte' : 'Activer le compte',
      guardMessage: u.isActive
          ? 'Désactiver ${u.email} ?'
          : 'Réactiver le compte ${u.email} ?',
    );
  }

  Future<void> _resetPassword() async {
    final u = _user;
    if (u == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset mot de passe'),
        content: Text('Envoyer un email de réinitialisation à ${u.email} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Envoyer')),
        ],
      ),
    );
    if (ok != true) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _run(
      () => AdminApiService.sendPasswordReset(u.id, token: token),
      'Email reset envoyé',
      guardTitle: 'Reset mot de passe',
      guardMessage: 'Confirmez l\'envoi du reset à ${u.email}',
    );
  }

  Future<void> _resendVerification() async {
    final u = _user;
    if (u == null) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _run(
      () => AdminApiService.resendVerification(u.id, token: token),
      'Email vérification renvoyé',
      guardTitle: 'Renvoyer vérification',
      guardMessage: 'Renvoyer l\'email de vérification à ${u.email} ?',
    );
  }

  Future<void> _deleteUser() async {
    final u = _user;
    if (u == null) return;
    final me = Provider.of<AuthProvider>(context, listen: false).user?.id;
    if (u.id == me) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de supprimer votre propre compte')),
      );
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer utilisateur'),
        content: Text('Supprimer définitivement ${u.email} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (!await _guard('Supprimer utilisateur', 'Suppression définitive de ${u.email}')) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      await AdminApiService.deleteUser(u.id, token: token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Utilisateur supprimé')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _impersonate() async {
    final u = _user;
    if (u == null || !u.isActive) return;
    if (!await _guard(
      'Impersonation',
      'Ouvrir l\'application en tant que ${u.email} pour diagnostiquer',
    )) {
      return;
    }
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.impersonateUser(u.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Session ouverte en tant que ${u.email}')),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final u = _user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détail utilisateur'),
        actions: const [MobileNotificationCenter()],
      ),
      body: AdminSafeBody(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : u == null
                    ? const Center(child: Text('Utilisateur introuvable'))
                    : ListView(
                        padding: adminScrollPadding(context, base: const EdgeInsets.all(16)),
                        children: [
                          ListTile(
                            leading: CircleAvatar(
                              radius: 28,
                              child: Text(u.firstName.isNotEmpty ? u.firstName[0] : '?'),
                            ),
                            title: Text('${u.firstName} ${u.lastName}'.trim(),
                                style: Theme.of(context).textTheme.titleLarge),
                            subtitle: Text(u.email),
                          ),
                          const Divider(),
                          _info('Rôle', u.role),
                          _info('Statut', u.isActive ? 'Actif' : 'Inactif'),
                          _info('Email vérifié', u.emailVerified ? 'Oui' : 'Non'),
                          if (u.phone.isNotEmpty) _info('Téléphone', u.phone),
                          _info('Créé le', u.createdAt.toLocal().toString().substring(0, 16)),
                          const SizedBox(height: 16),
                          const Text('Actions sensibles', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(
                            'Empreinte digitale requise avant chaque action.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 8),
                          if (u.isActive)
                            _action(
                              Icons.switch_account,
                              'Ouvrir l\'app en tant que cet utilisateur',
                              _impersonate,
                            ),
                          _action(Icons.admin_panel_settings, 'Changer le rôle', _pickRole),
                          _action(Icons.toggle_on, u.isActive ? 'Désactiver le compte' : 'Activer le compte', _toggleActive),
                          _action(Icons.key, 'Reset mot de passe (email)', _resetPassword),
                          _action(Icons.mark_email_read_outlined, 'Renvoyer email vérification', _resendVerification),
                          _action(Icons.delete_forever, 'Supprimer', _deleteUser, destructive: true),
                        ],
                      ),
      ),
    );
  }

  Widget _info(String label, String value) {
    return ListTile(title: Text(label), trailing: Text(value, style: const TextStyle(fontWeight: FontWeight.w500)));
  }

  Widget _action(IconData icon, String label, VoidCallback onTap, {bool destructive = false}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: destructive ? Colors.red : null),
        title: Text(label, style: TextStyle(color: destructive ? Colors.red : null)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

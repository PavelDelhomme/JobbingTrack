import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class TestDataScreen extends StatefulWidget {
  const TestDataScreen({super.key});

  @override
  State<TestDataScreen> createState() => _TestDataScreenState();
}

class _TestDataScreenState extends State<TestDataScreen> {
  bool _loading = false;
  Map<String, dynamic>? _summary;

  static const _presets = {
    'minimal': {
      'label': 'Minimal',
      'config': {
        'users': 2,
        'companies': 5,
        'applications': 5,
        'contacts': 5,
        'interviews': 2,
        'followups': 3,
        'calls': 2,
        'events': 5,
        'deletedItems': 1,
        'archivedItems': 1,
      },
    },
    'standard': {
      'label': 'Standard',
      'config': {
        'users': 3,
        'companies': 10,
        'applications': 20,
        'contacts': 15,
        'interviews': 8,
        'followups': 12,
        'calls': 10,
        'events': 20,
        'deletedItems': 5,
        'archivedItems': 3,
      },
    },
    'demo': {
      'label': 'Démo',
      'config': {
        'users': 1,
        'companies': 8,
        'applications': 15,
        'contacts': 12,
        'interviews': 6,
        'followups': 8,
        'calls': 5,
        'events': 15,
        'deletedItems': 2,
        'archivedItems': 2,
      },
    },
  };

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    setState(() => _loading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final s = await AdminApiService.fetchTestDataSummary(token: token);
      if (mounted) setState(() => _summary = s);
    } catch (_) {
      /* summary optionnel */
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generate(Map<String, dynamic> config) async {
    final ok = await _confirm('Générer des données de test ?', 'Crée candidatures, contacts, entretiens, etc.');
    if (!ok) return;
    setState(() => _loading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final res = await AdminApiService.generateTestData(token: token, config: config);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message']?.toString() ?? 'Génération lancée')));
        await _loadSummary();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _clear({required bool onlyTest}) async {
    final ok = await _confirm(
      onlyTest ? 'Purger données test' : 'Purger TOUTES les données',
      onlyTest ? 'Supprime uniquement les entrées marquées test.' : 'Action destructive — toutes les données seront supprimées.',
    );
    if (!ok) return;
    setState(() => _loading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final res = await AdminApiService.clearTestData(token: token, onlyTestData: onlyTest);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message']?.toString() ?? 'Purge effectuée')));
        await _loadSummary();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _tagLikely() async {
    setState(() => _loading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      await AdminApiService.tagLikelyTestData(token: token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marquage test effectué')));
        await _loadSummary();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<bool> _confirm(String title, String body) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(title),
            content: Text(body),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Données de test'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_summary != null)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text('Résumé : ${_summary.toString()}', style: const TextStyle(fontSize: 12)),
                    ),
                  ),
                const Text('Presets de génération', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                ..._presets.entries.map((e) => Card(
                      child: ListTile(
                        leading: const Icon(Icons.science_outlined),
                        title: Text(e.value['label'] as String),
                        subtitle: Text('${(e.value['config'] as Map)['applications']} candidatures · ${(e.value['config'] as Map)['contacts']} contacts'),
                        trailing: const Icon(Icons.play_arrow),
                        onTap: () => _generate(Map<String, dynamic>.from(e.value['config'] as Map)),
                      ),
                    )),
                const SizedBox(height: 16),
                const Text('Maintenance', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                ListTile(
                  leading: const Icon(Icons.label_outline),
                  title: const Text('Marquer données probables test'),
                  onTap: _tagLikely,
                ),
                ListTile(
                  leading: const Icon(Icons.cleaning_services),
                  title: const Text('Purger données test uniquement'),
                  onTap: () => _clear(onlyTest: true),
                ),
                ListTile(
                  leading: Icon(Icons.warning_amber, color: Colors.red.shade700),
                  title: Text('Purger toutes les données', style: TextStyle(color: Colors.red.shade700)),
                  onTap: () => _clear(onlyTest: false),
                ),
              ],
            ),
    );
  }
}

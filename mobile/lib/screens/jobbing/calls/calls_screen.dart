import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends State<CallsScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  List<Call> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    setState(() => _loading = true);
    try {
      final list = await ApiService.getCalls(token: auth.token);
      if (mounted) setState(() { _calls = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        title: const Text('Appels'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _calls.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_in_talk, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text('Aucun appel', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _calls.length,
                    itemBuilder: (context, index) {
                      final c = _calls[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(c.subject),
                          subtitle: Text(formatSmartEventDate(c.callDate)),
                          leading: const Icon(Icons.phone, color: Colors.green),
                          onTap: () => _showCallDetail(context, c),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  Future<void> _showCallDetail(BuildContext context, Call call) async {
    final subjectController = TextEditingController(text: call.subject);
    final notesController = TextEditingController(text: call.notes ?? '');
    final auth = Provider.of<AuthProvider>(context, listen: false);

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Détail appel'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Date : ${formatSmartEventDate(call.callDate)}'),
              const SizedBox(height: 8),
              Text('Cible : ${call.targetLabel}'),
              const SizedBox(height: 12),
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(labelText: 'Objet', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 4,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
          ElevatedButton(
            onPressed: () async {
              try {
                await ApiService.updateCall(
                  id: call.id,
                  subject: subjectController.text.trim(),
                  notes: notesController.text.trim(),
                  token: auth.token,
                );
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Appel mis à jour')),
                  );
                  _load();
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                }
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/screens/application_form_screen.dart';
import 'package:intl/intl.dart';

/// Écran détail d'une candidature : infos, liste relances/entretiens/appels, actions Ajouter relance / entretien / appel.
/// Retour (back) revient à la liste des candidatures sans quitter l'app.
class ApplicationDetailScreen extends StatefulWidget {
  final Application application;

  const ApplicationDetailScreen({super.key, required this.application});

  @override
  State<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  List<FollowUp> _followUps = [];
  List<Interview> _interviews = [];
  List<Call> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.token;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getFollowUps(applicationId: widget.application.id, token: token),
        ApiService.getInterviews(applicationId: widget.application.id, token: token),
        ApiService.getCallsByApplication(widget.application.id, token: token),
      ]);
      if (mounted) {
        setState(() {
          _followUps = results[0] as List<FollowUp>;
          _interviews = results[1] as List<Interview>;
          _calls = results[2] as List<Call>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.application;
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Scaffold(
      appBar: AppBar(
        title: Text(app.position),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(true),
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              final result = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => ApplicationFormScreen(application: app),
                ),
              );
              if (result == true && mounted) _load();
            },
            icon: const Icon(Icons.edit, size: 20),
            label: const Text('Modifier'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(app.company.name, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                          const SizedBox(height: 4),
                          Text(app.position, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _statusChip(app.status),
                              const SizedBox(width: 8),
                              Text('📅 ${dateFormat.format(app.appliedDate)}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _sectionTitle('Relances', _followUps.length, onAdd: () => _showAddRelance(context)),
                  if (_followUps.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('Aucune relance', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                    )
                  else
                    ..._followUps.take(5).map((f) => _tile('📧 ${dateFormat.format(f.scheduledDate)}', f.notes ?? '')),
                  const SizedBox(height: 20),
                  _sectionTitle('Entretiens', _interviews.length, onAdd: () => _showAddEntretien(context)),
                  if (_interviews.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('Aucun entretien', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                    )
                  else
                    ..._interviews.take(5).map((i) => _tile('📅 ${dateFormat.format(i.interviewDate)}', i.location ?? i.notes ?? '')),
                  const SizedBox(height: 20),
                  _sectionTitle('Appels', _calls.length, onAdd: () => _showAddAppel(context)),
                  if (_calls.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('Aucun appel', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                    )
                  else
                    ..._calls.take(5).map((c) => _tile('📞 ${c.subject}', dateFormat.format(c.callDate))),
                ],
              ),
            ),
    );
  }

  Widget _statusChip(String status) {
    Color color = Colors.grey;
    if (status.contains('INTERVIEW')) color = Colors.green;
    else if (status == 'REJECTED') color = Colors.red;
    else if (status == 'SENT' || status.contains('PENDING')) color = Colors.blue;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(status.replaceAll('_', ' '), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: color)),
    );
  }

  Widget _sectionTitle(String title, int count, {VoidCallback? onAdd}) {
    String addLabel = 'Ajouter';
    if (title == 'Relances') addLabel = 'Ajouter relance';
    else if (title == 'Entretiens') addLabel = 'Ajouter entretien';
    else if (title == 'Appels') addLabel = 'Ajouter appel';
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        TextButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.add, size: 18),
          label: Text(addLabel),
        ),
      ],
    );
  }

  Widget _tile(String title, String subtitle) {
    return ListTile(
      dense: true,
      title: Text(title, style: const TextStyle(fontSize: 14)),
      subtitle: subtitle.isNotEmpty ? Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[600]), maxLines: 1, overflow: TextOverflow.ellipsis) : null,
    );
  }

  Future<void> _showAddRelance(BuildContext context) async {
    DateTime date = DateTime.now().add(const Duration(days: 3));
    final notesController = TextEditingController();
    final picked = await showDatePicker(context: context, initialDate: date, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
    if (picked != null) date = picked;
    if (!mounted) return;
    final notes = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouvelle relance'),
        content: TextField(
          controller: notesController,
          decoration: const InputDecoration(labelText: 'Notes (optionnel)', border: OutlineInputBorder()),
          maxLines: 2,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, notesController.text), child: const Text('Créer')),
        ],
      ),
    );
    if (!mounted || notes == null) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await ApiService.createFollowUp(applicationId: widget.application.id, followUpDate: date, notes: notes.isEmpty ? null : notes, token: auth.token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Relance créée')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _showAddEntretien(BuildContext context) async {
    DateTime date = DateTime.now().add(const Duration(days: 7));
    final picked = await showDatePicker(context: context, initialDate: date, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
    if (picked != null) date = picked;
    if (!mounted) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await ApiService.createInterview(applicationId: widget.application.id, interviewDate: date, token: auth.token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entretien créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _showAddAppel(BuildContext context) async {
    final subjectController = TextEditingController(text: 'Appel ${widget.application.company.name}');
    DateTime date = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: date, firstDate: DateTime.now().subtract(const Duration(days: 30)), lastDate: DateTime.now().add(const Duration(days: 365)));
    if (picked != null) date = picked;
    if (!mounted) return;
    final subject = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouvel appel'),
        content: TextField(
          controller: subjectController,
          decoration: const InputDecoration(labelText: 'Sujet', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, subjectController.text.trim()), child: const Text('Créer')),
        ],
      ),
    );
    if (subject == null || subject.isEmpty || !mounted) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await ApiService.createCall(applicationId: widget.application.id, callDate: date, subject: subject, token: auth.token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appel créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }
}

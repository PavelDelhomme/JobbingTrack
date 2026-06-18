import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/linked_entity_parsers.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';
import 'package:jobbingtrack_mobile/widgets/entity_link_tile.dart';

class CallDetailScreen extends StatefulWidget {
  final Call call;

  const CallDetailScreen({super.key, required this.call});

  @override
  State<CallDetailScreen> createState() => _CallDetailScreenState();
}

class _CallDetailScreenState extends State<CallDetailScreen> {
  Map<String, dynamic>? _raw;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final raw = await ApiService.getCallDetail(widget.call.id, token: token);
      if (mounted) setState(() {
        _raw = raw;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showEditDialog() async {
    final call = widget.call;
    DateTime date = call.callDate;
    final subjectController = TextEditingController(text: call.subject);
    final notesController = TextEditingController(text: call.notes ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Modifier l\'appel'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today),
                  title: Text(formatSmartEventDate(date)),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: date,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => date = picked);
                  },
                ),
                TextField(
                  controller: subjectController,
                  decoration: const InputDecoration(labelText: 'Objet', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder(), alignLabelWithHint: true),
                  maxLines: 4,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enregistrer')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      await ApiService.updateCall(
        id: call.id,
        callDate: date,
        subject: subjectController.text.trim(),
        notes: notesController.text.trim(),
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appel mis à jour')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final call = widget.call;
    final appRaw = nestedMap(_raw, 'application');
    final companyRaw = nestedMap(_raw, 'company') ?? nestedMap(appRaw, 'company');
    final contactRaw = nestedMap(_raw, 'contact');
    final app = applicationFromLinkedMap(appRaw);
    final company = companyFromLinkedMap(companyRaw);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Appel'),
        actions: [
          IconButton(tooltip: 'Modifier', icon: const Icon(Icons.edit_outlined), onPressed: _showEditDialog),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: scrollSafePadding(context),
              children: [
                EntityDetailField(label: 'Objet', value: call.subject),
                EntityDetailField(label: 'Date', value: formatSmartEventDate(call.callDate)),
                EntityDetailField(label: 'Notes', value: call.notes ?? '', multiline: true),
                if (call.status != null && call.status!.isNotEmpty)
                  EntityDetailField(label: 'Statut', value: call.status!),
                const SizedBox(height: 8),
                const EntityLinkSectionHeader('Candidature liée'),
                if (app == null)
                  const EntityLinksEmptyHint('Aucune candidature')
                else
                  EntityLinkTile(
                    icon: Icons.assignment_outlined,
                    title: app.position,
                    subtitle: applicationStatusLabel(app.status),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
                    ),
                  ),
                const EntityLinkSectionHeader('Entreprise'),
                if (company == null)
                  const EntityLinksEmptyHint('Aucune entreprise')
                else
                  EntityLinkTile(
                    icon: Icons.business_outlined,
                    title: company.name,
                    subtitle: company.location,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: company)),
                    ),
                  ),
                const EntityLinkSectionHeader('Contact'),
                if (contactRaw == null)
                  EntityLinksEmptyHint(call.isCompanyOnly ? 'Appel entreprise (sans contact)' : 'Contact non renseigné')
                else
                  EntityLinkTile(
                    icon: Icons.person_outline,
                    title: contactDisplayNameFromMap(contactRaw),
                    subtitle: contactRaw['email']?.toString() ?? contactRaw['phone']?.toString() ?? '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: contactRaw)),
                    ),
                  ),
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
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

class FollowupDetailScreen extends StatefulWidget {
  final FollowUp followUp;

  const FollowupDetailScreen({super.key, required this.followUp});

  @override
  State<FollowupDetailScreen> createState() => _FollowupDetailScreenState();
}

class _FollowupDetailScreenState extends State<FollowupDetailScreen> {
  FollowUp? _followUp;
  Application? _application;
  Company? _company;
  Map<String, dynamic>? _contact;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final raw = await ApiService.getFollowUpDetail(widget.followUp.id, token: token);
      Application? app = applicationFromLinkedMap(nestedMap(raw, 'application'));
      if (app == null && raw['applicationId'] != null) {
        try {
          app = await ApiService.getApplication(raw['applicationId'].toString(), token: token);
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _followUp = FollowUp.fromJson(raw);
          _application = app;
          _company = companyFromLinkedMap(nestedMap(raw, 'company')) ?? app?.company;
          _contact = firstContactFromEntityRaw(raw);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _followUp = widget.followUp;
          _loading = false;
        });
      }
    }
  }

  Future<void> _showEditDialog() async {
    final f = _followUp ?? widget.followUp;
    DateTime date = f.scheduledDate;
    final notesController = TextEditingController(text: f.notes ?? '');
    final responseController = TextEditingController(text: f.response ?? '');
    String status = f.status;
    const statuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Modifier la relance'),
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
                DropdownButtonFormField<String>(
                  value: status,
                  decoration: const InputDecoration(labelText: 'Statut', border: OutlineInputBorder()),
                  items: statuses
                      .map((s) => DropdownMenuItem(value: s, child: Text(followUpStatusLabel(s))))
                      .toList(),
                  onChanged: (v) => setDialogState(() => status = v ?? status),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder(), alignLabelWithHint: true),
                  maxLines: 4,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: responseController,
                  decoration: const InputDecoration(labelText: 'Réponse', border: OutlineInputBorder(), alignLabelWithHint: true),
                  maxLines: 3,
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
      await ApiService.updateFollowUp(
        f.id,
        followUpDate: date,
        notes: notesController.text.trim(),
        response: responseController.text.trim(),
        status: status,
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Relance mise à jour')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = _followUp ?? widget.followUp;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Relance'),
        actions: [
          IconButton(tooltip: 'Modifier', icon: const Icon(Icons.edit_outlined), onPressed: _showEditDialog),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: scrollSafePadding(context),
              children: [
                EntityDetailField(label: 'Date prévue', value: formatSmartEventDate(f.scheduledDate)),
                EntityDetailField(label: 'Statut', value: followUpStatusLabel(f.status)),
                EntityDetailField(label: 'Type', value: f.type),
                EntityDetailField(label: 'Notes', value: f.notes ?? '', multiline: true),
                EntityDetailField(label: 'Réponse', value: f.response ?? '', multiline: true),
                if (f.completedAt != null)
                  EntityDetailField(
                    label: 'Terminée le',
                    value: formatUserLocalDateTime(f.completedAt!.toIso8601String()),
                  ),
                const SizedBox(height: 8),
                const EntityLinkSectionHeader('Candidature liée'),
                if (_application == null)
                  const EntityLinksEmptyHint('Aucune candidature')
                else
                  EntityLinkTile(
                    icon: Icons.assignment_outlined,
                    title: _application!.position,
                    subtitle: applicationStatusLabel(_application!.status),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ApplicationDetailScreen(application: _application!),
                      ),
                    ),
                  ),
                const EntityLinkSectionHeader('Entreprise'),
                if (_company == null || _company!.name.isEmpty)
                  const EntityLinksEmptyHint('Aucune entreprise')
                else
                  EntityLinkTile(
                    icon: Icons.business_outlined,
                    title: _company!.name,
                    subtitle: _company!.location,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: _company!)),
                    ),
                  ),
                const EntityLinkSectionHeader('Contact'),
                if (!isMeaningfulContactMap(_contact))
                  const EntityLinksEmptyHint('Aucun contact')
                else
                  EntityLinkTile(
                    icon: Icons.person_outline,
                    title: contactDisplayNameFromMap(_contact),
                    subtitle: _contact!['email']?.toString() ?? _contact!['phone']?.toString() ?? '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: _contact!)),
                    ),
                  ),
              ],
            ),
    );
  }
}

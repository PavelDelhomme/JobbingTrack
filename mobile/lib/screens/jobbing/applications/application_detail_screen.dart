import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/contact_picker_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

/// Détail complet d'une candidature : entreprise, contacts, relances, entretiens, appels.
class ApplicationDetailScreen extends StatefulWidget {
  final Application application;

  const ApplicationDetailScreen({super.key, required this.application});

  @override
  State<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  Application? _application;
  List<Map<String, dynamic>> _contacts = [];
  List<FollowUp> _followUps = [];
  List<Interview> _interviews = [];
  List<Call> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _application = widget.application;
    _load();
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.token;
    setState(() => _loading = true);
    Application? application = _application;
    var contacts = _contacts;
    var followUps = _followUps;
    var interviews = _interviews;
    var calls = _calls;
    final errors = <String>[];

    try {
      application = await ApiService.getApplication(widget.application.id, token: token);
    } catch (e) {
      errors.add('Candidature : ${e.toString().replaceAll('Exception: ', '')}');
    }
    try {
      contacts = await ApiService.getContactsByApplication(widget.application.id, token: token);
    } catch (e) {
      errors.add('Contacts : ${e.toString().replaceAll('Exception: ', '')}');
    }
    try {
      followUps = await ApiService.getFollowUps(applicationId: widget.application.id, token: token);
    } catch (e) {
      errors.add('Relances : ${e.toString().replaceAll('Exception: ', '')}');
    }
    try {
      interviews = await ApiService.getInterviews(applicationId: widget.application.id, token: token);
    } catch (e) {
      errors.add('Entretiens : ${e.toString().replaceAll('Exception: ', '')}');
    }
    try {
      calls = await ApiService.getCallsByApplication(widget.application.id, token: token);
    } catch (e) {
      errors.add('Appels : ${e.toString().replaceAll('Exception: ', '')}');
    }

    if (mounted) {
      setState(() {
        if (application != null) _application = application;
        _contacts = contacts;
        _followUps = followUps;
        _interviews = interviews;
        _calls = calls;
        _loading = false;
      });
      if (errors.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errors.join('\n')), duration: const Duration(seconds: 4)),
        );
      }
    }
  }

  Application get app => _application ?? widget.application;

  @override
  Widget build(BuildContext context) {
    final statusColor = applicationStatusColor(app.status);

    return Scaffold(
      appBar: AppBar(
        title: Text(app.position),
        actions: [
          IconButton(
            tooltip: 'Modifier',
            onPressed: () async {
              final result = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => ApplicationFormScreen(application: app)),
              );
              if (result == true && mounted) _load();
            },
            icon: const Icon(Icons.edit_outlined),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: scrollSafePadding(context),
                children: [
                  _headerCard(statusColor),
                  const SizedBox(height: 16),
                  if (app.description.isNotEmpty)
                    EntityDetailField(label: 'Description', value: app.description, multiline: true),
                  if (app.location.isNotEmpty) EntityDetailField(label: 'Lieu', value: app.location),
                  if (app.notes.isNotEmpty) EntityDetailField(label: 'Notes', value: app.notes, multiline: true),
                  const SizedBox(height: 8),
                  _sectionHeader('Entreprise', onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: app.company)),
                    );
                  }),
                  _linkTile(
                    icon: Icons.business,
                    title: app.company.name.isNotEmpty ? app.company.name : 'Voir l\'entreprise',
                    subtitle: app.company.location.isNotEmpty ? app.company.location : app.company.website,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: app.company)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _sectionHeader('Contacts'),
                  if (_contacts.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Aucun contact lié', style: TextStyle(color: Colors.grey.shade600)),
                    )
                  else
                    ..._contacts.map((c) => _linkTile(
                          icon: Icons.person_outline,
                          title: contactDisplayName(c),
                          subtitle: c['email']?.toString() ?? c['phone']?.toString() ?? '',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: c)),
                          ),
                        )),
                  const SizedBox(height: 16),
                  _sectionHeader('Relances'),
                  if (_followUps.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Aucune relance', style: TextStyle(color: Colors.grey.shade600)),
                    )
                  else
                    ..._followUps.map((f) => _linkTile(
                          icon: Icons.schedule_send_outlined,
                          title: formatSmartEventDate(f.scheduledDate),
                          subtitle: f.notes ?? followUpStatusLabel(f.status),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: f)),
                          ),
                        )),
                  const SizedBox(height: 16),
                  _sectionHeader('Entretiens'),
                  if (_interviews.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Aucun entretien', style: TextStyle(color: Colors.grey.shade600)),
                    )
                  else
                    ..._interviews.map((i) => _linkTile(
                          icon: Icons.event_outlined,
                          title: formatSmartEventDate(i.interviewDate),
                          subtitle: i.location ?? i.notes ?? '',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
                          ),
                        )),
                  const SizedBox(height: 16),
                  _sectionHeader('Appels'),
                  if (_calls.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Aucun appel', style: TextStyle(color: Colors.grey.shade600)),
                    )
                  else
                    ..._calls.map((c) => _linkTile(
                          icon: c.isCompanyOnly ? Icons.business_outlined : Icons.phone_outlined,
                          title: c.subject,
                          subtitle: '${c.isCompanyOnly ? 'Entreprise' : 'Contact · ${c.targetLabel}'} · ${formatSmartEventDate(c.callDate)}',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => CallDetailScreen(call: c)),
                          ),
                        )),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showQuickAddMenu(context),
        icon: const Icon(Icons.add),
        label: const Text('Ajouter'),
      ),
    );
  }

  Future<void> _showQuickAddMenu(BuildContext context) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_add_outlined),
              title: const Text('Contact'),
              onTap: () => Navigator.pop(ctx, 'contact'),
            ),
            ListTile(
              leading: const Icon(Icons.schedule_send_outlined),
              title: const Text('Relance'),
              onTap: () => Navigator.pop(ctx, 'relance'),
            ),
            ListTile(
              leading: const Icon(Icons.event_outlined),
              title: const Text('Entretien'),
              onTap: () => Navigator.pop(ctx, 'entretien'),
            ),
            ListTile(
              leading: const Icon(Icons.phone_outlined),
              title: const Text('Appel'),
              onTap: () => Navigator.pop(ctx, 'appel'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    switch (choice) {
      case 'contact':
        await _showAddContact(context);
      case 'relance':
        await _showAddRelance(context);
      case 'entretien':
        await _showAddEntretien(context);
      case 'appel':
        await _showAddAppel(context);
    }
  }

  Widget _headerCard(Color statusColor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(app.company.name, style: TextStyle(fontSize: 14, color: Colors.purple.shade700, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(app.position, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  label: Text(applicationStatusLabel(app.status)),
                  backgroundColor: statusColor.withValues(alpha: 0.12),
                  side: BorderSide(color: statusColor.withValues(alpha: 0.35)),
                  labelStyle: TextStyle(color: statusColor, fontWeight: FontWeight.w600),
                ),
                Chip(
                  avatar: const Icon(Icons.event, size: 16),
                  label: Text('Postulé · ${formatSmartPostulationDate(app.appliedDate)}'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, {String? actionLabel, VoidCallback? onAction, VoidCallback? onTap}) {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: onTap,
            child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton.icon(onPressed: onAction, icon: const Icon(Icons.add, size: 18), label: Text(actionLabel)),
      ],
    );
  }

  Widget _linkTile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: Colors.blue.shade700),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: subtitle.isNotEmpty ? Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis) : null,
        trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
        onTap: onTap,
      ),
    );
  }

  Future<void> _showAddContact(BuildContext context) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_add_outlined),
              title: const Text('Créer un nouveau contact'),
              onTap: () => Navigator.pop(ctx, 'create'),
            ),
            ListTile(
              leading: const Icon(Icons.link),
              title: const Text('Lier un contact existant'),
              onTap: () => Navigator.pop(ctx, 'link'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    if (choice == 'create') {
      await _createContactDialog();
    } else {
      await _linkExistingContact();
    }
  }

  Future<void> _createContactDialog() async {
    final firstName = TextEditingController();
    final lastName = TextEditingController();
    final email = TextEditingController();
    final phone = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouveau contact'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: firstName, decoration: const InputDecoration(labelText: 'Prénom *')),
              TextField(controller: lastName, decoration: const InputDecoration(labelText: 'Nom *')),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Téléphone')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Créer')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    if (firstName.text.trim().isEmpty || lastName.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Prénom et nom requis')));
      return;
    }
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final created = await ApiService.createContact(
        firstName: firstName.text.trim(),
        lastName: lastName.text.trim(),
        email: email.text.trim(),
        phone: phone.text.trim(),
        companyId: app.company.id.isNotEmpty ? app.company.id : null,
        token: token,
      );
      await ApiService.linkContactToApplication(
        contactId: created['id'].toString(),
        applicationId: app.id,
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact ajouté')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _linkExistingContact() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    List<Map<String, dynamic>> candidates = [];
    try {
      if (app.company.id.isNotEmpty) {
        candidates = await ApiService.getContactsByCompany(app.company.id, token: token);
      }
      if (candidates.isEmpty) {
        candidates = await ApiService.getContacts(token: token);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      return;
    }
    final linkedIds = _contacts.map((c) => c['id']).toSet();
    candidates = candidates.where((c) => !linkedIds.contains(c['id'])).toList();
    if (!mounted) return;
    if (candidates.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Aucun contact disponible à lier')));
      return;
    }
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        builder: (_, controller) => ListView.builder(
          controller: controller,
          itemCount: candidates.length,
          itemBuilder: (_, i) {
            final c = candidates[i];
            return ListTile(
              title: Text(contactDisplayName(c)),
              subtitle: Text(c['email']?.toString() ?? ''),
              onTap: () => Navigator.pop(ctx, c),
            );
          },
        ),
      ),
    );
    if (picked == null || !mounted) return;
    try {
      await ApiService.linkContactToApplication(
        contactId: picked['id'].toString(),
        applicationId: app.id,
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact lié')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _showAddRelance(BuildContext context) async {
    DateTime date = DateTime.now().add(const Duration(days: 3));
    final notesController = TextEditingController();
    String channel = 'Email';
    Map<String, dynamic>? selectedContact;
    const channels = ['Email', 'Téléphone', 'LinkedIn', 'InMail', 'Courrier', 'Autre'];

    final token = Provider.of<AuthProvider>(context, listen: false).token;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nouvelle relance'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today),
                  title: Text(formatSmartEventDate(date)),
                  subtitle: const Text('Date prévue'),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: date,
                      firstDate: DateTime.now().subtract(const Duration(days: 1)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => date = picked);
                  },
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: channel,
                  decoration: const InputDecoration(
                    labelText: 'Canal / plateforme',
                    border: OutlineInputBorder(),
                  ),
                  items: channels.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setDialogState(() => channel = v ?? channel),
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    selectedContact == null
                        ? 'Contact (optionnel)'
                        : contactDisplayName(selectedContact!),
                  ),
                  subtitle: Text(
                    selectedContact == null
                        ? 'Relance liée à ${app.company.name.isNotEmpty ? app.company.name : "l\'entreprise"}'
                        : 'Appuyer pour changer',
                  ),
                  trailing: selectedContact != null
                      ? IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => setDialogState(() => selectedContact = null),
                        )
                      : const Icon(Icons.person_search),
                  onTap: () async {
                    final picked = await showContactPickerSheet(
                      ctx,
                      candidates: _contacts,
                      onCreateContact: ({required String firstName, required String lastName, String? email, String? phone}) async {
                        final created = await ApiService.createContact(
                          firstName: firstName,
                          lastName: lastName,
                          email: email ?? '',
                          phone: phone ?? '',
                          companyId: app.company.id.isNotEmpty ? app.company.id : null,
                          token: token,
                        );
                        await ApiService.linkContactToApplication(
                          contactId: created['id'].toString(),
                          applicationId: app.id,
                          token: token,
                        );
                        return created;
                      },
                    );
                    if (picked != null) setDialogState(() => selectedContact = picked);
                  },
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes',
                    hintText: 'Contexte, message prévu, rappels…',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                  maxLines: 5,
                  minLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Créer')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final noteParts = <String>['[Canal: $channel]'];
      if (notesController.text.trim().isNotEmpty) noteParts.add(notesController.text.trim());
      await ApiService.createFollowUp(
        applicationId: app.id,
        followUpDate: date,
        notes: noteParts.join('\n'),
        contactId: selectedContact?['id']?.toString(),
        token: auth.token,
      );
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
    final locationController = TextEditingController();
    final videoLinkController = TextEditingController();
    final durationController = TextEditingController(text: '60');
    final notesController = TextEditingController();
    String style = 'Présentiel';
    const styles = ['Présentiel', 'Distanciel', 'Hybride'];
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nouvel entretien'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today),
                  title: Text(formatSmartEventDate(date)),
                  subtitle: const Text('Date et heure (jour)'),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: date,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => date = picked);
                  },
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: style,
                  decoration: const InputDecoration(labelText: 'Format', border: OutlineInputBorder()),
                  items: styles.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (v) => setDialogState(() => style = v ?? style),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: locationController,
                  decoration: const InputDecoration(labelText: 'Lieu (optionnel)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: videoLinkController,
                  decoration: const InputDecoration(
                    labelText: 'Lien visio (optionnel)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: durationController,
                  decoration: const InputDecoration(
                    labelText: 'Durée estimée (minutes)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                  maxLines: 5,
                  minLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Créer')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final duration = int.tryParse(durationController.text.trim());
      final noteParts = <String>['[Format: $style]'];
      if (notesController.text.trim().isNotEmpty) noteParts.add(notesController.text.trim());
      await ApiService.createInterview(
        applicationId: app.id,
        interviewDate: date,
        location: locationController.text.trim().isEmpty ? null : locationController.text.trim(),
        videoLink: videoLinkController.text.trim().isEmpty ? null : videoLinkController.text.trim(),
        estimatedDuration: duration,
        notes: noteParts.join('\n'),
        token: auth.token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entretien créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _showAddAppel(BuildContext context) async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    final candidates = <Map<String, dynamic>>[..._contacts];
    try {
      if (app.company.id.isNotEmpty) {
        final byCompany = await ApiService.getContactsByCompany(app.company.id, token: token);
        for (final c in byCompany) {
          if (!candidates.any((x) => x['id'] == c['id'])) candidates.add(c);
        }
      }
      final all = await ApiService.getContacts(token: token);
      for (final c in all) {
        if (!candidates.any((x) => x['id'] == c['id'])) candidates.add(c);
      }
    } catch (_) {}

    if (!mounted) return;
    final contact = await showContactPickerSheet(
      context,
      allowWithoutContact: true,
      withoutContactLabel: app.company.name.isNotEmpty
          ? 'Appel sans contact · ${app.company.name}'
          : 'Appel sans contact',
      candidates: candidates,
      onCreateContact: ({required String firstName, required String lastName, String? email, String? phone}) async {
        final created = await ApiService.createContact(
          firstName: firstName,
          lastName: lastName,
          email: email ?? '',
          phone: phone ?? '',
          companyId: app.company.id.isNotEmpty ? app.company.id : null,
          token: token,
        );
        await ApiService.linkContactToApplication(
          contactId: created['id'].toString(),
          applicationId: app.id,
          token: token,
        );
        return created;
      },
    );
    if (contact == null || !mounted) return;

    final withoutContact = contact[kCallWithoutContactFlag] == true;
    DateTime date = DateTime.now();
    final defaultSubject = withoutContact
        ? 'Appel · ${app.company.name.isNotEmpty ? app.company.name : app.position}'
        : 'Appel · ${contactDisplayName(contact)}';
    final subjectController = TextEditingController(text: defaultSubject);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nouvel appel'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!withoutContact)
                  Text('Contact : ${contactDisplayName(contact)}', style: TextStyle(color: Colors.grey.shade700))
                else
                  Text(
                    'Sans contact — entreprise : ${app.company.name.isNotEmpty ? app.company.name : "—"}',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today),
                  title: Text(formatSmartEventDate(date)),
                  subtitle: const Text('Date'),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: date,
                      firstDate: DateTime.now().subtract(const Duration(days: 30)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => date = picked);
                  },
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: subjectController,
                  decoration: const InputDecoration(labelText: 'Sujet', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () {
                if (subjectController.text.trim().isEmpty) return;
                Navigator.pop(ctx, true);
              },
              child: const Text('Créer'),
            ),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    final subject = subjectController.text.trim();
    if (subject.isEmpty) return;
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await ApiService.createCall(
        applicationId: app.id,
        callDate: date,
        subject: subject,
        contactId: withoutContact ? null : contact['id']?.toString(),
        token: auth.token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appel créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }
}

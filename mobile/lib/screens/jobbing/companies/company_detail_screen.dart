import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_edit_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

class CompanyDetailScreen extends StatefulWidget {
  final Company company;

  const CompanyDetailScreen({super.key, required this.company});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> {
  Company? _company;
  List<Map<String, dynamic>> _contacts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.company.id.isEmpty) {
      setState(() {
        _company = widget.company;
        _loading = false;
      });
      return;
    }
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await Provider.of<ApplicationProvider>(context, listen: false).loadApplications(token: auth.token);
    final token = auth.token;
    try {
      final fresh = await ApiService.getCompany(widget.company.id, token: token);
      var contacts = <Map<String, dynamic>>[];
      try {
        contacts = await ApiService.getContactsByCompany(widget.company.id, token: token);
      } catch (_) {}
      if (mounted) setState(() {
        _company = fresh;
        _contacts = contacts;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _company = widget.company;
        _loading = false;
      });
    }
  }

  Future<void> _createContactDialog() async {
    final c = _company ?? widget.company;
    if (c.id.isEmpty) return;
    final firstName = TextEditingController();
    final lastName = TextEditingController();
    final email = TextEditingController();
    final phone = TextEditingController();
    final notes = TextEditingController();
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
              TextField(
                controller: notes,
                decoration: const InputDecoration(labelText: 'Notes', alignLabelWithHint: true),
                maxLines: 3,
                minLines: 2,
              ),
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
      await ApiService.createContact(
        firstName: firstName.text.trim(),
        lastName: lastName.text.trim(),
        email: email.text.trim(),
        phone: phone.text.trim(),
        notes: notes.text.trim(),
        companyId: c.id,
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _company ?? widget.company;
    final apps = Provider.of<ApplicationProvider>(context).applications
        .where((a) => a.company.id == c.id)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(c.name.isNotEmpty ? c.name : 'Entreprise'),
        actions: [
          IconButton(
            tooltip: 'Modifier',
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final ok = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => CompanyEditScreen(company: c)),
              );
              if (ok == true) _load();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: scrollSafePadding(context),
              children: [
                EntityDetailField(label: 'Nom', value: c.name),
                EntityDetailField(label: 'Site web', value: c.website),
                EntityDetailField(label: 'Secteur', value: c.industry),
                EntityDetailField(label: 'Taille', value: c.size),
                EntityDetailField(label: 'Localisation', value: c.location),
                EntityDetailField(label: 'Description', value: c.description, multiline: true),
                EntityDetailField(
                  label: 'Créée le',
                  value: formatUserLocalDateTime(c.createdAt.toIso8601String(), pattern: 'd MMM y HH:mm'),
                ),
                const SizedBox(height: 16),
                Text('Candidatures (${apps.length})', style: Theme.of(context).textTheme.titleMedium),
                if (apps.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text('Aucune candidature', style: TextStyle(color: Colors.grey.shade600)),
                  )
                else
                  ...apps.map((a) => ListTile(
                        leading: const Icon(Icons.assignment_outlined),
                        title: Text(a.position),
                        subtitle: Text(applicationStatusLabel(a.status)),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: a)),
                        ),
                      )),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Text('Contacts (${_contacts.length})', style: Theme.of(context).textTheme.titleMedium),
                    ),
                    TextButton.icon(
                      onPressed: _createContactDialog,
                      icon: const Icon(Icons.person_add_outlined, size: 18),
                      label: const Text('Ajouter'),
                    ),
                  ],
                ),
                if (_contacts.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text('Aucun contact', style: TextStyle(color: Colors.grey.shade600)),
                  )
                else
                  ..._contacts.map((contact) => ListTile(
                        leading: const Icon(Icons.person_outline),
                        title: Text(contactDisplayName(contact)),
                        subtitle: Text(contact['email']?.toString() ?? contact['phone']?.toString() ?? ''),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: contact)),
                        ),
                      )),
              ],
            ),
    );
  }
}

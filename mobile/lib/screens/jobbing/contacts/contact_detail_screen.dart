import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_edit_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_edit_screen.dart';

class ContactDetailScreen extends StatefulWidget {
  final Map<String, dynamic> contact;

  const ContactDetailScreen({super.key, required this.contact});

  @override
  State<ContactDetailScreen> createState() => _ContactDetailScreenState();
}

class _ContactDetailScreenState extends State<ContactDetailScreen> {
  Map<String, dynamic>? _contact;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.contact['id']?.toString() ?? '';
    if (id.isEmpty) {
      setState(() {
        _contact = widget.contact;
        _loading = false;
      });
      return;
    }
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final fresh = await ApiService.getContact(id, token: token);
      if (mounted) setState(() {
        _contact = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _contact = widget.contact;
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> _linkedCompanies(Map<String, dynamic> c) {
    final raw = c['companies'];
    if (raw is! List) return [];
    return raw.map((e) {
      if (e is Map && e['company'] is Map) return Map<String, dynamic>.from(e['company'] as Map);
      if (e is Map) return Map<String, dynamic>.from(e);
      return <String, dynamic>{};
    }).where((m) => m['name'] != null || m['id'] != null).toList();
  }

  @override
  Widget build(BuildContext context) {
    final c = _contact ?? widget.contact;
    final companies = _linkedCompanies(c);
    final apps = Provider.of<ApplicationProvider>(context).applications
        .where((a) => companies.any((co) => co['id']?.toString() == a.company.id))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(contactDisplayName(c)),
        actions: [
          IconButton(
            tooltip: 'Modifier',
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final ok = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => ContactEditScreen(contact: c)),
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
                EntityDetailField(label: 'Prénom', value: c['firstName']?.toString() ?? ''),
                EntityDetailField(label: 'Nom', value: c['lastName']?.toString() ?? ''),
                EntityDetailField(label: 'Email', value: c['email']?.toString() ?? ''),
                EntityDetailField(label: 'Téléphone', value: c['phone']?.toString() ?? ''),
                EntityDetailField(label: 'Poste', value: c['position']?.toString() ?? ''),
                EntityDetailField(label: 'Notes', value: c['notes']?.toString() ?? '', multiline: true),
                EntityDetailField(label: 'Créé le', value: formatUserLocalDateTime(c['createdAt']?.toString())),
                const SizedBox(height: 16),
                Text('Entreprises liées', style: Theme.of(context).textTheme.titleMedium),
                if (companies.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text('Aucune entreprise', style: TextStyle(color: Colors.grey.shade600)),
                  )
                else
                  ...companies.map((co) => ListTile(
                        leading: const Icon(Icons.business_outlined),
                        title: Text(co['name']?.toString() ?? 'Entreprise'),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CompanyDetailScreen(
                              company: Company.fromJson(Map<String, dynamic>.from(co)),
                            ),
                          ),
                        ),
                      )),
                const SizedBox(height: 16),
                Text('Candidatures liées', style: Theme.of(context).textTheme.titleMedium),
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
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
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
      if (mounted) setState(() {
        _company = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _company = widget.company;
        _loading = false;
      });
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
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
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

class InterviewDetailScreen extends StatefulWidget {
  final Interview interview;

  const InterviewDetailScreen({super.key, required this.interview});

  @override
  State<InterviewDetailScreen> createState() => _InterviewDetailScreenState();
}

class _InterviewDetailScreenState extends State<InterviewDetailScreen> {
  Interview? _interview;
  Application? _application;
  Company? _company;
  List<Map<String, dynamic>> _contacts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final raw = await ApiService.getInterviewDetail(widget.interview.id, token: token);
      Application? app = applicationFromLinkedMap(nestedMap(raw, 'application'));
      final appId = raw['applicationId']?.toString() ?? widget.interview.applicationId;
      if (app == null && appId.isNotEmpty) {
        try {
          app = await ApiService.getApplication(appId, token: token);
        } catch (_) {}
      }
      var contacts = <Map<String, dynamic>>[];
      if (appId.isNotEmpty) {
        contacts = await ApiService.getContactsByApplication(appId, token: token);
      }
      if (mounted) {
        setState(() {
          _interview = Interview.fromJson(raw);
          _application = app;
          _company = companyFromLinkedMap(nestedMap(raw, 'company')) ?? app?.company;
          _contacts = contacts;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _interview = widget.interview;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final i = _interview ?? widget.interview;
    return Scaffold(
      appBar: AppBar(title: const Text('Entretien')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: scrollSafePadding(context),
              children: [
                EntityDetailField(label: 'Date', value: formatSmartEventDate(i.interviewDate)),
                EntityDetailField(label: 'Lieu', value: i.location ?? ''),
                EntityDetailField(label: 'Lien visio', value: i.videoLink ?? ''),
                EntityDetailField(label: 'Notes', value: i.notes ?? '', multiline: true),
                if (i.estimatedDuration != null)
                  EntityDetailField(label: 'Durée estimée', value: '${i.estimatedDuration} min'),
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
                const EntityLinkSectionHeader('Contacts liés'),
                if (_contacts.isEmpty)
                  const EntityLinksEmptyHint('Aucun contact sur cette candidature')
                else
                  ..._contacts.map(
                    (c) => EntityLinkTile(
                      icon: Icons.person_outline,
                      title: contactDisplayNameFromMap(c),
                      subtitle: c['email']?.toString() ?? c['phone']?.toString() ?? '',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: c)),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

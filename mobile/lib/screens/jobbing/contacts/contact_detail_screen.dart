import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_edit_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/linked_entity_parsers.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';
import 'package:jobbingtrack_mobile/widgets/entity_link_tile.dart';

class ContactDetailScreen extends StatefulWidget {
  final Map<String, dynamic> contact;

  const ContactDetailScreen({super.key, required this.contact});

  @override
  State<ContactDetailScreen> createState() => _ContactDetailScreenState();
}

class _ContactDetailScreenState extends State<ContactDetailScreen> {
  Map<String, dynamic>? _contact;
  List<Call> _calls = [];
  List<FollowUp> _followUps = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.contact['id']?.toString() ?? '';
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    if (id.isEmpty) {
      setState(() {
        _contact = widget.contact;
        _loading = false;
      });
      return;
    }
    try {
      final fresh = await ApiService.getContact(id, token: token);
      final apps = parseNestedApplications(fresh['applications'] as List<dynamic>?);
      final followUps = <FollowUp>[];
      for (final app in apps) {
        final appId = app['id']?.toString();
        if (appId == null || appId.isEmpty) continue;
        final list = await ApiService.getFollowUps(applicationId: appId, token: token);
        followUps.addAll(list);
      }
      final allCalls = await ApiService.getCalls(token: token);
      final linkedCalls = allCalls.where((c) => c.contactId == id).toList();
      if (mounted) {
        setState(() {
          _contact = fresh;
          _followUps = followUps;
          _calls = linkedCalls;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _contact = widget.contact;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _contact ?? widget.contact;
    final companies = parseNestedCompanies(c['companies'] as List<dynamic>?);
    final appMaps = parseNestedApplications(c['applications'] as List<dynamic>?);

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
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: scrollSafePadding(context),
                children: [
                  EntityDetailField(label: 'Prénom', value: c['firstName']?.toString() ?? ''),
                  EntityDetailField(label: 'Nom', value: c['lastName']?.toString() ?? ''),
                  EntityDetailField(label: 'Email', value: c['email']?.toString() ?? ''),
                  EntityDetailField(label: 'Téléphone', value: c['phone']?.toString() ?? ''),
                  EntityDetailField(label: 'Poste', value: c['position']?.toString() ?? ''),
                  EntityDetailField(label: 'Notes', value: c['notes']?.toString() ?? '', multiline: true),
                  EntityDetailField(label: 'Créé le', value: formatUserLocalDateTime(c['createdAt']?.toString())),
                  const SizedBox(height: 8),
                  const EntityLinkSectionHeader('Entreprises liées'),
                  if (companies.isEmpty)
                    const EntityLinksEmptyHint('Aucune entreprise')
                  else
                    ...companies.map((co) {
                      final company = companyFromLinkedMap(co);
                      return EntityLinkTile(
                        icon: Icons.business_outlined,
                        title: co['name']?.toString() ?? 'Entreprise',
                        subtitle: co['location']?.toString() ?? '',
                        onTap: company == null
                            ? null
                            : () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => CompanyDetailScreen(company: company),
                                  ),
                                ),
                      );
                    }),
                  const EntityLinkSectionHeader('Candidatures liées'),
                  if (appMaps.isEmpty)
                    const EntityLinksEmptyHint('Aucune candidature liée')
                  else
                    ...appMaps.map((raw) {
                      final app = applicationFromLinkedMap(raw);
                      final status = raw['status'] is Map
                          ? raw['status']['code']?.toString()
                          : raw['status']?.toString();
                      return EntityLinkTile(
                        icon: Icons.assignment_outlined,
                        title: raw['position']?.toString() ?? raw['title']?.toString() ?? 'Candidature',
                        subtitle: applicationStatusLabel(status ?? ''),
                        onTap: app == null
                            ? null
                            : () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ApplicationDetailScreen(application: app),
                                  ),
                                ),
                      );
                    }),
                  const EntityLinkSectionHeader('Relances liées'),
                  if (_followUps.isEmpty)
                    const EntityLinksEmptyHint('Aucune relance')
                  else
                    ..._followUps.map(
                      (f) => EntityLinkTile(
                        icon: Icons.schedule_send_outlined,
                        title: formatSmartEventDate(f.scheduledDate),
                        subtitle: f.notes ?? followUpStatusLabel(f.status),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: f)),
                        ),
                      ),
                    ),
                  const EntityLinkSectionHeader('Appels liés'),
                  if (_calls.isEmpty)
                    const EntityLinksEmptyHint('Aucun appel')
                  else
                    ..._calls.map(
                      (call) => EntityLinkTile(
                        icon: Icons.phone_outlined,
                        title: call.subject,
                        subtitle: formatSmartEventDate(call.callDate),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => CallDetailScreen(call: call)),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

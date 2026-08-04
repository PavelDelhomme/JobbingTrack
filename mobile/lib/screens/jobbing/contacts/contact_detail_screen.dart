import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_edit_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/linked_entity_parsers.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';
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
  List<Interview> _interviews = [];
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
      final interviews = <Interview>[];
      final seenFu = <String>{};
      final seenIv = <String>{};
      for (final app in apps) {
        final appId = app['id']?.toString();
        if (appId == null || appId.isEmpty) continue;
        try {
          for (final f in await ApiService.getFollowUps(applicationId: appId, token: token)) {
            if (seenFu.add(f.id)) followUps.add(f);
          }
        } catch (_) {}
        try {
          for (final i in await ApiService.getInterviews(applicationId: appId, token: token)) {
            if (seenIv.add(i.id)) interviews.add(i);
          }
        } catch (_) {}
      }
      followUps.sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
      interviews.sort((a, b) => b.interviewDate.compareTo(a.interviewDate));
      final allCalls = await ApiService.getCalls(token: token);
      final linkedCalls = allCalls.where((c) => c.contactId == id).toList()
        ..sort((a, b) => b.callDate.compareTo(a.callDate));
      if (mounted) {
        setState(() {
          _contact = fresh;
          _followUps = followUps;
          _interviews = interviews;
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

  Future<void> _handleMenu(String action) async {
    final c = _contact ?? widget.contact;
    final id = c['id']?.toString() ?? '';
    if (id.isEmpty) return;
    if (action == 'edit') {
      final ok = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => ContactEditScreen(contact: c)),
      );
      if (ok == true) _load();
      return;
    }
    final label = contactDisplayName(c);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(action == 'archive' ? 'Archiver le contact ?' : 'Mettre à la corbeille ?'),
        content: Text(
          action == 'archive'
              ? '$label sera déplacé vers les archives.'
              : '$label sera déplacé vers la corbeille.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      if (action == 'archive') {
        await ApiService.archiveContact(id, token: token);
      } else {
        await ApiService.deleteContact(id, token: token);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(action == 'archive' ? 'Contact archivé' : 'Contact mis à la corbeille')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _openLinkedApplicationForAdd() async {
    final c = _contact ?? widget.contact;
    final appMaps = parseNestedApplications(c['applications'] as List<dynamic>?);
    if (appMaps.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Liez d’abord une candidature à ce contact')),
      );
      return;
    }
    Map<String, dynamic>? picked = appMaps.length == 1 ? appMaps.first : null;
    if (picked == null) {
      picked = await showModalBottomSheet<Map<String, dynamic>>(
        context: context,
        showDragHandle: true,
        builder: (ctx) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const ListTile(title: Text('Ajouter depuis quelle candidature ?')),
              ...appMaps.map((raw) {
                final title = raw['position']?.toString() ?? 'Candidature';
                return ListTile(
                  leading: const Icon(Icons.assignment_outlined),
                  title: Text(title),
                  onTap: () => Navigator.pop(ctx, raw),
                );
              }),
            ],
          ),
        ),
      );
    }
    if (picked == null || !mounted) return;
    final app = applicationFromLinkedMap(picked);
    if (app == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
    );
    if (mounted) _load();
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
          PopupMenuButton<String>(
            onSelected: _handleMenu,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'edit', child: Text('Modifier')),
              PopupMenuItem(value: 'archive', child: Text('Archiver')),
              PopupMenuItem(value: 'delete', child: Text('Mettre à la corbeille')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_contact_detail_add',
        onPressed: _openLinkedApplicationForAdd,
        icon: const Icon(Icons.add),
        label: const Text('Ajouter lié'),
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
                  EntityLinkSectionHeader('Relances liées (${_followUps.length})'),
                  if (_followUps.isEmpty)
                    const EntityLinksEmptyHint('Aucune relance')
                  else
                    ..._followUps.map(
                      (f) => EntityLinkTile(
                        icon: Icons.schedule_send_outlined,
                        title: formatSmartEventDate(f.scheduledDate),
                        subtitle: joinListMeta([
                          linkedOfferCompanyLine(
                            applicationId: f.applicationId,
                            position: f.applicationPosition,
                            companyName: f.companyName,
                          ),
                          followUpStatusLabel(f.status),
                        ]),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: f)),
                        ),
                      ),
                    ),
                  EntityLinkSectionHeader('Entretiens liés (${_interviews.length})'),
                  if (_interviews.isEmpty)
                    const EntityLinksEmptyHint('Aucun entretien')
                  else
                    ..._interviews.map(
                      (i) => EntityLinkTile(
                        icon: Icons.event_outlined,
                        title: formatSmartEventDate(i.interviewDate),
                        subtitle: joinListMeta([
                          linkedOfferCompanyLine(
                            applicationId: i.applicationId,
                            position: i.applicationPosition,
                            companyName: i.companyName,
                          ),
                          i.location,
                        ]),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
                        ),
                      ),
                    ),
                  EntityLinkSectionHeader('Appels liés (${_calls.length})'),
                  if (_calls.isEmpty)
                    const EntityLinksEmptyHint('Aucun appel')
                  else
                    ..._calls.map(
                      (call) => EntityLinkTile(
                        icon: Icons.phone_outlined,
                        title: call.subject.isNotEmpty ? call.subject : 'Appel',
                        subtitle: joinListMeta([
                          linkedOfferCompanyLine(
                            applicationId: call.applicationId,
                            position: call.applicationPosition,
                            companyName: call.companyName,
                          ),
                          formatSmartEventDate(call.callDate),
                        ]),
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

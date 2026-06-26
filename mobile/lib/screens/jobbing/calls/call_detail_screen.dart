import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/linked_entity_parsers.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';
import 'package:jobbingtrack_mobile/widgets/entity_link_tile.dart';

String _callStatusLabel(String? status) {
  switch (status) {
    case 'COMPLETED':
      return 'Terminé';
    case 'SCHEDULED':
      return 'Planifié';
    case 'MISSED':
      return 'Manqué';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return status ?? '—';
  }
}

/// Détail complet d'un appel : liens contact, candidature, entreprise, relance.
class CallDetailScreen extends StatefulWidget {
  final Call call;

  const CallDetailScreen({super.key, required this.call});

  @override
  State<CallDetailScreen> createState() => _CallDetailScreenState();
}

class _CallDetailScreenState extends State<CallDetailScreen> {
  Call? _call;
  Application? _application;
  Company? _company;
  Map<String, dynamic>? _contact;
  FollowUp? _followUp;
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
      Application? app = applicationFromLinkedMap(nestedMap(raw, 'application'));
      if (app == null && raw['applicationId'] != null) {
        try {
          app = await ApiService.getApplication(raw['applicationId'].toString(), token: token);
        } catch (_) {}
      }
      Company? company = companyFromLinkedMap(nestedMap(raw, 'company'));
      if (company == null && raw['companyId'] != null) {
        try {
          company = await ApiService.getCompany(raw['companyId'].toString(), token: token);
        } catch (_) {}
      }
      FollowUp? followUp;
      final followRaw = nestedMap(raw, 'followUp');
      if (followRaw != null) {
        followUp = FollowUp.fromJson(followRaw);
      } else if (raw['followUpId'] != null) {
        try {
          final fuRaw = await ApiService.getFollowUpDetail(raw['followUpId'].toString(), token: token);
          followUp = FollowUp.fromJson(fuRaw);
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _call = Call.fromJson(raw);
          _application = app;
          _company = company ?? app?.company;
          _contact = nestedMap(raw, 'contact');
          _followUp = followUp;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _call = widget.call;
          _loading = false;
        });
      }
    }
  }

  Future<void> _openEdit() async {
    final call = _call ?? widget.call;
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CallEditScreen(call: call)),
    );
    if (changed == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final call = _call ?? widget.call;
    final contactName = _contact != null
        ? contactDisplayNameFromMap(_contact)
        : call.targetLabel;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Appel'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Modifier',
            onPressed: _openEdit,
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
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            backgroundColor: Colors.green.shade100,
                            child: Icon(Icons.phone, color: Colors.green.shade800),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  call.subject.trim().isNotEmpty ? call.subject : 'Appel téléphonique',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  formatSmartEventDate(call.callDate),
                                  style: TextStyle(color: Colors.grey.shade700),
                                ),
                              ],
                            ),
                          ),
                          Chip(
                            label: Text(
                              _callStatusLabel(call.status),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  EntityDetailField(label: 'Statut', value: _callStatusLabel(call.status)),
                  EntityDetailField(label: 'Date et heure', value: formatUserLocalDateTime(call.callDate.toIso8601String())),
                  EntityDetailField(label: 'Cible', value: contactName),
                  EntityDetailField(label: 'Notes', value: call.notes ?? '', multiline: true),
                  EntityDetailField(label: 'Créé le', value: formatUserLocalDateTime(call.createdAt.toIso8601String())),
                  const SizedBox(height: 8),
                  const EntityLinkSectionHeader('Liens'),
                  if (_contact != null)
                    EntityLinkTile(
                      icon: Icons.person_outline,
                      title: contactDisplayNameFromMap(_contact),
                      subtitle: _contact!['email']?.toString() ?? _contact!['phone']?.toString() ?? '',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: _contact!)),
                      ),
                    )
                  else if (call.contactId != null && call.contactId!.isNotEmpty)
                    EntityLinkTile(
                      icon: Icons.person_outline,
                      title: call.targetLabel,
                      subtitle: call.contactId!,
                      onTap: () async {
                        try {
                          final token = Provider.of<AuthProvider>(context, listen: false).token;
                          final c = await ApiService.getContact(call.contactId!, token: token);
                          if (!mounted) return;
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: c)),
                          );
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                          }
                        }
                      },
                    ),
                  if (_application != null)
                    EntityLinkTile(
                      icon: Icons.assignment_outlined,
                      title: _application!.position.isNotEmpty ? _application!.position : 'Candidature',
                      subtitle: '${_application!.company.name} · ${applicationStatusLabel(_application!.status)}',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: _application!)),
                      ),
                    )
                  else if (call.applicationId.isNotEmpty)
                    EntityLinkTile(
                      icon: Icons.assignment_outlined,
                      title: 'Candidature',
                      subtitle: call.applicationId,
                      onTap: () async {
                        try {
                          final token = Provider.of<AuthProvider>(context, listen: false).token;
                          final app = await ApiService.getApplication(call.applicationId, token: token);
                          if (!mounted) return;
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
                          );
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                          }
                        }
                      },
                    ),
                  if (_company != null)
                    EntityLinkTile(
                      icon: Icons.business_outlined,
                      title: _company!.name,
                      subtitle: _company!.location ?? '',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: _company!)),
                      ),
                    )
                  else if (call.companyId != null && call.companyId!.isNotEmpty)
                    EntityLinkTile(
                      icon: Icons.business_outlined,
                      title: 'Entreprise',
                      subtitle: call.companyId!,
                      onTap: () async {
                        try {
                          final token = Provider.of<AuthProvider>(context, listen: false).token;
                          final co = await ApiService.getCompany(call.companyId!, token: token);
                          if (!mounted) return;
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: co)),
                          );
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                          }
                        }
                      },
                    ),
                  if (_followUp != null)
                    EntityLinkTile(
                      icon: Icons.forward_to_inbox_outlined,
                      title: 'Relance liée',
                      subtitle: '${formatSmartEventDate(_followUp!.scheduledDate)} · ${followUpStatusLabel(_followUp!.status)}',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: _followUp!)),
                      ),
                    ),
                  if (_contact == null &&
                      call.contactId == null &&
                      _application == null &&
                      call.applicationId.isEmpty &&
                      _company == null &&
                      (call.companyId == null || call.companyId!.isEmpty) &&
                      _followUp == null)
                    const EntityLinksEmptyHint('Aucun lien enregistré pour cet appel'),
                ],
              ),
            ),
    );
  }
}

/// Écran d'édition dédié (remplace l'ancienne popup).
class CallEditScreen extends StatefulWidget {
  final Call call;

  const CallEditScreen({super.key, required this.call});

  @override
  State<CallEditScreen> createState() => _CallEditScreenState();
}

class _CallEditScreenState extends State<CallEditScreen> {
  late final TextEditingController _subjectCtrl;
  late final TextEditingController _notesCtrl;
  late DateTime _callDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _subjectCtrl = TextEditingController(text: widget.call.subject);
    _notesCtrl = TextEditingController(text: widget.call.notes ?? '');
    _callDate = widget.call.callDate;
  }

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      await ApiService.updateCall(
        id: widget.call.id,
        subject: _subjectCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        callDate: _callDate,
        token: token,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appel mis à jour')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifier l\'appel'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Enregistrer'),
          ),
        ],
      ),
      body: ListView(
        padding: scrollSafePadding(context),
        children: [
          TextField(
            controller: _subjectCtrl,
            decoration: const InputDecoration(labelText: 'Objet', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today),
            title: Text(formatSmartEventDate(_callDate)),
            subtitle: const Text('Date et heure'),
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _callDate,
                firstDate: DateTime(2020),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (date == null || !mounted) return;
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.fromDateTime(_callDate),
              );
              if (time == null || !mounted) return;
              setState(() {
                _callDate = DateTime(date.year, date.month, date.day, time.hour, time.minute);
              });
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesCtrl,
            decoration: const InputDecoration(
              labelText: 'Notes',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
            maxLines: 5,
          ),
        ],
      ),
    );
  }
}

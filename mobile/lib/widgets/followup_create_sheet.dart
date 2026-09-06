import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/application_picker_field.dart';

/// Création d'une relance (candidature obligatoire + contact optionnel prérempli).
Future<FollowUp?> showCreateFollowUpSheet(
  BuildContext context, {
  Application? fixedApplication,
  String? initialContactId,
  String? initialContactLabel,
}) async {
  final appProvider = Provider.of<ApplicationProvider>(context, listen: false);
  final token = Provider.of<AuthProvider>(context, listen: false).token;
  if (appProvider.applications.isEmpty) {
    await appProvider.loadApplications(token: token);
  }

  return showModalBottomSheet<FollowUp>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => _FollowUpCreateSheetBody(
      applications: appProvider.applications,
      fixedApplication: fixedApplication,
      initialContactId: initialContactId,
      initialContactLabel: initialContactLabel,
    ),
  );
}

class _FollowUpCreateSheetBody extends StatefulWidget {
  final List<Application> applications;
  final Application? fixedApplication;
  final String? initialContactId;
  final String? initialContactLabel;

  const _FollowUpCreateSheetBody({
    required this.applications,
    this.fixedApplication,
    this.initialContactId,
    this.initialContactLabel,
  });

  @override
  State<_FollowUpCreateSheetBody> createState() => _FollowUpCreateSheetBodyState();
}

class _FollowUpCreateSheetBodyState extends State<_FollowUpCreateSheetBody> {
  Application? _selectedApp;
  late DateTime _date;
  String _channel = 'Email';
  final _notes = TextEditingController();
  bool _saving = false;
  static const _channels = ['Email', 'Téléphone', 'LinkedIn', 'InMail', 'Courrier', 'Autre'];

  @override
  void initState() {
    super.initState();
    _selectedApp = widget.fixedApplication;
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day + 3, 9, 0);
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_date),
    );
    if (!mounted) return;
    setState(() {
      _date = DateTime(
        picked.year,
        picked.month,
        picked.day,
        time?.hour ?? 9,
        time?.minute ?? 0,
      );
    });
  }

  Future<void> _submit() async {
    if (_selectedApp == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choisissez une candidature')),
      );
      return;
    }
    setState(() => _saving = true);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final noteParts = <String>['[Canal: $_channel]'];
      if (_notes.text.trim().isNotEmpty) noteParts.add(_notes.text.trim());
      final created = await ApiService.createFollowUp(
        applicationId: _selectedApp!.id,
        followUpDate: _date,
        notes: noteParts.join('\n'),
        contactId: widget.initialContactId,
        token: token,
      );
      await Provider.of<FollowUpProvider>(context, listen: false).addFollowUp(created);
      if (!mounted) return;
      final nav = Navigator.of(context);
      nav.pop(created);
      await nav.push(
        MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: created)),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fixed = widget.fixedApplication != null;
    final contactLabel = widget.initialContactLabel ??
        (widget.initialContactId != null ? 'Contact prérempli' : null);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        minChildSize: 0.45,
        maxChildSize: 0.95,
        builder: (_, scroll) {
          return ListView(
            controller: scroll,
            padding: scrollSafePadding(context, top: 0),
            children: [
              Text('Nouvelle relance', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              if (fixed && _selectedApp != null)
                InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Candidature liée',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.lock_outline, size: 20),
                  ),
                  child: Text(
                    '${_selectedApp!.position} · ${_selectedApp!.company.name}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                )
              else
                ApplicationPickerField(
                  applications: widget.applications,
                  selected: _selectedApp,
                  onChanged: (a) => setState(() => _selectedApp = a),
                ),
              if (contactLabel != null) ...[
                const SizedBox(height: 12),
                InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Contact',
                    border: OutlineInputBorder(),
                  ),
                  child: Text(contactLabel),
                ),
              ],
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today),
                title: Text(formatSmartEventDate(_date)),
                subtitle: const Text('Date et heure prévues'),
                onTap: _pickDateTime,
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _channel,
                decoration: const InputDecoration(
                  labelText: 'Canal / plateforme',
                  border: OutlineInputBorder(),
                ),
                items: _channels
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => _channel = v ?? _channel),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notes,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  hintText: 'Contexte, message prévu…',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 4,
                minLines: 2,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Créer la relance'),
              ),
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    );
  }
}

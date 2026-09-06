import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/call_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/application_picker_field.dart';

/// Création d'un appel (candidature obligatoire + contact optionnel).
Future<Call?> showCreateCallSheet(
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

  return showModalBottomSheet<Call>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => _CallCreateSheetBody(
      applications: appProvider.applications,
      fixedApplication: fixedApplication,
      initialContactId: initialContactId,
      initialContactLabel: initialContactLabel,
    ),
  );
}

class _CallCreateSheetBody extends StatefulWidget {
  final List<Application> applications;
  final Application? fixedApplication;
  final String? initialContactId;
  final String? initialContactLabel;

  const _CallCreateSheetBody({
    required this.applications,
    this.fixedApplication,
    this.initialContactId,
    this.initialContactLabel,
  });

  @override
  State<_CallCreateSheetBody> createState() => _CallCreateSheetBodyState();
}

class _CallCreateSheetBodyState extends State<_CallCreateSheetBody> {
  Application? _selectedApp;
  DateTime _date = DateTime.now();
  final _subject = TextEditingController();
  final _notes = TextEditingController();
  bool _saving = false;
  bool _withoutContact = false;

  @override
  void initState() {
    super.initState();
    _selectedApp = widget.fixedApplication;
    _withoutContact = widget.initialContactId == null || widget.initialContactId!.isEmpty;
    final company = _selectedApp?.company.name ?? '';
    final position = _selectedApp?.position ?? '';
    _subject.text = company.isNotEmpty
        ? 'Appel · $company'
        : (position.isNotEmpty ? 'Appel · $position' : 'Appel téléphonique');
  }

  @override
  void dispose() {
    _subject.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && mounted) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (_selectedApp == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choisissez une candidature')),
      );
      return;
    }
    if (_subject.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Indiquez un objet')),
      );
      return;
    }
    setState(() => _saving = true);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final contactId = _withoutContact ? null : widget.initialContactId;
      final created = await ApiService.createCall(
        applicationId: _selectedApp!.id,
        callDate: _date,
        subject: _subject.text.trim(),
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        contactId: contactId,
        token: token,
      );
      Provider.of<CallProvider>(context, listen: false).upsertLocal(created);
      if (!mounted) return;
      final nav = Navigator.of(context);
      nav.pop(created);
      await nav.push(
        MaterialPageRoute(builder: (_) => CallDetailScreen(call: created)),
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
    final hasInitialContact =
        widget.initialContactId != null && widget.initialContactId!.isNotEmpty;
    final contactLabel = widget.initialContactLabel ??
        (hasInitialContact ? 'Contact prérempli' : null);

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
              Text('Nouvel appel', style: Theme.of(context).textTheme.titleLarge),
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
                  onChanged: (a) {
                    setState(() {
                      _selectedApp = a;
                      if (_subject.text.startsWith('Appel')) {
                        final co = a.company.name;
                        _subject.text = co.isNotEmpty
                            ? 'Appel · $co'
                            : 'Appel · ${a.position}';
                      }
                    });
                  },
                ),
              if (hasInitialContact && contactLabel != null) ...[
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(contactLabel),
                  subtitle: Text(
                    _withoutContact
                        ? 'Appel sans contact (entreprise seule)'
                        : 'Appel lié à ce contact',
                  ),
                  value: !_withoutContact,
                  onChanged: (v) => setState(() => _withoutContact = !v),
                ),
              ],
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today),
                title: Text(formatSmartEventDate(_date)),
                subtitle: const Text('Date de l\'appel'),
                onTap: _pickDate,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _subject,
                decoration: const InputDecoration(
                  labelText: 'Objet *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notes,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
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
                    : const Text('Enregistrer l\'appel'),
              ),
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    );
  }
}

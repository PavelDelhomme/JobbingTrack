import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/local_phone_integrations_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

/// Résultat spécial : appel sans contact (entreprise / candidature seulement).
const String kCallWithoutContactFlag = '__call_without_contact__';

/// Sélection d'un contact existant ou création rapide (nom seul ou prénom + nom).
Future<Map<String, dynamic>?> showContactPickerSheet(
  BuildContext context, {
  required List<Map<String, dynamic>> candidates,
  required Future<Map<String, dynamic>> Function({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
  }) onCreateContact,
  bool allowWithoutContact = false,
  String? withoutContactLabel,
}) async {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) {
      return _ContactPickerBody(
        candidates: candidates,
        onCreateContact: onCreateContact,
        allowWithoutContact: allowWithoutContact,
        withoutContactLabel: withoutContactLabel,
      );
    },
  );
}

class _ContactPickerBody extends StatefulWidget {
  final List<Map<String, dynamic>> candidates;
  final Future<Map<String, dynamic>> Function({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
  }) onCreateContact;
  final bool allowWithoutContact;
  final String? withoutContactLabel;

  const _ContactPickerBody({
    required this.candidates,
    required this.onCreateContact,
    this.allowWithoutContact = false,
    this.withoutContactLabel,
  });

  @override
  State<_ContactPickerBody> createState() => _ContactPickerBodyState();
}

class _ContactPickerBodyState extends State<_ContactPickerBody> {
  bool _creating = false;
  bool _importingPhone = false;
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _createQuick() async {
    final raw = _nameController.text.trim();
    if (raw.isEmpty) return;
    final parts = raw.split(RegExp(r'\s+'));
    final firstName = parts.length > 1 ? parts.first : parts.first;
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '.';
    setState(() => _creating = true);
    try {
      final created = await widget.onCreateContact(
        firstName: firstName,
        lastName: lastName,
        email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      );
      if (mounted) Navigator.pop(context, created);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _importFromPhone() async {
    setState(() => _importingPhone = true);
    try {
      var local = await LocalPhoneIntegrationsService.getLocalPhoneContacts();
      if (local.isEmpty) {
        await LocalPhoneIntegrationsService.syncPhoneContactsLocally();
        local = await LocalPhoneIntegrationsService.getLocalPhoneContacts();
      }
      if (!mounted) return;
      if (local.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aucun contact téléphone importé (permission ou liste vide)')),
        );
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
            padding: scrollSafePadding(ctx, top: 8),
            itemCount: local.length,
            itemBuilder: (_, i) {
              final c = local[i];
              return ListTile(
                leading: const Icon(Icons.phone_android_outlined),
                title: Text(c['displayName']?.toString() ?? 'Contact'),
                subtitle: Text(c['phone']?.toString() ?? c['email']?.toString() ?? ''),
                onTap: () => Navigator.pop(ctx, c),
              );
            },
          ),
        ),
      );
      if (picked == null || !mounted) return;
      final created = await widget.onCreateContact(
        firstName: picked['firstName']?.toString().trim().isNotEmpty == true
            ? picked['firstName'].toString()
            : (picked['displayName']?.toString().split(' ').first ?? 'Contact'),
        lastName: picked['lastName']?.toString().trim().isNotEmpty == true
            ? picked['lastName'].toString()
            : (picked['displayName']?.toString().split(' ').skip(1).join(' ') ?? '.'),
        email: picked['email']?.toString(),
        phone: picked['phone']?.toString(),
      );
      if (mounted) Navigator.pop(context, created);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _importingPhone = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, scrollController) {
        return Material(
          child: ListView(
            controller: scrollController,
            padding: scrollSafePadding(context, top: 12, extraBottom: 24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 12),
              Text('Choisir un contact', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              if (widget.allowWithoutContact)
                ListTile(
                  leading: Icon(Icons.phone_in_talk_outlined, color: Colors.blue.shade700),
                  title: Text(widget.withoutContactLabel ?? 'Appel sans contact'),
                  subtitle: const Text('Lié à la candidature / entreprise uniquement'),
                  onTap: () => Navigator.pop(context, {kCallWithoutContactFlag: true}),
                ),
              if (widget.allowWithoutContact) const Divider(height: 8),
              ...widget.candidates.map(
                (c) => ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: Text(contactDisplayName(c)),
                  subtitle: Text(c['email']?.toString() ?? c['phone']?.toString() ?? ''),
                  onTap: () => Navigator.pop(context, c),
                ),
              ),
              if (widget.candidates.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('Aucun contact enregistré.', style: TextStyle(color: Colors.grey.shade600)),
                ),
              const Divider(height: 28),
              OutlinedButton.icon(
                onPressed: _importingPhone ? null : _importFromPhone,
                icon: _importingPhone
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.import_contacts_outlined),
                label: const Text('Importer depuis le téléphone'),
              ),
              const SizedBox(height: 16),
              Text('Créer à la volée', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nom (ou Prénom Nom)',
                  border: OutlineInputBorder(),
                  hintText: 'ex. Marie Dupont ou Dupont',
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email (optionnel)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _creating ? null : _createQuick,
                icon: _creating
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.person_add_outlined),
                label: const Text('Créer et sélectionner'),
              ),
            ],
          ),
        );
      },
    );
  }
}

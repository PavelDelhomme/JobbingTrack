import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';

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
}) async {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) {
      return _ContactPickerBody(
        candidates: candidates,
        onCreateContact: onCreateContact,
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

  const _ContactPickerBody({
    required this.candidates,
    required this.onCreateContact,
  });

  @override
  State<_ContactPickerBody> createState() => _ContactPickerBodyState();
}

class _ContactPickerBodyState extends State<_ContactPickerBody> {
  bool _creating = false;
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
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
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

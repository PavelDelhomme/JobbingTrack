import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class ContactEditScreen extends StatefulWidget {
  final Map<String, dynamic> contact;

  const ContactEditScreen({super.key, required this.contact});

  @override
  State<ContactEditScreen> createState() => _ContactEditScreenState();
}

class _ContactEditScreenState extends State<ContactEditScreen> {
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _position;
  late final TextEditingController _notes;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final c = widget.contact;
    _firstName = TextEditingController(text: c['firstName']?.toString() ?? '');
    _lastName = TextEditingController(text: c['lastName']?.toString() ?? '');
    _email = TextEditingController(text: c['email']?.toString() ?? '');
    _phone = TextEditingController(text: c['phone']?.toString() ?? '');
    _position = TextEditingController(text: c['position']?.toString() ?? '');
    _notes = TextEditingController(text: c['notes']?.toString() ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _position.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final id = widget.contact['id']?.toString() ?? '';
    if (id.isEmpty || _firstName.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      await ApiService.updateContact(
        id,
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
        position: _position.text.trim(),
        notes: _notes.text.trim(),
        token: token,
      );
      if (mounted) Navigator.pop(context, true);
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifier le contact'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Enregistrer'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'Prénom *', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Nom', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Téléphone', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _position, decoration: const InputDecoration(labelText: 'Poste', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()), maxLines: 4),
        ],
      ),
    );
  }
}

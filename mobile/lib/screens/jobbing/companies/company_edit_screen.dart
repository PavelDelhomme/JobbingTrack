import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class CompanyEditScreen extends StatefulWidget {
  final Company company;

  const CompanyEditScreen({super.key, required this.company});

  @override
  State<CompanyEditScreen> createState() => _CompanyEditScreenState();
}

class _CompanyEditScreenState extends State<CompanyEditScreen> {
  late final TextEditingController _name;
  late final TextEditingController _website;
  late final TextEditingController _industry;
  late final TextEditingController _location;
  late final TextEditingController _description;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final c = widget.company;
    _name = TextEditingController(text: c.name);
    _website = TextEditingController(text: c.website);
    _industry = TextEditingController(text: c.industry);
    _location = TextEditingController(text: c.location);
    _description = TextEditingController(text: c.description);
  }

  @override
  void dispose() {
    _name.dispose();
    _website.dispose();
    _industry.dispose();
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (widget.company.id.isEmpty || _name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      await ApiService.updateCompany(
        widget.company.id,
        name: _name.text.trim(),
        website: _website.text.trim(),
        industry: _industry.text.trim(),
        location: _location.text.trim(),
        description: _description.text.trim(),
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
        title: const Text('Modifier l\'entreprise'),
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
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nom *', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _website, decoration: const InputDecoration(labelText: 'Site web', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _industry, decoration: const InputDecoration(labelText: 'Secteur', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Localisation', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()), maxLines: 4),
        ],
      ),
    );
  }
}

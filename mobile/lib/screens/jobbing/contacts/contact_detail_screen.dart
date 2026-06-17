import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

class ContactDetailScreen extends StatefulWidget {
  final Map<String, dynamic> contact;

  const ContactDetailScreen({super.key, required this.contact});

  @override
  State<ContactDetailScreen> createState() => _ContactDetailScreenState();
}

class _ContactDetailScreenState extends State<ContactDetailScreen> {
  Map<String, dynamic>? _contact;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.contact['id']?.toString() ?? '';
    if (id.isEmpty) {
      setState(() {
        _contact = widget.contact;
        _loading = false;
      });
      return;
    }
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final fresh = await ApiService.getContact(id, token: token);
      if (mounted) setState(() {
        _contact = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _contact = widget.contact;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _contact ?? widget.contact;
    return Scaffold(
      appBar: AppBar(title: Text(contactDisplayName(c))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                EntityDetailField(label: 'Prénom', value: c['firstName']?.toString() ?? ''),
                EntityDetailField(label: 'Nom', value: c['lastName']?.toString() ?? ''),
                EntityDetailField(label: 'Email', value: c['email']?.toString() ?? ''),
                EntityDetailField(label: 'Téléphone', value: c['phone']?.toString() ?? ''),
                EntityDetailField(label: 'Poste', value: c['position']?.toString() ?? ''),
                EntityDetailField(label: 'Notes', value: c['notes']?.toString() ?? '', multiline: true),
                EntityDetailField(
                  label: 'Créé le',
                  value: formatUserLocalDateTime(c['createdAt']?.toString()),
                ),
              ],
            ),
    );
  }
}

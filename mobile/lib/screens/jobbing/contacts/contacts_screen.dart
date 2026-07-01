import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/widgets/contact_create_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  String _query = '';
  String? _loadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      await Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: token);
      await Provider.of<ContactProvider>(context, listen: false).loadContacts(token: token);
    } catch (e) {
      if (mounted) {
        setState(() => _loadError = e.toString().replaceAll('Exception: ', ''));
      }
    }
  }

  List<Map<String, dynamic>> _filtered(List<dynamic> contacts) {
    final q = _query.trim().toLowerCase();
    final list = contacts.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (q.isEmpty) return list;
    return list.where((c) {
      final name = contactDisplayName(c).toLowerCase();
      final email = (c['email'] ?? '').toString().toLowerCase();
      return name.contains(q) || email.contains(q);
    }).toList();
  }

  Future<void> _createContact() async {
    final created = await showCreateContactSheet(context);
    if (created != null && mounted) {
      await _load();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact créé')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ContactProvider>();
    final contacts = _filtered(provider.contacts);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contacts'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_contacts_list',
        onPressed: _createContact,
        child: const Icon(Icons.person_add_outlined),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Rechercher un contact…',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: provider.isLoading && provider.contacts.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _loadError != null && provider.contacts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_loadError!, textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                            FilledButton(onPressed: _load, child: const Text('Réessayer')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: contacts.isEmpty
                            ? ListView(
                                children: const [
                                  SizedBox(height: 80),
                                  Center(child: Text('Aucun contact')),
                                ],
                              )
                            : ListView.builder(
                                itemCount: contacts.length,
                                itemBuilder: (_, i) {
                                  final c = contacts[i];
                                  final email = c['email']?.toString() ?? '';
                                  return ListTile(
                                    leading: CircleAvatar(
                                      child: Text(
                                        contactDisplayName(c).isNotEmpty
                                            ? contactDisplayName(c)[0].toUpperCase()
                                            : '?',
                                      ),
                                    ),
                                    title: Text(contactDisplayName(c)),
                                    subtitle: email.isNotEmpty ? Text(email) : null,
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => ContactDetailScreen(contact: c),
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}

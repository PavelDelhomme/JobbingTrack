import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/linked_entity_parsers.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';
import 'package:jobbingtrack_mobile/widgets/entity_link_tile.dart';

class CallDetailScreen extends StatefulWidget {
  final Call call;

  const CallDetailScreen({super.key, required this.call});

  @override
  State<CallDetailScreen> createState() => _CallDetailScreenState();
}

class _CallDetailScreenState extends State<CallDetailScreen> {
  Map<String, dynamic>? _raw;
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
      if (mounted) setState(() {
        _raw = raw;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final call = widget.call;
    final appRaw = nestedMap(_raw, 'application');
    final companyRaw = nestedMap(_raw, 'company') ?? nestedMap(appRaw, 'company');
    final contactRaw = nestedMap(_raw, 'contact');
    final app = applicationFromLinkedMap(appRaw);
    final company = companyFromLinkedMap(companyRaw);

    return Scaffold(
      appBar: AppBar(title: const Text('Appel')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: scrollSafePadding(context),
              children: [
                EntityDetailField(label: 'Objet', value: call.subject),
                EntityDetailField(label: 'Date', value: formatSmartEventDate(call.callDate)),
                EntityDetailField(label: 'Notes', value: call.notes ?? '', multiline: true),
                if (call.status != null && call.status!.isNotEmpty)
                  EntityDetailField(label: 'Statut', value: call.status!),
                const SizedBox(height: 8),
                const EntityLinkSectionHeader('Candidature liée'),
                if (app == null)
                  const EntityLinksEmptyHint('Aucune candidature')
                else
                  EntityLinkTile(
                    icon: Icons.assignment_outlined,
                    title: app.position,
                    subtitle: applicationStatusLabel(app.status),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
                    ),
                  ),
                const EntityLinkSectionHeader('Entreprise'),
                if (company == null)
                  const EntityLinksEmptyHint('Aucune entreprise')
                else
                  EntityLinkTile(
                    icon: Icons.business_outlined,
                    title: company.name,
                    subtitle: company.location,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: company)),
                    ),
                  ),
                const EntityLinkSectionHeader('Contact'),
                if (contactRaw == null)
                  EntityLinksEmptyHint(call.isCompanyOnly ? 'Appel entreprise (sans contact)' : 'Contact non renseigné')
                else
                  EntityLinkTile(
                    icon: Icons.person_outline,
                    title: contactDisplayNameFromMap(contactRaw),
                    subtitle: contactRaw['email']?.toString() ?? contactRaw['phone']?.toString() ?? '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: contactRaw)),
                    ),
                  ),
              ],
            ),
    );
  }
}

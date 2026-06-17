import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Suivi des missions via boîtes d'intérim (companyType TEMP_AGENCY + agencyId sur candidatures).
class InterimScreen extends StatefulWidget {
  const InterimScreen({super.key});

  @override
  State<InterimScreen> createState() => _InterimScreenState();
}

class _InterimScreenState extends State<InterimScreen> {
  List<Company> _agencies = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await Provider.of<ApplicationProvider>(context, listen: false).loadApplications(token: token);
    try {
      final agencies = await ApiService.getCompanies(token: token, companyType: 'TEMP_AGENCY');
      if (mounted) setState(() => _agencies = agencies);
    } catch (_) {
      final all = Provider.of<CompanyProvider>(context, listen: false).companies;
      if (mounted) {
        setState(() => _agencies = all.where((c) => c.companyType == 'TEMP_AGENCY').toList());
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final apps = context.watch<ApplicationProvider>().applications.where((a) => a.isInterim).toList();
    final interimColor = Colors.amber.shade700;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Suivi intérim'),
        actions: const [MobileNotificationCenter()],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    color: Colors.amber.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.work_outline, color: interimColor),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Propositions et missions passées par une boîte d\'intérim. '
                              'Couleur ambre sur le calendrier.',
                              style: TextStyle(color: Colors.grey.shade800, height: 1.35),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Boîtes d\'intérim', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (_agencies.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Aucune agence enregistrée. Créez une entreprise de type « boîte d\'intérim » depuis le backoffice ou liez une agence à une candidature.',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    )
                  else
                    ..._agencies.map((a) {
                      final count = apps.where((app) => app.agencyId == a.id).length;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: interimColor.withValues(alpha: 0.15),
                            child: Icon(Icons.business_center, color: interimColor),
                          ),
                          title: Text(a.name),
                          subtitle: Text('$count mission${count > 1 ? 's' : ''} liée${count > 1 ? 's' : ''}'),
                        ),
                      );
                    }),
                  const SizedBox(height: 20),
                  Text('Missions intérim', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (apps.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'Aucune candidature via intérim.\nAjoutez une agence dans le formulaire candidature.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ),
                    )
                  else
                    ...apps.map((app) => _interimAppTile(context, app, interimColor)),
                ],
              ),
            ),
    );
  }

  Widget _interimAppTile(BuildContext context, Application app, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(Icons.schedule, color: color),
        title: Text(app.position, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          [
            if (app.agencyName.isNotEmpty) app.agencyName,
            if (app.company.name.isNotEmpty) app.company.name,
            formatSmartPostulationDate(app.appliedDate),
            applicationStatusLabel(app.status),
          ].where((s) => s.isNotEmpty).join(' · '),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
        ),
      ),
    );
  }
}

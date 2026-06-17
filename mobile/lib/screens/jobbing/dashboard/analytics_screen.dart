import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Résumé analytics mobile (compteurs locaux). Le détail reste sur le backoffice.
class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await Future.wait([
      Provider.of<ApplicationProvider>(context, listen: false).loadApplications(token: token),
      Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: token).catchError((_) {}),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final apps = context.watch<ApplicationProvider>().applications.length;
    final pending = context.watch<FollowUpProvider>().pendingFollowUps.length;
    final done = context.watch<FollowUpProvider>().completedFollowUps.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text('Indicateurs rapides', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            _tile('Candidatures actives', '$apps', Icons.work_outline),
            _tile('Relances à venir', '$pending', Icons.schedule),
            _tile('Relances terminées', '$done', Icons.check_circle_outline),
            const SizedBox(height: 16),
            Text(
              'Télémétrie mobile et analytics détaillés : backoffice → Application.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile(String label, String value, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon),
        title: Text(label),
        trailing: Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

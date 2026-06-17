import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await Future.wait([
      Provider.of<ApplicationProvider>(context, listen: false).loadApplications(token: token),
      Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: token),
      Provider.of<ContactProvider>(context, listen: false).loadContacts(token: token),
      Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: token).catchError((_) {}),
      Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: token).catchError((_) {}),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final apps = context.watch<ApplicationProvider>().applications.length;
    final companies = context.watch<CompanyProvider>().companies.length;
    final contacts = context.watch<ContactProvider>().contacts.length;
    final followups = context.watch<FollowUpProvider>().followUps.length;
    final interviews = context.watch<InterviewProvider>().interviews.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistiques'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Vue d\'ensemble de votre activité', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            _statCard('Candidatures', apps, Icons.assignment, Colors.blue),
            _statCard('Entreprises', companies, Icons.business, Colors.purple),
            _statCard('Contacts', contacts, Icons.people, Colors.green),
            _statCard('Relances', followups, Icons.schedule_send, Colors.teal),
            _statCard('Entretiens', interviews, Icons.event, Colors.orange),
            const SizedBox(height: 16),
            Text(
              'Les statistiques avancées (graphes, cohortes) restent sur le backoffice web.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, int value, IconData icon, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.15), child: Icon(icon, color: color)),
        title: Text(label),
        trailing: Text('$value', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
      ),
    );
  }
}

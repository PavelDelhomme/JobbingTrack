import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/screens/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/application_detail_screen.dart';
import 'package:intl/intl.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> with SingleTickerProviderStateMixin {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.token;
    final appProvider = Provider.of<ApplicationProvider>(context, listen: false);
    final companyProvider = Provider.of<CompanyProvider>(context, listen: false);
    final contactProvider = Provider.of<ContactProvider>(context, listen: false);
    final interviewProvider = Provider.of<InterviewProvider>(context, listen: false);
    final followUpProvider = Provider.of<FollowUpProvider>(context, listen: false);
    await Future.wait([
      appProvider.loadApplications(),
      companyProvider.loadCompanies(token: token),
      contactProvider.loadContacts(token: token),
      interviewProvider.loadInterviews(token: token),
      followUpProvider.loadFollowUps(token: token),
    ]);
  }

  Future<void> _loadApplications() async {
    await Provider.of<ApplicationProvider>(context, listen: false).loadApplications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        title: const Text('Candidatures'),
        centerTitle: true,
        actions: [MobileNotificationCenter()],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: Colors.blue[700],
          unselectedLabelColor: Colors.grey[600],
          indicatorColor: Colors.blue[700],
          tabs: const [
            Tab(icon: Icon(Icons.assignment, size: 20), text: 'Candidatures'),
            Tab(icon: Icon(Icons.business, size: 20), text: 'Entreprises'),
            Tab(icon: Icon(Icons.people, size: 20), text: 'Contacts'),
            Tab(icon: Icon(Icons.event, size: 20), text: 'Entretiens'),
            Tab(icon: Icon(Icons.schedule_send, size: 20), text: 'Relances'),
          ],
        ),
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildCandidaturesTab(),
            _buildEntreprisesTab(),
            _buildContactsTab(),
            _buildEntretiensTab(),
            _buildRelancesTab(),
          ],
        ),
      ),
      floatingActionButton: _tabController.index == 0 ? _buildFab() : null,
    );
  }

  Widget? _buildFab() {
    return FloatingActionButton(
      onPressed: () async {
        final result = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => const ApplicationFormScreen()),
        );
        if (result == true) _loadApplications();
      },
      backgroundColor: Colors.blue[600],
      child: const Icon(Icons.add),
    );
  }

  Widget _buildCandidaturesTab() {
    final appProvider = Provider.of<ApplicationProvider>(context);
    final applications = appProvider.applications;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: appProvider.isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.blue))
            : applications.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    itemCount: applications.length,
                    itemBuilder: (context, index) => _buildApplicationCard(applications[index]),
                  ),
      ),
    );
  }

  Widget _buildEntreprisesTab() {
    final companyProvider = Provider.of<CompanyProvider>(context);
    final companies = companyProvider.companies;
    if (companyProvider.isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.blue));
    }
    if (companies.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.business, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Aucune entreprise', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: companies.length,
      itemBuilder: (context, index) {
        final c = companies[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.business, color: Colors.purple),
            title: Text(c.name),
            subtitle: c.website != null && c.website!.isNotEmpty ? Text(c.website!) : null,
          ),
        );
      },
    );
  }

  Widget _buildContactsTab() {
    final contactProvider = Provider.of<ContactProvider>(context);
    final contacts = contactProvider.contacts;
    if (contactProvider.isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.blue));
    }
    if (contacts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Aucun contact', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: contacts.length,
      itemBuilder: (context, index) {
        final c = contacts[index];
        final name = c is Map ? ('${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim()) : c.toString();
        final email = c is Map ? (c['email'] ?? '') : '';
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.person, color: Colors.green),
            title: Text(name.isEmpty ? 'Contact' : name),
            subtitle: email.isNotEmpty ? Text(email) : null,
          ),
        );
      },
    );
  }

  Widget _buildEntretiensTab() {
    final interviewProvider = Provider.of<InterviewProvider>(context);
    final interviews = interviewProvider.interviews;
    final dateFormat = DateFormat('dd/MM/yyyy');
    if (interviewProvider.isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.blue));
    }
    if (interviews.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Aucun entretien', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: interviews.length,
      itemBuilder: (context, index) {
        final i = interviews[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.calendar_today, color: Colors.orange),
            title: Text(dateFormat.format(i.interviewDate)),
            subtitle: Text(i.location ?? i.notes ?? 'Entretien'),
          ),
        );
      },
    );
  }

  Widget _buildRelancesTab() {
    final followUpProvider = Provider.of<FollowUpProvider>(context);
    final pending = followUpProvider.pendingFollowUps;
    final completed = followUpProvider.completedFollowUps;
    final dateFormat = DateFormat('dd/MM/yyyy');
    if (followUpProvider.isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.blue));
    }
    if (pending.isEmpty && completed.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.schedule_send, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Aucune relance', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          ],
        ),
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (pending.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('À venir', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey[800])),
          ),
          ...pending.map((f) => _relanceTile(f, dateFormat)),
          const SizedBox(height: 16),
        ],
        if (completed.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Terminées', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey[800])),
          ),
          ...completed.map((f) => _relanceTile(f, dateFormat)),
        ],
      ],
    );
  }

  Widget _relanceTile(FollowUp f, DateFormat dateFormat) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.schedule_send, color: Colors.teal),
        title: Text(dateFormat.format(f.scheduledDate)),
        subtitle: Text(f.notes ?? 'Relance'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('Aucune candidature', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text('Les candidatures apparaîtront ici', style: TextStyle(fontSize: 14, color: Colors.grey[500])),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () async {
              final result = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => const ApplicationFormScreen()),
              );
              if (result == true) _loadApplications();
            },
            icon: const Icon(Icons.add),
            label: const Text('Créer ma première candidature'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildApplicationCard(Application application) {
    Color statusColor = _getStatusColor(application.status);
    String statusText = _getStatusText(application.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(application.position, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey[800])),
                      const SizedBox(height: 4),
                      Text(application.company.name, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(statusText, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: statusColor)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey[200]!))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('📅 ${application.appliedDate.toString().split(' ')[0]}', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  GestureDetector(
                    onTap: () async {
                      final result = await Navigator.of(context).push<bool>(
                        MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: application)),
                      );
                      if (result == true) _loadApplications();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)),
                      child: Text('👁️ Voir détails', style: TextStyle(fontSize: 12, color: Colors.grey[700])),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    if (status.contains('INTERVIEW')) return Colors.green;
    if (status == 'REJECTED') return Colors.red;
    if (status == 'SENT' || status.contains('PENDING')) return Colors.blue;
    return Colors.grey;
  }

  String _getStatusText(String status) {
    if (status == 'INTERVIEW_SCHEDULED') return 'Entretien programmé';
    if (status == 'SENT') return 'Envoyée';
    if (status == 'REJECTED') return 'Refusée';
    return status.replaceAll('_', ' ').toLowerCase();
  }
}

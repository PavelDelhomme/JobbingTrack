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
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/application_card.dart';

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
      appProvider.loadApplications(token: token),
      companyProvider.loadCompanies(token: token),
      contactProvider.loadContacts(token: token),
      interviewProvider.loadInterviews(token: token),
      followUpProvider.loadFollowUps(token: token),
    ]);
  }

  Future<void> _loadApplications() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await Provider.of<ApplicationProvider>(context, listen: false)
        .loadApplications(token: auth.token);
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
                : RefreshIndicator(
                    onRefresh: _loadApplications,
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: applications.length,
                      itemBuilder: (context, index) {
                        final application = applications[index];
                        return ApplicationCard(
                          application: application,
                          onTap: () => _openApplicationDetail(application),
                          onDismiss: (direction) => _confirmDismiss(application, direction),
                        );
                      },
                    ),
                  ),
      ),
    );
  }

  Future<void> _openApplicationDetail(Application application) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: application)),
    );
    if (result == true) _loadApplications();
  }

  Future<bool> _confirmDismiss(Application application, DismissDirection direction) async {
    final isArchive = direction == DismissDirection.startToEnd;
    final action = isArchive ? 'archiver' : 'mettre à la corbeille';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isArchive ? 'Archiver la candidature ?' : 'Supprimer la candidature ?'),
        content: Text(
          isArchive
              ? '« ${application.position} » sera retirée de la liste active.'
              : '« ${application.position} » sera déplacée vers la corbeille.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: isArchive ? Colors.amber.shade800 : Colors.red.shade700,
            ),
            child: Text(isArchive ? 'Archiver' : 'Corbeille'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return false;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<ApplicationProvider>(context, listen: false);
    try {
      if (isArchive) {
        await provider.archiveApplication(application.id, token: auth.token);
      } else {
        await provider.deleteApplication(application.id, token: auth.token);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isArchive ? 'Candidature archivée' : 'Candidature déplacée vers la corbeille')),
        );
      }
      return true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
      return false;
    }
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
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: c)),
            ),
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
        final raw = contacts[index];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(raw as Map);
        final name = contactDisplayName(map);
        final email = map['email']?.toString() ?? '';
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.person, color: Colors.green),
            title: Text(name),
            subtitle: email.isNotEmpty ? Text(email) : null,
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: map)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEntretiensTab() {
    final interviewProvider = Provider.of<InterviewProvider>(context);
    final interviews = interviewProvider.interviews;
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
            title: Text(formatSmartEventDate(i.interviewDate)),
            subtitle: Text(i.location ?? i.notes ?? 'Entretien'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRelancesTab() {
    final followUpProvider = Provider.of<FollowUpProvider>(context);
    final pending = followUpProvider.pendingFollowUps;
    final completed = followUpProvider.completedFollowUps;
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
          ...pending.map((f) => _relanceTile(f)),
          const SizedBox(height: 16),
        ],
        if (completed.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Terminées', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey[800])),
          ),
          ...completed.map((f) => _relanceTile(f)),
        ],
      ],
    );
  }

  Widget _relanceTile(FollowUp f) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.schedule_send, color: Colors.teal),
        title: Text(formatSmartEventDate(f.scheduledDate)),
        subtitle: Text(f.notes ?? followUpStatusLabel(f.status)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: f)),
        ),
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
}

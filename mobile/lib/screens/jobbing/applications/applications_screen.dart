import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/shell_app_bar_menu.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/utils/shell_layout.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/application_card.dart';

class ApplicationsScreen extends StatefulWidget {
  final int initialTabIndex;
  final String? statusFilter;
  final bool isShellVisible;

  const ApplicationsScreen({
    super.key,
    this.initialTabIndex = 0,
    this.statusFilter,
    this.isShellVisible = true,
  });

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> with SingleTickerProviderStateMixin {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late TabController _tabController;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.statusFilter;
    _tabController = TabController(
      length: 5,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 4),
    );
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void didUpdateWidget(covariant ApplicationsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTabIndex != widget.initialTabIndex &&
        _tabController.index != widget.initialTabIndex) {
      _tabController.animateTo(widget.initialTabIndex.clamp(0, 4));
    }
    if (oldWidget.statusFilter != widget.statusFilter) {
      setState(() => _statusFilter = widget.statusFilter);
    }
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
      companyProvider.loadCompanies(token: token).catchError((_) {}),
      contactProvider.loadContacts(token: token).catchError((_) {}),
      interviewProvider.loadInterviews(token: token).catchError((_) {}),
      followUpProvider.loadFollowUps(token: token).catchError((_) {}),
    ]);

    final names = {for (final c in companyProvider.companies) c.id: c.name};
    appProvider.enrichCompanies(names);

    if (!mounted) return;
    final err = appProvider.lastError;
    if (err != null && err.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Candidatures : $err')),
      );
    }
  }

  Future<void> _loadApplications() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final appProvider = Provider.of<ApplicationProvider>(context, listen: false);
    final companyProvider = Provider.of<CompanyProvider>(context, listen: false);
    await appProvider.loadApplications(token: auth.token);
    appProvider.enrichCompanies({for (final c in companyProvider.companies) c.id: c.name});
    if (!mounted) return;
    final err = appProvider.lastError;
    if (err != null && err.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Candidatures : $err')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Candidatures'),
        centerTitle: true,
        actions: [
          const MobileNotificationCenter(),
          const ShellAppBarMenu(),
        ],
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
      floatingActionButton: widget.isShellVisible && _tabController.index == 0
          ? shellFabPadding(context, child: _buildFab()!)
          : null,
    );
  }

  Widget? _buildFab() {
    return FloatingActionButton(
      heroTag: 'fab_applications_list',
      onPressed: () async {
        final result = await ApplicationFormScreen.showCreateSheet(context);
        if (result == true) _loadAll();
      },
      backgroundColor: Colors.blue[600],
      child: const Icon(Icons.add),
    );
  }

  Widget _buildCandidaturesTab() {
    final appProvider = Provider.of<ApplicationProvider>(context);
    var applications = appProvider.applications;
    if (_statusFilter != null && _statusFilter!.isNotEmpty) {
      applications = applications.where((a) => a.status == _statusFilter).toList();
    }
    final error = appProvider.lastError;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: appProvider.isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.blue))
            : error != null && error.isNotEmpty && applications.isEmpty
                ? _buildErrorState(error)
                : applications.isEmpty
                ? Column(
                    children: [
                      if (_statusFilter != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: InputChip(
                            label: Text('Filtre : ${applicationStatusLabel(_statusFilter!)}'),
                            onDeleted: () => setState(() => _statusFilter = null),
                          ),
                        ),
                      Expanded(child: _buildEmptyState()),
                    ],
                  )
                : RefreshIndicator(
                    onRefresh: _loadApplications,
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.only(bottom: shellBottomExtra(context) + 72),
                      itemCount: applications.length + (_statusFilter != null ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (_statusFilter != null && index == 0) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: InputChip(
                              label: Text('Filtre : ${applicationStatusLabel(_statusFilter!)}'),
                              onDeleted: () => setState(() => _statusFilter = null),
                            ),
                          );
                        }
                        final i = _statusFilter != null ? index - 1 : index;
                        final application = applications[i];
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
            subtitle: c.website.isNotEmpty ? Text(c.website) : null,
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

  Widget _buildErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off, size: 72, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text('Impossible de charger les candidatures', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(message, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _loadApplications,
            icon: const Icon(Icons.refresh),
            label: const Text('Réessayer'),
          ),
        ],
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
              final result = await ApplicationFormScreen.showCreateSheet(context);
              if (result == true) _loadAll();
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

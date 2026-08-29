import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/navigation/shell_list_refresh_mixin.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/network_recovery_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';
import 'package:jobbingtrack_mobile/widgets/offline_mode_banner.dart';
import 'package:jobbingtrack_mobile/widgets/shell_app_bar_menu.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer_leading.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/utils/shell_layout.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';
import 'package:jobbingtrack_mobile/utils/app_snack.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/application_card.dart';
import 'package:jobbingtrack_mobile/widgets/company_create_dialog.dart';
import 'package:jobbingtrack_mobile/widgets/contact_create_sheet.dart';
import 'package:jobbingtrack_mobile/widgets/list_item_swipe_actions.dart';
import 'package:jobbingtrack_mobile/utils/entity_swipe_confirm.dart';

class ApplicationsScreen extends StatefulWidget {
  final int initialTabIndex;
  final String? statusFilter;
  final bool isShellVisible;
  final ValueChanged<int>? onSubTabIndexChanged;

  const ApplicationsScreen({
    super.key,
    this.initialTabIndex = 0,
    this.statusFilter,
    this.isShellVisible = true,
    this.onSubTabIndexChanged,
  });

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen>
    with SingleTickerProviderStateMixin, RouteAware, ShellListRefreshMixin {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late TabController _tabController;
  String? _statusFilter;
  List<Call> _calls = [];
  bool _callsLoading = false;
  bool _callsOfflineData = false;
  bool _retrying = false;

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.statusFilter;
    _tabController = TabController(
      length: 6,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 5),
    );
    _tabController.addListener(_onSubTabChanged);
    ApplicationsSubTabRegistry.registerGoToFirstSubTab(_goToFirstSubTab);
    ApplicationsSubTabRegistry.setCurrentIndex(_tabController.index.clamp(0, 5));
    ShellTabRegistry.setCurrentTab(1, applicationsSubTab: _tabController.index);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  static const _subTabTitles = [
    'Candidatures',
    'Entreprises',
    'Contacts',
    'Entretiens',
    'Relances',
    'Appels',
  ];

  void _onSubTabChanged() {
    if (!mounted) return;
    final index = _tabController.index;
    ApplicationsSubTabRegistry.setCurrentIndex(index);
    ShellTabRegistry.setCurrentTab(1, applicationsSubTab: index);
    widget.onSubTabIndexChanged?.call(index);
    if (!_tabController.indexIsChanging) {
      setState(() {});
    }
  }

  void _goToFirstSubTab() {
    if (_tabController.index != 0) {
      _tabController.animateTo(0);
    }
  }

  @override
  void didUpdateWidget(covariant ApplicationsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTabIndex != widget.initialTabIndex &&
        _tabController.index != widget.initialTabIndex) {
      _tabController.animateTo(widget.initialTabIndex.clamp(0, 5));
    }
    if (oldWidget.statusFilter != widget.statusFilter) {
      setState(() => _statusFilter = widget.statusFilter);
    }
  }

  @override
  void dispose() {
    ApplicationsSubTabRegistry.registerGoToFirstSubTab(null);
    _tabController.removeListener(_onSubTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  @override
  void onShellListVisibleAgain() {
    _loadAll();
  }

  Future<void> _loadCalls({String? userId}) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final uid = userId ?? auth.user?.id;
    setState(() => _callsLoading = true);
    try {
      final result = await OfflineListLoader.load<Call>(
        userId: uid,
        cacheKey: OfflineEntityKeys.calls,
        fetch: () => ApiService.getCalls(token: auth.token),
        fromJson: Call.fromJson,
        toJson: (c) => c.toJson(),
      );
      if (mounted) {
        setState(() {
          _calls = result.items;
          _callsOfflineData = result.fromCache;
          _callsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _callsLoading = false);
    }
  }

  Future<void> _retryConnectionAndLoad() async {
    if (_retrying || !mounted) return;
    setState(() => _retrying = true);
    try {
      await NetworkRecoveryService.recoverConnection();
      if (!mounted) return;
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.refreshSessionIfOnline();
      if (!mounted) return;
      await _loadAll();
      if (!mounted) return;
      if (!await ApiService.isReachable()) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Toujours hors ligne — données en cache si disponibles'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _retrying = false);
    }
  }

  Future<void> _loadAll() async {
    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.refreshSessionIfOnline();
    if (!mounted) return;
    final token = auth.token;
    final userId = auth.user?.id;
    final appProvider = Provider.of<ApplicationProvider>(context, listen: false);
    final companyProvider = Provider.of<CompanyProvider>(context, listen: false);
    final contactProvider = Provider.of<ContactProvider>(context, listen: false);
    final interviewProvider = Provider.of<InterviewProvider>(context, listen: false);
    final followUpProvider = Provider.of<FollowUpProvider>(context, listen: false);

    setState(() => _callsLoading = true);

    await Future.wait([
      appProvider.loadApplications(
        token: token,
        userId: userId,
        renewToken: () async {
          final ok = await auth.trySilentTokenRefresh();
          return ok ? auth.token : null;
        },
      ),
      companyProvider.loadCompanies(token: token, userId: userId).catchError((_) {}),
      contactProvider.loadContacts(token: token, userId: userId).catchError((_) {}),
      interviewProvider.loadInterviews(token: token, userId: userId).catchError((_) {}),
      followUpProvider.loadFollowUps(token: token, userId: userId).catchError((_) {}),
      _loadCalls(userId: userId),
    ]);

    if (!mounted) return;
    setState(() => _callsLoading = false);

    final names = {for (final c in companyProvider.companies) c.id: c.name};
    appProvider.enrichCompanies(names);

    if (!mounted) return;
    final err = appProvider.lastError;
    final offline = appProvider.isOfflineData;
    if (err != null && err.isNotEmpty && !offline && appProvider.applications.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Candidatures : $err')),
      );
    }
  }

  Future<void> _loadApplications() async {
    await _retryConnectionAndLoad();
  }

  bool _showOfflineBanner(BuildContext context) {
    final app = context.watch<ApplicationProvider>();
    final company = context.watch<CompanyProvider>();
    final contact = context.watch<ContactProvider>();
    final interview = context.watch<InterviewProvider>();
    final followUp = context.watch<FollowUpProvider>();
    return app.isOfflineData ||
        company.isOfflineData ||
        contact.isOfflineData ||
        interview.isOfflineData ||
        followUp.isOfflineData ||
        _callsOfflineData;
  }

  @override
  Widget build(BuildContext context) {
    final tabTitle = _subTabTitles[_tabController.index.clamp(0, _subTabTitles.length - 1)];
    return DrawerBackScope(
      scaffoldKey: _scaffoldKey,
      active: widget.isShellVisible,
      child: Scaffold(
      key: _scaffoldKey,
      drawer: const AppDrawer(),
      appBar: AppBar(
        leading: const AppDrawerLeadingButton(),
        automaticallyImplyLeading: false,
        title: Text(tabTitle),
        centerTitle: true,
        actions: [
          ShellAppBarActions(
            leadingActions: [
              IconButton(
                tooltip: 'Actualiser',
                icon: const Icon(Icons.refresh),
                onPressed: _loadAll,
              ),
            ],
          ),
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
            Tab(icon: Icon(Icons.phone, size: 20), text: 'Appels'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_showOfflineBanner(context))
            OfflineModeBanner(
              pendingSyncCount: OfflineBusinessSyncQueue.instance.pendingCount,
              onRetry: _retrying ? null : _retryConnectionAndLoad,
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCandidaturesTab(),
                _buildEntreprisesTab(),
                _buildContactsTab(),
                _buildEntretiensTab(),
                _buildRelancesTab(),
                _buildAppelsTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: widget.isShellVisible && (_tabController.index == 0 || _tabController.index == 1 || _tabController.index == 2)
          ? shellFabPadding(context, child: _buildFab()!)
          : null,
    ),
    );
  }

  Widget? _buildFab() {
    if (_tabController.index == 1) {
      return FloatingActionButton(
        heroTag: 'fab_companies_tab',
        tooltip: 'Nouvelle entreprise',
        onPressed: () async {
          final created = await showCreateCompanyDialog(context);
          if (!mounted || created == null) return;
          final auth = Provider.of<AuthProvider>(context, listen: false);
          await Provider.of<CompanyProvider>(context, listen: false)
              .loadCompanies(token: auth.token);
          if (mounted) setState(() {});
        },
        backgroundColor: Colors.purple[600],
        child: const Icon(Icons.add_business_outlined),
      );
    }
    if (_tabController.index == 2) {
      return FloatingActionButton(
        heroTag: 'fab_contacts_tab',
        tooltip: 'Nouveau contact',
        onPressed: () async {
          final created = await showCreateContactSheet(context);
          if (created != null && mounted) {
            await _loadAll();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Contact créé')),
              );
            }
          }
        },
        backgroundColor: Colors.green[700],
        child: const Icon(Icons.person_add_outlined),
      );
    }
    return FloatingActionButton(
      heroTag: 'fab_applications_list',
      tooltip: 'Nouvelle candidature',
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
            : !appProvider.isOfflineData && error != null && error.isNotEmpty && applications.isEmpty
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
                          onEdit: () => _openApplicationDetail(application),
                          onArchive: () => _archiveApplication(application),
                          onTrash: () => _trashApplication(application),
                        );
                      },
                    ),
                  ),
      ),
    );
  }

  Future<void> _archiveApplication(Application application) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<ApplicationProvider>(context, listen: false);
    try {
      await provider.archiveApplication(application.id, token: auth.token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Candidature archivée')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _trashApplication(Application application) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<ApplicationProvider>(context, listen: false);
    try {
      await provider.deleteApplication(application.id, token: auth.token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Candidature déplacée vers la corbeille')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Widget _swipeListTile({
    required String id,
    required Widget listTile,
    required String label,
    required VoidCallback onOpen,
    VoidCallback? onEdit,
    required Future<void> Function() onArchive,
    required Future<void> Function() onTrash,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ListItemSwipeActions(
        itemKey: ValueKey(id),
        startActions: [
          SwipeListAction(
            icon: Icons.archive_outlined,
            label: 'Archiver',
            color: Colors.amber.shade700,
            onPressed: () async {
              if (!await confirmArchiveEntity(
                context,
                title: 'Archiver ?',
                message: '« $label » sera retiré de la liste active.',
              )) {
                return;
              }
              await onArchive();
            },
          ),
        ],
        endActions: [
          if (onEdit != null)
            SwipeListAction(
              icon: Icons.edit_outlined,
              label: 'Modifier',
              color: Colors.blue.shade600,
              onPressed: onEdit,
            ),
          SwipeListAction(
            icon: Icons.delete_outline,
            label: 'Corbeille',
            color: Colors.red.shade600,
            onPressed: () async {
              if (!await confirmTrashEntity(
                context,
                title: 'Mettre à la corbeille ?',
                message: '« $label » sera déplacé vers la corbeille.',
              )) {
                return;
              }
              await onTrash();
            },
          ),
        ],
        child: listTile,
      ),
    );
  }

  Future<void> _openApplicationDetail(Application application) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: application)),
    );
    if (result == true) _loadApplications();
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
        return _swipeListTile(
          id: 'company-${c.id}',
          label: c.name,
          onOpen: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: c)),
          ),
          onEdit: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: c)),
          ),
          onArchive: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.archiveCompany(c.id, token: auth.token);
            await Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: auth.token);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entreprise archivée')));
            }
          },
          onTrash: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.deleteCompany(c.id, token: auth.token);
            await Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: auth.token);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entreprise mise à la corbeille')));
            }
          },
          listTile: ListTile(
            leading: const Icon(Icons.business, color: Colors.purple),
            title: Text(c.name),
            subtitle: () {
              final meta = companyListSubtitle(c);
              if (meta.isEmpty) return null;
              return Text(meta, maxLines: 2, overflow: TextOverflow.ellipsis);
            }(),
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
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () async {
                final created = await showCreateContactSheet(context);
                if (created != null && mounted) await _loadAll();
              },
              icon: const Icon(Icons.person_add_outlined),
              label: const Text('Nouveau contact'),
            ),
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
        final meta = contactListSubtitle(map);
        final id = map['id']?.toString() ?? 'contact-$index';
        return _swipeListTile(
          id: 'contact-$id',
          label: name,
          onOpen: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: map)),
          ),
          onEdit: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: map)),
          ),
          onArchive: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.archiveContact(id, token: auth.token);
            await _loadAll();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact archivé')));
            }
          },
          onTrash: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.deleteContact(id, token: auth.token);
            await _loadAll();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact mis à la corbeille')));
            }
          },
          listTile: ListTile(
            leading: const Icon(Icons.person, color: Colors.green),
            title: Text(name),
            subtitle: meta.isNotEmpty
                ? Text(meta, maxLines: 2, overflow: TextOverflow.ellipsis)
                : null,
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
        final label = formatSmartEventDate(i.interviewDate);
        final apps = Provider.of<ApplicationProvider>(context, listen: false).applications;
        final offerLine = linkedOfferCompanyLine(
          applicationId: i.applicationId,
          position: i.applicationPosition,
          companyName: i.companyName,
          applications: apps,
        );
        final meta = joinListMeta([
          offerLine,
          i.location,
        ]);
        return _swipeListTile(
          id: 'interview-${i.id}',
          label: label,
          onOpen: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
          ),
          onEdit: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
          ),
          onArchive: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.archiveInterview(i.id, token: auth.token);
            await Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: auth.token);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entretien archivé')));
            }
          },
          onTrash: () async {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await ApiService.deleteInterview(i.id, token: auth.token);
            await Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: auth.token);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entretien mis à la corbeille')));
            }
          },
          listTile: ListTile(
            leading: const Icon(Icons.calendar_today, color: Colors.orange),
            title: Text(label),
            subtitle: Text(
              meta.isNotEmpty ? meta : (i.notes ?? 'Entretien'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
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
    final title = followUpListTitle(f);
    final apps = Provider.of<ApplicationProvider>(context, listen: false).applications;
    final offerLine = linkedOfferCompanyLine(
      applicationId: f.applicationId,
      position: f.applicationPosition,
      companyName: f.companyName,
      applications: apps,
    );
    final subtitle = joinListMeta([
      offerLine,
      f.contactDisplayName,
      followUpStatusLabel(f.status),
    ]);
    Future<void> openDetail() async {
      final changed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: f)),
      );
      if (changed == true && mounted) {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        await Provider.of<FollowUpProvider>(context, listen: false)
            .loadFollowUps(token: auth.token);
      }
    }

    return _swipeListTile(
      id: 'followup-${f.id}',
      label: title,
      onOpen: openDetail,
      onEdit: openDetail,
      onArchive: () async {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        await ApiService.archiveFollowUp(f.id, token: auth.token);
        await Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: auth.token);
        if (mounted) {
          AppSnack.info('Relance archivée', context: context);
        }
      },
      onTrash: () async {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        await Provider.of<FollowUpProvider>(context, listen: false).deleteFollowUp(f.id, token: auth.token);
        if (mounted) {
          AppSnack.info('Relance mise à la corbeille', context: context);
        }
      },
      listTile: ListTile(
        leading: const Icon(Icons.schedule_send, color: Colors.teal),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          subtitle.isNotEmpty ? subtitle : followUpNotesWithoutChannel(f.notes),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: openDetail,
      ),
    );
  }

  Widget _buildAppelsTab() {
    if (_callsLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.blue));
    }
    if (_calls.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.phone_in_talk, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Aucun appel', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadCalls,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: _calls.length,
        itemBuilder: (context, index) {
          final c = _calls[index];
          final label = c.subject.trim().isNotEmpty ? c.subject : 'Appel téléphonique';
          final apps = Provider.of<ApplicationProvider>(context, listen: false).applications;
          final offerLine = linkedOfferCompanyLine(
            applicationId: c.applicationId,
            position: c.applicationPosition,
            companyName: c.companyName,
            applications: apps,
          );
          final meta = joinListMeta([
            c.isCompanyOnly ? null : c.targetLabel,
            offerLine.isNotEmpty ? offerLine : c.companyName,
            formatSmartEventDate(c.callDate),
          ]);
          return _swipeListTile(
            id: 'call-${c.id}',
            label: label,
            onOpen: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => CallDetailScreen(call: c)),
            ),
            onEdit: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => CallDetailScreen(call: c)),
            ),
            onArchive: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await ApiService.archiveCall(c.id, token: auth.token);
              await _loadCalls();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appel archivé')));
              }
            },
            onTrash: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await ApiService.deleteCall(c.id, token: auth.token);
              await _loadCalls();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appel mis à la corbeille')));
              }
            },
            listTile: ListTile(
              leading: const Icon(Icons.phone, color: Colors.green),
              title: Text(label),
              subtitle: Text(meta, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CallDetailScreen(call: c)),
              ),
            ),
          );
        },
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
            onPressed: _retrying ? null : _retryConnectionAndLoad,
            icon: _retrying
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            label: Text(_retrying ? 'Connexion…' : 'Réessayer'),
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

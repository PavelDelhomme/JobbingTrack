import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/global_search.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchCtrl = TextEditingController();
  final _focusNode = FocusNode();
  GlobalSearchCategory _filter = GlobalSearchCategory.all;
  List<Call> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAll();
      final args = ModalRoute.of(context)?.settings.arguments;
      final autofocus = args is Map && args['autofocus'] == true;
      if (autofocus) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.token;
    setState(() => _loading = true);
    try {
      await Future.wait([
        Provider.of<ApplicationProvider>(context, listen: false).loadApplications(token: token),
        Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: token),
        Provider.of<ContactProvider>(context, listen: false).loadContacts(token: token),
        Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: token),
        Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: token),
      ]);
      final calls = await ApiService.getCalls(token: token);
      if (mounted) setState(() {
        _calls = calls;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<GlobalSearchHit> _currentHits(BuildContext context) {
    final appProv = Provider.of<ApplicationProvider>(context);
    final companyProv = Provider.of<CompanyProvider>(context);
    final contactProv = Provider.of<ContactProvider>(context);
    final interviewProv = Provider.of<InterviewProvider>(context);
    final followProv = Provider.of<FollowUpProvider>(context);

    final contacts = contactProv.contacts
        .map((c) => c is Map<String, dynamic> ? c : Map<String, dynamic>.from(c as Map))
        .toList();

    return searchGlobal(
      query: _searchCtrl.text,
      category: _filter,
      applications: appProv.applications,
      companies: companyProv.companies,
      contacts: contacts,
      interviews: interviewProv.interviews,
      followUps: followProv.followUps,
      calls: _calls,
    );
  }

  void _trackResults(int count) {
    final q = _searchCtrl.text.trim();
    if (q.length < 2) return;
    CrashReporter.trackSearchQuery(q, resultCount: count, screen: 'global_search');
  }

  @override
  Widget build(BuildContext context) {
    final hits = _currentHits(context);
    final query = _searchCtrl.text.trim();
    final grouped = groupSearchHits(hits);
    final orderedCategories = GlobalSearchCategory.values
        .where((c) => c != GlobalSearchCategory.all && grouped.containsKey(c))
        .toList();

    if (query.length >= 2) _trackResults(hits.length);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recherche globale'),
        centerTitle: true,
        actions: [MobileNotificationCenter()],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: TextField(
              controller: _searchCtrl,
              focusNode: _focusNode,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Candidature, entreprise, contact, relance…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: query.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear), onPressed: () => _searchCtrl.clear())
                    : null,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: GlobalSearchCategory.values.map((cat) {
                final selected = _filter == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    selected: selected,
                    avatar: Icon(cat.icon, size: 18, color: selected ? Colors.white : categoryColor(cat)),
                    label: Text(cat.label),
                    onSelected: (_) => setState(() => _filter = cat),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : query.isEmpty
                    ? _buildIdleState(context)
                    : hits.isEmpty
                        ? _buildNoResults(query)
                        : RefreshIndicator(
                            onRefresh: _loadAll,
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                              children: [
                                Text(
                                  '${hits.length} résultat${hits.length > 1 ? 's' : ''}',
                                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                if (_filter == GlobalSearchCategory.all)
                                  ...orderedCategories.expand((cat) => [
                                        _sectionTitle(cat.label, grouped[cat]!.length),
                                        ...grouped[cat]!.map(_buildHitTile),
                                      ])
                                else
                                  ...hits.map(_buildHitTile),
                              ],
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildIdleState(BuildContext context) {
    final appCount = Provider.of<ApplicationProvider>(context).applications.length;
    final companyCount = Provider.of<CompanyProvider>(context).companies.length;
    final contactCount = Provider.of<ContactProvider>(context).contacts.length;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Icon(Icons.travel_explore, size: 56, color: Colors.grey.shade400),
        const SizedBox(height: 16),
        Text(
          'Recherche dans toute l\'application',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.grey.shade800),
        ),
        const SizedBox(height: 8),
        Text(
          'Une seule barre pour retrouver candidatures, entreprises, contacts, entretiens, relances et appels.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.4),
        ),
        const SizedBox(height: 24),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            _statChip('Candidatures', appCount, GlobalSearchCategory.application),
            _statChip('Entreprises', companyCount, GlobalSearchCategory.company),
            _statChip('Contacts', contactCount, GlobalSearchCategory.contact),
          ],
        ),
      ],
    );
  }

  Widget _statChip(String label, int count, GlobalSearchCategory cat) {
    return ActionChip(
      avatar: Icon(cat.icon, size: 18, color: categoryColor(cat)),
      label: Text('$label · $count'),
      onPressed: () => setState(() => _filter = cat),
    );
  }

  Widget _buildNoResults(String query) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text('Aucun résultat pour « $query »', style: TextStyle(color: Colors.grey.shade700)),
          const SizedBox(height: 6),
          Text('Essayez un autre mot-clé ou élargissez le filtre « Tout »',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, int count) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 6),
      child: Text(
        '$title ($count)',
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildHitTile(GlobalSearchHit hit) {
    final color = categoryColor(hit.category);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.12),
          child: Icon(hit.category.icon, color: color, size: 20),
        ),
        title: Text(hit.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (hit.subtitle.isNotEmpty)
              Text(hit.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            if (hit.meta != null)
              Text(hit.meta!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _openHit(hit),
      ),
    );
  }

  void _openHit(GlobalSearchHit hit) {
    switch (hit.category) {
      case GlobalSearchCategory.application:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: hit.payload as Application)),
        );
        break;
      case GlobalSearchCategory.company:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: hit.payload as Company)),
        );
        break;
      case GlobalSearchCategory.contact:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ContactDetailScreen(
              contact: Map<String, dynamic>.from(hit.payload as Map),
            ),
          ),
        );
        break;
      case GlobalSearchCategory.interview:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: hit.payload as Interview)),
        );
        break;
      case GlobalSearchCategory.followUp:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: hit.payload as FollowUp)),
        );
        break;
      case GlobalSearchCategory.call:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Détail appel — ouvrez la candidature liée depuis Appels')),
        );
        Navigator.of(context).pushNamed('/calls');
        break;
      case GlobalSearchCategory.all:
        break;
    }
  }
}

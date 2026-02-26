import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _searchCtrl.addListener(() {
      setState(() => _query = _searchCtrl.text.toLowerCase());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final companyProv = Provider.of<CompanyProvider>(context, listen: false);
    final contactProv = Provider.of<ContactProvider>(context, listen: false);
    final interviewProv = Provider.of<InterviewProvider>(context, listen: false);
    final followUpProv = Provider.of<FollowUpProvider>(context, listen: false);
    await Future.wait([
      companyProv.loadCompanies(),
      contactProv.loadContacts(),
      interviewProv.loadInterviews(),
      followUpProv.loadFollowUps(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recherche'),
        centerTitle: true,
        actions: [MobileNotificationCenter()],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          labelColor: Colors.blue[700],
          unselectedLabelColor: Colors.grey[600],
          indicatorColor: Colors.blue[700],
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(icon: Icon(Icons.business, size: 20), text: 'Entreprises'),
            Tab(icon: Icon(Icons.people, size: 20), text: 'Contacts'),
            Tab(icon: Icon(Icons.event, size: 20), text: 'Entretiens'),
            Tab(icon: Icon(Icons.schedule_send, size: 20), text: 'Relances'),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Rechercher...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear), onPressed: () => _searchCtrl.clear())
                    : null,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
                isDense: true,
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _CompaniesTab(query: _query),
                _ContactsTab(query: _query),
                _InterviewsTab(query: _query),
                _FollowUpsTab(query: _query),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CompaniesTab extends StatelessWidget {
  final String query;
  const _CompaniesTab({required this.query});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<CompanyProvider>(context);
    final items = prov.companies.where((c) {
      if (query.isEmpty) return true;
      return c.name.toLowerCase().contains(query) ||
             c.industry.toLowerCase().contains(query);
    }).toList();

    if (prov.isLoading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) return _emptyState('Aucune entreprise trouvee');

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final c = items[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.purple[100],
              child: Icon(Icons.business, color: Colors.purple[700], size: 20),
            ),
            title: Text(c.name.isNotEmpty ? c.name : 'Sans nom', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(c.industry, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).pushNamed('/companies'),
          ),
        );
      },
    );
  }
}

class _ContactsTab extends StatelessWidget {
  final String query;
  const _ContactsTab({required this.query});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<ContactProvider>(context);
    final items = prov.contacts.where((c) {
      if (query.isEmpty) return true;
      final name = '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.toLowerCase();
      return name.contains(query) || ((c['email'] ?? '').toString().toLowerCase().contains(query));
    }).toList();

    if (prov.isLoading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) return _emptyState('Aucun contact trouve');

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final c = items[i];
        final fn = (c['firstName'] ?? '').toString();
        final ln = (c['lastName'] ?? '').toString();
        final email = (c['email'] ?? '').toString();
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.green[100],
              child: Text(
                (fn.isNotEmpty ? fn[0] : '?').toUpperCase(),
                style: TextStyle(color: Colors.green[700], fontWeight: FontWeight.bold),
              ),
            ),
            title: Text('$fn $ln', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(email, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).pushNamed('/contacts'),
          ),
        );
      },
    );
  }
}

class _InterviewsTab extends StatelessWidget {
  final String query;
  const _InterviewsTab({required this.query});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<InterviewProvider>(context);
    final items = prov.interviews.where((iv) {
      if (query.isEmpty) return true;
      final notes = (iv['notes'] ?? '').toString().toLowerCase();
      final type = (iv['type'] ?? '').toString().toLowerCase();
      return notes.contains(query) || type.contains(query);
    }).toList();

    if (prov.isLoading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) return _emptyState('Aucun entretien trouve');

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final iv = items[i];
        final type = (iv['type'] ?? 'Entretien').toString();
        final notes = (iv['notes'] ?? '').toString();
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.orange[100],
              child: Icon(Icons.event, color: Colors.orange[700], size: 20),
            ),
            title: Text(type, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(notes, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).pushNamed('/interviews'),
          ),
        );
      },
    );
  }
}

class _FollowUpsTab extends StatelessWidget {
  final String query;
  const _FollowUpsTab({required this.query});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<FollowUpProvider>(context);
    final items = prov.followUps.where((f) {
      if (query.isEmpty) return true;
      return (f.type?.toLowerCase().contains(query) ?? false) ||
             (f.notes?.toLowerCase().contains(query) ?? false);
    }).toList();

    if (prov.isLoading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) return _emptyState('Aucune relance trouvee');

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final f = items[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue[100],
              child: Icon(Icons.schedule_send, color: Colors.blue[700], size: 20),
            ),
            title: Text(f.type ?? 'Relance', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(f.notes ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).pushNamed('/followups'),
          ),
        );
      },
    );
  }
}

Widget _emptyState(String message) {
  return Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
        const SizedBox(height: 12),
        Text(message, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
      ],
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class CompaniesScreen extends StatefulWidget {
  const CompaniesScreen({super.key});

  @override
  State<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends State<CompaniesScreen> {
  String _query = '';
  String? _loadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      await Provider.of<CompanyProvider>(context, listen: false).loadCompanies(token: token);
    } catch (e) {
      if (mounted) {
        setState(() => _loadError = e.toString().replaceAll('Exception: ', ''));
      }
    }
  }

  List<Company> _filtered(List<Company> companies) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return companies;
    return companies.where((c) {
      return c.name.toLowerCase().contains(q) ||
          c.industry.toLowerCase().contains(q) ||
          c.location.toLowerCase().contains(q);
    }).toList();
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'TEMP_AGENCY':
        return 'Intérim';
      case 'EMPLOYER':
        return 'Employeur';
      default:
        return type.replaceAll('_', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CompanyProvider>();
    final companies = _filtered(provider.companies);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Entreprises'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Rechercher une entreprise…',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: provider.isLoading && provider.companies.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _loadError != null && provider.companies.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_loadError!, textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                            FilledButton(onPressed: _load, child: const Text('Réessayer')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: companies.isEmpty
                            ? ListView(
                                children: const [
                                  SizedBox(height: 80),
                                  Center(child: Text('Aucune entreprise')),
                                ],
                              )
                            : ListView.builder(
                                itemCount: companies.length,
                                itemBuilder: (_, i) {
                                  final c = companies[i];
                                  return ListTile(
                                    leading: CircleAvatar(
                                      child: Text(
                                        c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                                      ),
                                    ),
                                    title: Text(c.name.isNotEmpty ? c.name : 'Sans nom'),
                                    subtitle: Text(
                                      [
                                        if (c.industry.isNotEmpty) c.industry,
                                        if (c.location.isNotEmpty) c.location,
                                      ].join(' · '),
                                    ),
                                    trailing: c.companyType != 'EMPLOYER'
                                        ? Chip(
                                            label: Text(
                                              _typeLabel(c.companyType),
                                              style: const TextStyle(fontSize: 11),
                                            ),
                                            visualDensity: VisualDensity.compact,
                                          )
                                        : const Icon(Icons.chevron_right),
                                    onTap: () => Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => CompanyDetailScreen(company: c),
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}

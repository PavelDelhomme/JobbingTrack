import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
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

  Future<void> _createCompany() async {
    final nameCtrl = TextEditingController();
    final websiteCtrl = TextEditingController();
    final industryCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    final interimMode = await ApiConfigStore.loadInterimModeEnabled();
    var companyType = 'EMPLOYER';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nouvelle entreprise'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nom *'),
                  textCapitalization: TextCapitalization.words,
                ),
                TextField(
                  controller: websiteCtrl,
                  decoration: const InputDecoration(labelText: 'Site web'),
                  keyboardType: TextInputType.url,
                ),
                TextField(
                  controller: industryCtrl,
                  decoration: const InputDecoration(labelText: 'Secteur'),
                ),
                TextField(
                  controller: locationCtrl,
                  decoration: const InputDecoration(labelText: 'Localisation'),
                ),
                if (interimMode) ...[
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Boîte d\'intérim'),
                    value: companyType == 'TEMP_AGENCY',
                    onChanged: (v) => setDialogState(
                      () => companyType = v ? 'TEMP_AGENCY' : 'EMPLOYER',
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Créer')),
          ],
        ),
      ),
    );

    if (ok != true || !mounted) return;
    if (nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le nom est obligatoire')),
      );
      return;
    }

    final token = Provider.of<AuthProvider>(context, listen: false).token;
    final provider = Provider.of<CompanyProvider>(context, listen: false);
    try {
      final created = await provider.createCompany(
        name: nameCtrl.text.trim(),
        website: websiteCtrl.text.trim(),
        industry: industryCtrl.text.trim(),
        location: locationCtrl.text.trim(),
        companyType: companyType,
        token: token,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Entreprise « ${created.name} » créée')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
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
      floatingActionButton: FloatingActionButton(
        onPressed: _createCompany,
        child: const Icon(Icons.add_business_outlined),
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

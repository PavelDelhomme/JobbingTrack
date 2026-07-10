import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

/// Dialogue partagé « Nouvelle entreprise » (liste dédiée + onglet Candidatures).
Future<Company?> showCreateCompanyDialog(
  BuildContext context, {
  String defaultCompanyType = 'EMPLOYER',
  String dialogTitle = 'Nouvelle entreprise',
  bool forceInterimType = false,
}) async {
  final nameCtrl = TextEditingController();
  final websiteCtrl = TextEditingController();
  final industryCtrl = TextEditingController();
  final locationCtrl = TextEditingController();
  final interimMode = forceInterimType || await ApiConfigStore.loadInterimModeEnabled();
  var companyType = forceInterimType ? 'TEMP_AGENCY' : defaultCompanyType;

  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) => AlertDialog(
        title: Text(dialogTitle),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(
                label: 'Nom',
                textField: true,
                child: TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nom *'),
                  textCapitalization: TextCapitalization.words,
                ),
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
              if (interimMode && !forceInterimType) ...[
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

  if (ok != true || !context.mounted) return null;
  if (nameCtrl.text.trim().isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Le nom est obligatoire')),
    );
    return null;
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
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Entreprise « ${created.name} » créée')),
      );
    }
    return created;
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    }
    return null;
  }
}

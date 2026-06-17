import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';

/// Écran formulaire complet pour créer ou modifier une candidature (tous les champs backend).
class ApplicationFormScreen extends StatefulWidget {
  final Application? application;

  const ApplicationFormScreen({super.key, this.application});

  @override
  State<ApplicationFormScreen> createState() => _ApplicationFormScreenState();
}

class _ApplicationFormScreenState extends State<ApplicationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _saving = false;
  List<Company> _companies = [];
  /// Id de l'entreprise sélectionnée dans la liste (null si "nouvelle entreprise").
  String? _companyId;
  /// Nom saisi pour une nouvelle entreprise (utilisé si _companyId == null).
  final _companyNameController = TextEditingController();
  bool _useNewCompany = false;
  final _position = TextEditingController();
  final _description = TextEditingController();
  final _jobUrl = TextEditingController();
  final _location = TextEditingController();
  final _notes = TextEditingController();
  final _salaryMin = TextEditingController();
  final _salaryMax = TextEditingController();
  String _contractType = 'CDI';
  String? _workMode;
  String _applicationType = 'OFFRE';
  DateTime _applicationDate = DateTime.now();
  bool _salaryNegotiable = false;

  static const _contractTypes = ['CDI', 'CDD', 'ALTERNANCE', 'STAGE', 'FREELANCE', 'INTERIM', 'SAISONNIER'];
  static const _workModes = ['ON_SITE', 'REMOTE', 'HYBRID'];
  static const _applicationTypes = ['OFFRE', 'SPONTANEE'];

  @override
  void initState() {
    super.initState();
    if (widget.application != null) {
      final a = widget.application!;
      _position.text = a.position;
      _description.text = a.description;
      _location.text = a.location;
      _notes.text = a.notes;
      _companyId = a.company.id;
      _companyNameController.text = a.company.name;
      _applicationDate = a.appliedDate;
    }
    _loadCompanies();
  }

  Future<void> _loadCompanies() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final companyProvider = Provider.of<CompanyProvider>(context, listen: false);
    await companyProvider.loadCompanies(token: auth.token);
    if (mounted) {
      setState(() {
        _companies = companyProvider.companies;
        if (widget.application == null && _companies.isEmpty) _useNewCompany = true;
        if (!_useNewCompany && _companyId == null && _companies.isNotEmpty) _companyId = _companies.first.id;
      });
    }
  }

  @override
  void dispose() {
    _companyNameController.dispose();
    _position.dispose();
    _description.dispose();
    _jobUrl.dispose();
    _location.dispose();
    _notes.dispose();
    _salaryMin.dispose();
    _salaryMax.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildPayload() {
    final payload = <String, dynamic>{
      'position': _position.text.trim(),
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'jobUrl': _jobUrl.text.trim().isEmpty ? null : _jobUrl.text.trim(),
      'location': _location.text.trim().isEmpty ? null : _location.text.trim(),
      'contractType': _contractType,
      'workMode': _workMode,
      'applicationType': _applicationType,
      'applicationDate': _applicationDate.toIso8601String(),
      'salaryNegotiable': _salaryNegotiable,
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    };
    if (_companyId != null && _companyId!.isNotEmpty) {
      payload['companyId'] = _companyId;
    } else {
      final name = _companyNameController.text.trim();
      if (name.isNotEmpty) payload['companyName'] = name;
    }
    final sm = int.tryParse(_salaryMin.text.trim());
    final sx = int.tryParse(_salaryMax.text.trim());
    if (sm != null) payload['salaryMin'] = sm;
    if (sx != null) payload['salaryMax'] = sx;
    return payload;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final hasCompany = (_companyId != null && _companyId!.isNotEmpty) ||
        (_companyNameController.text.trim().isNotEmpty);
    if (!hasCompany) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Choisissez une entreprise ou saisissez son nom')));
      return;
    }
    setState(() => _saving = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final token = auth.token;
      final payload = _buildPayload();
      if (widget.application == null) {
        await ApiService.createApplicationFromPayload(payload, token: token);
        if (mounted) {
          Provider.of<ApplicationProvider>(context, listen: false)
              .loadApplications(token: token);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Candidature créée')));
          Navigator.of(context).pop(true);
        }
      } else {
        await ApiService.updateApplicationFromPayload(widget.application!.id, payload, token: token);
        if (mounted) {
          Provider.of<ApplicationProvider>(context, listen: false)
              .loadApplications(token: token);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Candidature mise à jour')));
          Navigator.of(context).pop(true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.application != null;
    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        title: Text(isEdit ? 'Modifier la candidature' : 'Nouvelle candidature'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: Form(
          key: _formKey,
          child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Entreprise : sélection existante ou nouveau nom (API crée l'entreprise si besoin)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('Entreprise *', style: TextStyle(fontSize: 12, color: Colors.grey[700])),
            ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<bool>(
                    value: _useNewCompany,
                    decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                    items: const [
                      DropdownMenuItem(value: false, child: Text('Sélectionner une existante')),
                      DropdownMenuItem(value: true, child: Text('Nouvelle entreprise (saisir le nom)')),
                    ],
                    onChanged: (v) {
                      setState(() {
                        _useNewCompany = v ?? false;
                        if (_useNewCompany) {
                          _companyId = null;
                        } else {
                          _companyNameController.clear();
                          if (_companies.isNotEmpty) _companyId = _companies.first.id;
                        }
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_useNewCompany)
              TextFormField(
                controller: _companyNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom de l\'entreprise',
                  hintText: 'Ex. Tech Corp',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (_useNewCompany && (v == null || v.trim().isEmpty)) return 'Saisir le nom de l\'entreprise';
                  return null;
                },
                onChanged: (_) => setState(() {}),
              )
            else
              DropdownButtonFormField<String>(
                value: _companyId,
                decoration: const InputDecoration(labelText: 'Entreprise', border: OutlineInputBorder()),
                items: _companies.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (v) => setState(() => _companyId = v),
                validator: (v) {
                  if (!_useNewCompany && (v == null || v.isEmpty)) return 'Choisir une entreprise';
                  return null;
                },
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _position,
              decoration: const InputDecoration(labelText: 'Poste *', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _jobUrl,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(labelText: 'URL de l\'offre', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _location,
              decoration: const InputDecoration(labelText: 'Lieu', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _contractType,
              decoration: const InputDecoration(labelText: 'Type de contrat', border: OutlineInputBorder()),
              items: _contractTypes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _contractType = v ?? 'CDI'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _workMode,
              decoration: const InputDecoration(labelText: 'Mode de travail', border: OutlineInputBorder()),
              items: _workModes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _workMode = v),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _applicationType,
              decoration: const InputDecoration(labelText: 'Type candidature', border: OutlineInputBorder()),
              items: _applicationTypes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _applicationType = v ?? 'OFFRE'),
            ),
            const SizedBox(height: 12),
            ListTile(
              title: const Text('Date de candidature'),
              subtitle: Text(_applicationDate.toString().split(' ')[0]),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: _applicationDate, firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
                if (d != null) setState(() => _applicationDate = d);
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _salaryMin,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Salaire min (€/an)', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _salaryMax,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Salaire max (€/an)', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            CheckboxListTile(
              title: const Text('Salaire négociable'),
              value: _salaryNegotiable,
              onChanged: (v) => setState(() => _salaryNegotiable = v ?? false),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : Text(isEdit ? 'Enregistrer' : 'Créer'),
            ),
          ],
        ),
        ),
      ),
    );
  }
}

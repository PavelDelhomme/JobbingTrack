import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/widgets/company_picker_field.dart';
import 'package:jobbingtrack_mobile/widgets/platform_picker_field.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/utils/shell_layout.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

/// Écran formulaire complet pour créer ou modifier une candidature (tous les champs backend).
class ApplicationFormScreen extends StatefulWidget {
  final Application? application;
  /// Mode popup : pas de drawer ni AppBar shell.
  final bool modalMode;
  final ScrollController? scrollController;

  const ApplicationFormScreen({
    super.key,
    this.application,
    this.modalMode = false,
    this.scrollController,
  });

  /// Ouvre le formulaire de création en bottom sheet (sans drawer).
  static Future<bool?> showCreateSheet(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) {
        final height = MediaQuery.sizeOf(ctx).height * 0.92;
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
          child: SizedBox(
            height: height,
            child: const ApplicationFormScreen(modalMode: true),
          ),
        );
      },
    );
  }

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
  String? _agencyId;
  List<Company> _agencies = [];
  List<Map<String, dynamic>> _platforms = [];
  String? _platformId;
  bool _interimMode = false;
  String _companyName = '';
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
      _companyName = a.company.name;
      _agencyId = a.agencyId;
      _platformId = a.platformId;
      _applicationDate = a.appliedDate.toLocal();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCompanies();
      _loadPlatforms();
      _loadInterimPrefs();
    });
  }

  Future<void> _loadPlatforms() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    try {
      final list = await ApiService.getPlatforms(token: auth.token);
      if (mounted) setState(() => _platforms = list);
    } catch (_) {}
  }

  DateTime _applicationDateForSave() {
    if (widget.application != null) {
      return _applicationDate.toLocal();
    }
    final now = DateTime.now();
    return DateTime(
      _applicationDate.year,
      _applicationDate.month,
      _applicationDate.day,
      now.hour,
      now.minute,
      now.second,
    );
  }

  Future<void> _loadInterimPrefs() async {
    final interim = await ApiConfigStore.loadInterimModeEnabled();
    if (!mounted) return;
    setState(() => _interimMode = interim);
    if (interim) await _loadAgencies();
  }

  Future<void> _loadAgencies() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    try {
      final list = await ApiService.getCompanies(token: auth.token, companyType: 'TEMP_AGENCY');
      final deduped = <String, Company>{};
      for (final company in list) {
        deduped.putIfAbsent(company.id, () => company);
      }
      final agencies = deduped.values.toList();
      if (mounted) {
        setState(() {
          _agencies = agencies;
          final preferred = widget.application?.agencyId ?? _agencyId;
          if (preferred != null && agencies.any((a) => a.id == preferred)) {
            _agencyId = preferred;
          } else if (_agencyId != null && !agencies.any((a) => a.id == _agencyId)) {
            _agencyId = null;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _loadCompanies() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final companyProvider = Provider.of<CompanyProvider>(context, listen: false);
    await companyProvider.loadCompanies(token: auth.token);
    if (mounted) {
      setState(() {
        _companies = companyProvider.companies;
      });
    }
  }

  @override
  void dispose() {
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
      'applicationDate': _applicationDateForSave().toUtc().toIso8601String(),
      'salaryNegotiable': _salaryNegotiable,
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    };
    if (_companyId != null && _companyId!.isNotEmpty) {
      payload['companyId'] = _companyId;
    } else {
      final name = _companyName.trim();
      if (name.isNotEmpty) payload['companyName'] = name;
    }
    final sm = int.tryParse(_salaryMin.text.trim());
    final sx = int.tryParse(_salaryMax.text.trim());
    if (sm != null) payload['salaryMin'] = sm;
    if (sx != null) payload['salaryMax'] = sx;
    if (_agencyId != null && _agencyId!.isNotEmpty) {
      payload['agencyId'] = _agencyId;
    }
    if (_platformId != null && _platformId!.isNotEmpty) {
      payload['platformId'] = _platformId;
    }
    return payload;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final hasCompany = (_companyId != null && _companyId!.isNotEmpty) || _companyName.trim().isNotEmpty;
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
          await Provider.of<ApplicationProvider>(context, listen: false)
              .loadApplications(token: token);
          await Provider.of<CompanyProvider>(context, listen: false)
              .loadCompanies(token: token);
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
      if (e is OfflineMutationQueued) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
          Navigator.of(context).pop(true);
        }
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<Widget> _buildFormFields() {
    return [
      CompanyPickerField(
        companies: _companies,
        selectedCompanyId: _companyId,
        companyName: _companyName,
        validator: (v) => (v == null || v.trim().isEmpty) ? 'Choisir ou saisir une entreprise' : null,
        onChanged: (sel) => setState(() {
          _companyId = sel.companyId;
          _companyName = sel.name;
        }),
      ),
      const SizedBox(height: 12),
      if (_interimMode) ...[
        DropdownButtonFormField<String?>(
          value: _agencyId != null && _agencies.any((a) => a.id == _agencyId)
              ? _agencyId
              : null,
          decoration: const InputDecoration(
            labelText: 'Boîte d\'intérim (optionnel)',
            border: OutlineInputBorder(),
            helperText: 'Agence à l\'origine de la proposition',
          ),
          items: [
            const DropdownMenuItem<String?>(value: null, child: Text('— Aucune / classique')),
            ..._agencies.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))),
          ],
          onChanged: (v) => setState(() => _agencyId = v),
        ),
        const SizedBox(height: 12),
      ],
      PlatformPickerField(
        selectedPlatformId: _platformId,
        platforms: _platforms,
        onChanged: (id) => setState(() => _platformId = id),
        onPlatformsChanged: _loadPlatforms,
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
      Material(
        color: Colors.transparent,
        child: ListTile(
          title: const Text('Date de candidature'),
          subtitle: Text(formatUserLocalDateTime(_applicationDate.toUtc().toIso8601String(), pattern: 'd MMM y HH:mm')),
          trailing: const Icon(Icons.calendar_today),
          onTap: () async {
            final d = await showDatePicker(context: context, initialDate: _applicationDate, firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
            if (d != null) {
              final now = DateTime.now();
              setState(() => _applicationDate = DateTime(d.year, d.month, d.day, now.hour, now.minute));
            }
          },
        ),
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
        child: _saving
            ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(widget.application == null ? 'Créer' : 'Enregistrer'),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.application != null;
    final bottomPad = widget.modalMode
        ? scrollSafePadding(context, top: 0, extraBottom: shellBottomExtra(context) + 24)
        : scrollSafePadding(context, top: 0);
    final form = Form(
      key: _formKey,
      child: ListView(
        controller: widget.scrollController,
        padding: bottomPad,
        children: _buildFormFields(),
      ),
    );

    if (widget.modalMode) {
      return Material(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Fermer',
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: const Icon(Icons.close),
                  ),
                  Expanded(
                    child: Text(
                      isEdit ? 'Modifier la candidature' : 'Nouvelle candidature',
                      style: Theme.of(context).textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(child: form),
          ],
        ),
      );
    }

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        title: Text(isEdit ? 'Modifier la candidature' : 'Nouvelle candidature'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: form,
      ),
    );
  }
}

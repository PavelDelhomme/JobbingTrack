import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/local_phone_integrations_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/contact_name_utils.dart';
import 'package:jobbingtrack_mobile/utils/contact_picker_utils.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

/// Résultat spécial : appel sans contact (entreprise / candidature seulement).
const String kCallWithoutContactFlag = '__call_without_contact__';

typedef ContactCreateFn = Future<Map<String, dynamic>> Function({
  required String firstName,
  required String lastName,
  String? email,
  String? phone,
  String? notes,
});

/// Sélection d'un contact (sections + recherche + création + import téléphone).
Future<Map<String, dynamic>?> showContactPickerSheet(
  BuildContext context, {
  required List<Map<String, dynamic>> candidates,
  required ContactCreateFn onCreateContact,
  bool allowWithoutContact = false,
  String? withoutContactLabel,
  Set<String>? applicationLinkedIds,
  Set<String>? companyLinkedIds,
  String? companyName,
}) async {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) {
      return _ContactPickerBody(
        candidates: candidates,
        onCreateContact: onCreateContact,
        allowWithoutContact: allowWithoutContact,
        withoutContactLabel: withoutContactLabel,
        applicationLinkedIds: applicationLinkedIds ?? {},
        companyLinkedIds: companyLinkedIds ?? {},
        companyName: companyName,
        multiSelect: false,
      );
    },
  );
}

/// Sélection de plusieurs contacts (ex. entretien).
Future<List<Map<String, dynamic>>?> showMultiContactPickerSheet(
  BuildContext context, {
  required List<Map<String, dynamic>> candidates,
  required ContactCreateFn onCreateContact,
  Set<String>? applicationLinkedIds,
  Set<String>? companyLinkedIds,
  String? companyName,
  List<Map<String, dynamic>> initialSelection = const [],
}) async {
  return showModalBottomSheet<List<Map<String, dynamic>>>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) {
      return _ContactPickerBody(
        candidates: candidates,
        onCreateContact: onCreateContact,
        applicationLinkedIds: applicationLinkedIds ?? {},
        companyLinkedIds: companyLinkedIds ?? {},
        companyName: companyName,
        multiSelect: true,
        initialSelection: initialSelection,
      );
    },
  );
}

class _ContactPickerBody extends StatefulWidget {
  final List<Map<String, dynamic>> candidates;
  final ContactCreateFn onCreateContact;
  final bool allowWithoutContact;
  final String? withoutContactLabel;
  final Set<String> applicationLinkedIds;
  final Set<String> companyLinkedIds;
  final String? companyName;
  final bool multiSelect;
  final List<Map<String, dynamic>> initialSelection;

  const _ContactPickerBody({
    required this.candidates,
    required this.onCreateContact,
    this.allowWithoutContact = false,
    this.withoutContactLabel,
    required this.applicationLinkedIds,
    required this.companyLinkedIds,
    this.companyName,
    this.multiSelect = false,
    this.initialSelection = const [],
  });

  @override
  State<_ContactPickerBody> createState() => _ContactPickerBodyState();
}

class _ContactPickerBodyState extends State<_ContactPickerBody> {
  bool _creating = false;
  bool _importingPhone = false;
  bool _showCreateForm = false;
  final _searchController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _notesController = TextEditingController();
  late Set<String> _selectedIds;
  late List<Map<String, dynamic>> _selectedContacts;

  @override
  void initState() {
    super.initState();
    _selectedContacts = [...widget.initialSelection];
    _selectedIds = _selectedContacts.map((c) => c['id'].toString()).toSet();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  ContactPickerSections get _sections => partitionContacts(
        candidates: widget.candidates,
        applicationLinkedIds: widget.applicationLinkedIds,
        companyLinkedIds: widget.companyLinkedIds,
      );

  List<Map<String, dynamic>> _filter(List<Map<String, dynamic>> list) {
    final q = _searchController.text.trim();
    if (q.isEmpty) return list;
    return list.where((c) => contactMatchesQuery(c, q)).toList();
  }

  Future<void> _createNewContact() async {
    final first = capitalizePersonName(_firstNameController.text);
    final last = capitalizePersonName(_lastNameController.text);
    if (first.isEmpty && last.isEmpty) {
      _showError('Indiquez au moins un prénom ou un nom.');
      return;
    }
    if (first.isEmpty || last.isEmpty) {
      _showError('Prénom et nom sont requis (ou utilisez un seul champ « Prénom Nom »).');
      return;
    }
    setState(() => _creating = true);
    try {
      final created = await widget.onCreateContact(
        firstName: first,
        lastName: last,
        email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      if (!mounted) return;
      if (widget.multiSelect) {
        setState(() {
          _selectedIds.add(created['id'].toString());
          _selectedContacts.add(created);
          _showCreateForm = false;
        });
      } else {
        Navigator.pop(context, created);
      }
    } catch (e) {
      _showError('$e');
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _importFromPhone() async {
    setState(() => _importingPhone = true);
    try {
      var local = await LocalPhoneIntegrationsService.getLocalPhoneContacts();
      if (local.isEmpty) {
        await LocalPhoneIntegrationsService.syncPhoneContactsLocally();
        local = await LocalPhoneIntegrationsService.getLocalPhoneContacts();
      }
      if (!mounted) return;
      if (local.isEmpty) {
        _showError('Aucun contact téléphone — vérifiez la permission Contacts.');
        return;
      }
      final picked = await showModalBottomSheet<Map<String, dynamic>>(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          builder: (_, controller) => Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Rechercher dans le téléphone…',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: controller,
                  padding: scrollSafePadding(ctx, top: 0),
                  itemCount: local.length,
                  itemBuilder: (_, i) {
                    final c = local[i];
                    return ListTile(
                      leading: const Icon(Icons.phone_android_outlined),
                      title: Text(c['displayName']?.toString() ?? 'Contact'),
                      subtitle: Text(c['phone']?.toString() ?? c['email']?.toString() ?? ''),
                      onTap: () => Navigator.pop(ctx, c),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
      if (picked == null || !mounted) return;
      final parsed = parsePersonName(
        picked['displayName']?.toString() ??
            '${picked['firstName'] ?? ''} ${picked['lastName'] ?? ''}',
      );
      final created = await widget.onCreateContact(
        firstName: parsed.firstName.isNotEmpty ? parsed.firstName : 'Contact',
        lastName: parsed.lastName.isNotEmpty ? parsed.lastName : '.',
        email: picked['email']?.toString(),
        phone: picked['phone']?.toString(),
      );
      if (!mounted) return;
      if (widget.multiSelect) {
        setState(() {
          _selectedIds.add(created['id'].toString());
          _selectedContacts.add(created);
        });
      } else {
        Navigator.pop(context, created);
      }
    } catch (e) {
      _showError('$e');
    } finally {
      if (mounted) setState(() => _importingPhone = false);
    }
  }

  void _toggleSelect(Map<String, dynamic> c) {
    final id = c['id']?.toString();
    if (id == null) return;
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
        _selectedContacts.removeWhere((x) => x['id']?.toString() == id);
      } else {
        _selectedIds.add(id);
        _selectedContacts.add(c);
      }
    });
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Colors.grey.shade700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  Widget _contactTile(Map<String, dynamic> c) {
    final id = c['id']?.toString();
    if (widget.multiSelect) {
      final checked = id != null && _selectedIds.contains(id);
      return CheckboxListTile(
        value: checked,
        onChanged: (_) => _toggleSelect(c),
        secondary: const Icon(Icons.person_outline),
        title: Text(contactDisplayName(c)),
        subtitle: Text(c['email']?.toString() ?? c['phone']?.toString() ?? ''),
        controlAffinity: ListTileControlAffinity.leading,
      );
    }
    return ListTile(
      leading: const Icon(Icons.person_outline),
      title: Text(contactDisplayName(c)),
      subtitle: Text(c['email']?.toString() ?? c['phone']?.toString() ?? ''),
      onTap: () => Navigator.pop(context, c),
    );
  }

  List<Widget> _buildContactSections() {
    final sections = _sections;
    final widgets = <Widget>[];
    void addBlock(String title, List<Map<String, dynamic>> items) {
      final filtered = _filter(items);
      if (filtered.isEmpty) return;
      widgets.add(_sectionHeader(title));
      widgets.addAll(filtered.map(_contactTile));
    }

    addBlock('Liés à cette candidature', sections.linkedToApplication);
    final coLabel = widget.companyName?.isNotEmpty == true
        ? 'Entreprise · ${widget.companyName}'
        : 'Liés à l\'entreprise';
    addBlock(coLabel, sections.linkedToCompany);
    addBlock('Autres contacts', sections.others);

    if (widgets.isEmpty) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            _searchController.text.trim().isEmpty
                ? 'Aucun contact enregistré.'
                : 'Aucun contact pour « ${_searchController.text.trim()} ».',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ),
      );
    }
    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.45,
      maxChildSize: 0.95,
      builder: (_, scrollController) {
        return Material(
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: scrollSafePadding(context, top: 12, extraBottom: 8),
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.multiSelect ? 'Contacts de l\'entretien' : 'Choisir un contact',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Rechercher un contact…',
                        labelText: 'Rechercher',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 8),
                    if (widget.allowWithoutContact)
                      ListTile(
                        leading: Icon(Icons.phone_in_talk_outlined, color: Colors.blue.shade700),
                        title: Text(widget.withoutContactLabel ?? 'Appel sans contact'),
                        subtitle: const Text('Lié à la candidature / entreprise uniquement'),
                        onTap: () => Navigator.pop(context, {kCallWithoutContactFlag: true}),
                      ),
                    if (widget.allowWithoutContact) const Divider(height: 8),
                    ..._buildContactSections(),
                    const Divider(height: 24),
                    OutlinedButton.icon(
                      onPressed: _importingPhone ? null : _importFromPhone,
                      icon: _importingPhone
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.import_contacts_outlined),
                      label: const Text('Importer depuis le téléphone'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _showCreateForm = !_showCreateForm),
                      icon: Icon(_showCreateForm ? Icons.expand_less : Icons.person_add_outlined),
                      label: const Text('Créer nouveau contact'),
                    ),
                    if (_showCreateForm) ...[
                      const SizedBox(height: 12),
                      Semantics(
                        label: 'Prénom',
                        textField: true,
                        child: TextField(
                          controller: _firstNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Prénom *',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Semantics(
                        label: 'Nom',
                        textField: true,
                        child: TextField(
                          controller: _lastNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Nom *',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email (optionnel)',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _phoneController,
                        decoration: const InputDecoration(
                          labelText: 'Téléphone (optionnel)',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _notesController,
                        decoration: const InputDecoration(
                          labelText: 'Notes (optionnel)',
                          border: OutlineInputBorder(),
                          alignLabelWithHint: true,
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _creating ? null : _createNewContact,
                        icon: _creating
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.check),
                        label: Text(widget.multiSelect ? 'Créer et ajouter à la sélection' : 'Créer et sélectionner'),
                      ),
                    ],
                  ],
                ),
              ),
              if (widget.multiSelect)
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, _selectedContacts),
                      child: Text(
                        _selectedContacts.isEmpty
                            ? 'Continuer sans contact'
                            : 'Valider (${_selectedContacts.length} contact${_selectedContacts.length > 1 ? 's' : ''})',
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

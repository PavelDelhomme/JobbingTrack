import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/company.dart';

/// Champ unique : recherche entreprise existante ou saisie d'un nouveau nom (création API à l'enregistrement).
class CompanyAutocompleteField extends StatefulWidget {
  final List<Company> companies;
  final String? selectedCompanyId;
  final String initialName;
  final ValueChanged<({String? companyId, String name})> onChanged;
  final String? Function(String?)? validator;

  const CompanyAutocompleteField({
    super.key,
    required this.companies,
    required this.selectedCompanyId,
    required this.initialName,
    required this.onChanged,
    this.validator,
  });

  @override
  State<CompanyAutocompleteField> createState() => _CompanyAutocompleteFieldState();
}

class _CompanyAutocompleteFieldState extends State<CompanyAutocompleteField> {
  late final TextEditingController _controller;
  final FocusNode _focusNode = FocusNode();
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.selectedCompanyId;
    _controller = TextEditingController(text: widget.initialName);
  }

  @override
  void didUpdateWidget(covariant CompanyAutocompleteField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedCompanyId != oldWidget.selectedCompanyId &&
        widget.selectedCompanyId != _selectedId) {
      _selectedId = widget.selectedCompanyId;
      if (_selectedId != null) {
        final match = widget.companies.where((c) => c.id == _selectedId).toList();
        if (match.isNotEmpty && _controller.text != match.first.name) {
          _controller.text = match.first.name;
        }
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _emit(String name, {String? id}) {
    _selectedId = id;
    widget.onChanged((companyId: id, name: name.trim()));
  }

  List<_CompanyOption> _options(String query) {
    final q = query.trim().toLowerCase();
    final list = <_CompanyOption>[];
    if (q.isEmpty) {
      for (final c in widget.companies.take(12)) {
        list.add(_CompanyOption.existing(c));
      }
      return list;
    }
    final matches = widget.companies
        .where((c) => c.name.toLowerCase().contains(q))
        .take(8)
        .map(_CompanyOption.existing);
    list.addAll(matches);
    final exact = widget.companies.any((c) => c.name.toLowerCase() == q);
    if (!exact && query.trim().isNotEmpty) {
      list.add(_CompanyOption.create(query.trim()));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return RawAutocomplete<_CompanyOption>(
      textEditingController: _controller,
      focusNode: _focusNode,
      displayStringForOption: (o) => o.label,
      optionsBuilder: (value) => _options(value.text),
      onSelected: (option) {
        if (option.isCreate) {
          _emit(option.label, id: null);
        } else {
          _emit(option.company!.name, id: option.company!.id);
        }
      },
      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
        return Semantics(
          label: 'Entreprise',
          textField: true,
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            decoration: const InputDecoration(
              labelText: 'Entreprise *',
              hintText: 'Rechercher ou saisir un nouveau nom',
              border: OutlineInputBorder(),
              suffixIcon: Icon(Icons.business_outlined),
            ),
            validator: widget.validator,
            onChanged: (v) {
              final match = widget.companies.where((c) => c.name.toLowerCase() == v.trim().toLowerCase()).toList();
              if (match.isNotEmpty) {
                _emit(match.first.name, id: match.first.id);
              } else {
                _emit(v, id: null);
              }
            },
          ),
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 4,
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240, maxWidth: 400),
              child: ListView.builder(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (_, i) {
                  final o = options.elementAt(i);
                  return ListTile(
                    dense: true,
                    leading: Icon(
                      o.isCreate ? Icons.add_business_outlined : Icons.business,
                      color: o.isCreate ? Colors.green.shade700 : null,
                    ),
                    title: Text(o.isCreate ? 'Créer « ${o.label} »' : o.label),
                    subtitle: o.isCreate
                        ? const Text('Nouvelle entreprise')
                        : (o.company?.location.isNotEmpty == true ? Text(o.company!.location) : null),
                    onTap: () => onSelected(o),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CompanyOption {
  final Company? company;
  final String label;
  final bool isCreate;

  _CompanyOption._({this.company, required this.label, required this.isCreate});

  factory _CompanyOption.existing(Company c) => _CompanyOption._(company: c, label: c.name, isCreate: false);

  factory _CompanyOption.create(String name) => _CompanyOption._(label: name, isCreate: true);
}

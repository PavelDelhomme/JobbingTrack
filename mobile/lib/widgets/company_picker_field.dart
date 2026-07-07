import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

/// Sélection d'une entreprise existante ou saisie d'un nouveau nom (sans liste déroulante au focus).
class CompanyPickerField extends StatelessWidget {
  final List<Company> companies;
  final String? selectedCompanyId;
  final String companyName;
  final ValueChanged<({String? companyId, String name})> onChanged;
  final String? Function(String?)? validator;

  const CompanyPickerField({
    super.key,
    required this.companies,
    required this.selectedCompanyId,
    required this.companyName,
    required this.onChanged,
    this.validator,
  });

  Future<void> _openPicker(BuildContext context) async {
    final search = TextEditingController();
    var filtered = List<Company>.from(companies);

    final result = await showModalBottomSheet<({String? companyId, String name})>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            void applyFilter(String q) {
              final query = q.trim().toLowerCase();
              setSheetState(() {
                filtered = query.isEmpty
                    ? List<Company>.from(companies)
                    : companies.where((c) => c.name.toLowerCase().contains(query)).toList();
              });
            }

            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
              child: DraggableScrollableSheet(
                expand: false,
                initialChildSize: 0.75,
                minChildSize: 0.4,
                maxChildSize: 0.92,
                builder: (_, scroll) {
                  return ListView(
                    controller: scroll,
                    padding: scrollSafePadding(ctx, top: 0),
                    children: [
                      Text('Choisir une entreprise', style: Theme.of(ctx).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      Semantics(
                        label: 'Rechercher',
                        textField: true,
                        child: TextField(
                          controller: search,
                          decoration: const InputDecoration(
                            labelText: 'Rechercher',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.search),
                          ),
                          onChanged: applyFilter,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (search.text.trim().isNotEmpty &&
                          !companies.any((c) => c.name.toLowerCase() == search.text.trim().toLowerCase()))
                        ListTile(
                          leading: Icon(Icons.add_business_outlined, color: Colors.green.shade700),
                          title: Semantics(
                            label: 'Créer entreprise offline',
                            button: true,
                            child: Text('Créer « ${search.text.trim()} »'),
                          ),
                          subtitle: const Text('Nouvelle entreprise à l\'enregistrement'),
                          onTap: () => Navigator.pop(ctx, (companyId: null, name: search.text.trim())),
                        ),
                      ...filtered.map(
                        (c) => ListTile(
                          leading: const Icon(Icons.business_outlined),
                          title: Text(c.name),
                          subtitle: c.location.isNotEmpty ? Text(c.location) : null,
                          trailing: selectedCompanyId == c.id ? const Icon(Icons.check_circle, color: Colors.green) : null,
                          onTap: () => Navigator.pop(ctx, (companyId: c.id, name: c.name)),
                        ),
                      ),
                      if (filtered.isEmpty && search.text.trim().isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            'Aucune entreprise enregistrée. Utilisez la recherche pour en créer une.',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ),
                    ],
                  );
                },
              ),
            );
          },
        );
      },
    );

    if (result != null) onChanged(result);
  }

  @override
  Widget build(BuildContext context) {
    final hasSelection = (selectedCompanyId != null && selectedCompanyId!.isNotEmpty) ||
        companyName.trim().isNotEmpty;
    final label = hasSelection
        ? (companyName.trim().isNotEmpty ? companyName.trim() : 'Entreprise sélectionnée')
        : 'Choisir ou créer une entreprise';

    return FormField<String>(
      initialValue: companyName,
      validator: (_) => validator?.call(companyName),
      builder: (state) {
        return InkWell(
          onTap: () => _openPicker(context),
          borderRadius: BorderRadius.circular(4),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: 'Entreprise *',
              border: const OutlineInputBorder(),
              errorText: state.errorText,
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (hasSelection)
                    IconButton(
                      tooltip: 'Effacer',
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => onChanged((companyId: null, name: '')),
                    ),
                  const Icon(Icons.business_outlined),
                ],
              ),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: hasSelection ? null : Colors.grey.shade600,
                fontWeight: hasSelection ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        );
      },
    );
  }
}

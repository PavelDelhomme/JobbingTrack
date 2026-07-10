import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/company_create_dialog.dart';

/// Sélection ou création d'une boîte d'intérim (TEMP_AGENCY).
class AgencyPickerField extends StatelessWidget {
  final List<Company> agencies;
  final String? selectedAgencyId;
  final ValueChanged<String?> onChanged;
  final Future<void> Function()? onAgencyCreated;

  const AgencyPickerField({
    super.key,
    required this.agencies,
    required this.selectedAgencyId,
    required this.onChanged,
    this.onAgencyCreated,
  });

  Future<void> _createAgency(BuildContext context) async {
    final created = await showCreateCompanyDialog(
      context,
      defaultCompanyType: 'TEMP_AGENCY',
      dialogTitle: 'Nouvelle boîte d\'intérim',
      forceInterimType: true,
    );
    if (created != null) {
      await onAgencyCreated?.call();
      onChanged(created.id);
    }
  }

  Future<void> _openPicker(BuildContext context) async {
    final search = TextEditingController();
    var filtered = List<Company>.from(agencies);

    final result = await showModalBottomSheet<String?>(
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
                    ? List<Company>.from(agencies)
                    : agencies.where((a) => a.name.toLowerCase().contains(query)).toList();
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
                      Text(
                        'Boîte d\'intérim',
                        style: Theme.of(ctx).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: search,
                        decoration: const InputDecoration(
                          labelText: 'Rechercher',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: applyFilter,
                      ),
                      const SizedBox(height: 12),
                      ListTile(
                        leading: Icon(Icons.add_business_outlined, color: Colors.amber.shade800),
                        title: const Text('Créer une boîte d\'intérim'),
                        subtitle: const Text('Comme pour une entreprise dans le formulaire candidature'),
                        onTap: () async {
                          Navigator.pop(ctx);
                          await _createAgency(context);
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.remove_circle_outline),
                        title: const Text('— Aucune / candidature classique'),
                        trailing: selectedAgencyId == null
                            ? const Icon(Icons.check_circle, color: Colors.green)
                            : null,
                        onTap: () => Navigator.pop(ctx, ''),
                      ),
                      ...filtered.map(
                        (a) => ListTile(
                          leading: Icon(Icons.business_center, color: Colors.amber.shade800),
                          title: Text(a.name),
                          subtitle: a.location.isNotEmpty ? Text(a.location) : null,
                          trailing: selectedAgencyId == a.id
                              ? const Icon(Icons.check_circle, color: Colors.green)
                              : null,
                          onTap: () => Navigator.pop(ctx, a.id),
                        ),
                      ),
                      if (filtered.isEmpty && search.text.trim().isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            'Aucune agence enregistrée. Créez-en une ci-dessus.',
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

    if (result == null) return;
    onChanged(result.isEmpty ? null : result);
  }

  @override
  Widget build(BuildContext context) {
    Company? selected;
    for (final a in agencies) {
      if (a.id == selectedAgencyId) {
        selected = a;
        break;
      }
    }
    final label = selected != null
        ? selected.name
        : (selectedAgencyId == null ? '— Aucune / classique' : 'Agence sélectionnée');

    return InkWell(
      onTap: () => _openPicker(context),
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: 'Boîte d\'intérim (optionnel)',
          helperText: 'Agence à l\'origine de la proposition',
          border: const OutlineInputBorder(),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selectedAgencyId != null)
                IconButton(
                  tooltip: 'Effacer',
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => onChanged(null),
                ),
              Icon(Icons.business_center, color: Colors.amber.shade800),
            ],
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected != null || selectedAgencyId == null ? null : Colors.grey.shade600,
            fontWeight: selected != null ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

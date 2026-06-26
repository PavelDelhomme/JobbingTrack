import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

/// Sélection d'une candidature (tri : date de candidature la plus récente en premier).
class ApplicationPickerField extends StatelessWidget {
  final List<Application> applications;
  final Application? selected;
  final ValueChanged<Application> onChanged;
  final bool enabled;
  final String? Function(Application?)? validator;

  const ApplicationPickerField({
    super.key,
    required this.applications,
    required this.selected,
    required this.onChanged,
    this.enabled = true,
    this.validator,
  });

  List<Application> get _sorted {
    final list = List<Application>.from(applications);
    list.sort((a, b) => b.appliedDate.compareTo(a.appliedDate));
    return list;
  }

  Future<void> _openPicker(BuildContext context) async {
    if (!enabled) return;
    final search = TextEditingController();
    var filtered = _sorted;

    final picked = await showModalBottomSheet<Application>(
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
                    ? _sorted
                    : _sorted.where((a) {
                        final hay = '${a.position} ${a.company.name}'.toLowerCase();
                        return hay.contains(query);
                      }).toList();
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
                      Text('Choisir une candidature', style: Theme.of(ctx).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      Semantics(
                        label: 'Rechercher candidature',
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
                      if (filtered.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            'Aucune candidature. Créez-en une depuis l’accueil.',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ),
                      ...filtered.map(
                        (a) => ListTile(
                          leading: const Icon(Icons.assignment_outlined),
                          title: Text(a.position.isNotEmpty ? a.position : 'Sans intitulé'),
                          subtitle: Text(
                            '${a.company.name.isNotEmpty ? a.company.name : 'Entreprise'} · '
                            '${formatSmartEventDate(a.appliedDate)} · '
                            '${applicationStatusLabel(a.status)}',
                          ),
                          trailing: selected?.id == a.id
                              ? const Icon(Icons.check_circle, color: Colors.green)
                              : null,
                          onTap: () => Navigator.pop(ctx, a),
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

    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final label = selected == null
        ? 'Choisir une candidature *'
        : '${selected!.position.isNotEmpty ? selected!.position : 'Candidature'} · ${selected!.company.name}';

    return FormField<Application>(
      initialValue: selected,
      validator: validator,
      builder: (state) {
        return InkWell(
          onTap: enabled ? () => _openPicker(context) : null,
          borderRadius: BorderRadius.circular(4),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: 'Candidature liée *',
              border: const OutlineInputBorder(),
              errorText: state.errorText,
              suffixIcon: Icon(
                enabled ? Icons.assignment_outlined : Icons.lock_outline,
                size: 20,
              ),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: selected == null ? Colors.grey.shade600 : null,
                fontWeight: selected != null ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        );
      },
    );
  }
}

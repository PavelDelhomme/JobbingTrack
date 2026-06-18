import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

/// Sélection d'une plateforme de candidature (liste système + perso utilisateur).
class PlatformPickerField extends StatefulWidget {
  final String? selectedPlatformId;
  final ValueChanged<String?> onChanged;
  final List<Map<String, dynamic>> platforms;
  final VoidCallback? onPlatformsChanged;

  const PlatformPickerField({
    super.key,
    required this.selectedPlatformId,
    required this.onChanged,
    required this.platforms,
    this.onPlatformsChanged,
  });

  @override
  State<PlatformPickerField> createState() => _PlatformPickerFieldState();
}

class _PlatformPickerFieldState extends State<PlatformPickerField> {
  static const _createNewValue = '__create_platform__';

  Future<void> _createPlatform() async {
    final nameController = TextEditingController();
    final urlController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouvelle plateforme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Nom *', border: OutlineInputBorder()),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: urlController,
              decoration: const InputDecoration(labelText: 'Site web (optionnel)', border: OutlineInputBorder()),
              keyboardType: TextInputType.url,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Créer')),
        ],
      ),
    );
    if (ok != true || nameController.text.trim().isEmpty || !mounted) return;
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final created = await ApiService.createPlatform(
        name: nameController.text.trim(),
        url: urlController.text.trim().isEmpty ? null : urlController.text.trim(),
        token: token,
      );
      widget.onPlatformsChanged?.call();
      widget.onChanged(created['id']?.toString());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Plateforme « ${nameController.text.trim()} » créée')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = <DropdownMenuItem<String?>>[
      const DropdownMenuItem<String?>(value: null, child: Text('— Aucune / non renseignée')),
      ...widget.platforms.map((p) {
        final id = p['id']?.toString() ?? '';
        final name = p['name']?.toString() ?? 'Plateforme';
        final isMine = p['userId'] != null;
        return DropdownMenuItem<String?>(
          value: id,
          child: Text(isMine ? '$name (perso)' : name),
        );
      }),
      const DropdownMenuItem<String?>(
        value: _createNewValue,
        child: Text('+ Ajouter une plateforme…'),
      ),
    ];

    return DropdownButtonFormField<String?>(
      value: widget.selectedPlatformId,
      decoration: const InputDecoration(
        labelText: 'Plateforme utilisée',
        border: OutlineInputBorder(),
        helperText: 'LinkedIn, Indeed… ou une plateforme que vous créez',
      ),
      items: items,
      onChanged: (v) {
        if (v == _createNewValue) {
          _createPlatform();
          return;
        }
        widget.onChanged(v);
      },
    );
  }
}

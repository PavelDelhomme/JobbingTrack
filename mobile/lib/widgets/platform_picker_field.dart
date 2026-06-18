import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

/// Sélection d'une plateforme (liste système + perso) via bottom sheet.
class PlatformPickerField extends StatelessWidget {
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

  String _labelFor(String? id) {
    if (id == null || id.isEmpty) return '— Aucune / non renseignée';
    final match = platforms.where((p) => p['id']?.toString() == id).toList();
    if (match.isEmpty) return 'Plateforme sélectionnée';
    final name = match.first['name']?.toString() ?? 'Plateforme';
    return match.first['userId'] != null ? '$name (perso)' : name;
  }

  Future<void> _createPlatform(BuildContext context) async {
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
    if (ok != true || nameController.text.trim().isEmpty) return;
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final created = await ApiService.createPlatform(
        name: nameController.text.trim(),
        url: urlController.text.trim().isEmpty ? null : urlController.text.trim(),
        token: token,
      );
      onPlatformsChanged?.call();
      onChanged(created['id']?.toString());
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Plateforme « ${nameController.text.trim()} » créée')),
        );
      }
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Unique') || msg.contains('unique') || msg.contains('409')) {
        final existing = platforms.firstWhere(
          (p) => (p['name']?.toString().toLowerCase() ?? '') == nameController.text.trim().toLowerCase(),
          orElse: () => {},
        );
        if (existing.isNotEmpty) {
          onChanged(existing['id']?.toString());
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Plateforme « ${nameController.text.trim()} » déjà existante — sélectionnée')),
            );
          }
          return;
        }
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  Future<void> _openPicker(BuildContext context) async {
    final picked = await showModalBottomSheet<String?>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: scrollSafePadding(ctx, top: 0),
          children: [
            ListTile(
              leading: const Icon(Icons.clear),
              title: const Text('Aucune / non renseignée'),
              onTap: () => Navigator.pop(ctx, '__none__'),
            ),
            ...platforms.map((p) {
              final id = p['id']?.toString() ?? '';
              final name = p['name']?.toString() ?? 'Plateforme';
              return ListTile(
                leading: const Icon(Icons.public),
                title: Text(p['userId'] != null ? '$name (perso)' : name),
                trailing: selectedPlatformId == id ? const Icon(Icons.check_circle, color: Colors.green) : null,
                onTap: () => Navigator.pop(ctx, id),
              );
            }),
            ListTile(
              leading: Icon(Icons.add, color: Colors.green.shade700),
              title: const Text('Ajouter une plateforme…'),
              onTap: () => Navigator.pop(ctx, '__create__'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || picked == null) return;
    if (picked == '__create__') {
      await _createPlatform(context);
      return;
    }
    onChanged(picked == '__none__' ? null : picked);
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _openPicker(context),
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Plateforme utilisée',
          border: OutlineInputBorder(),
          helperText: 'LinkedIn, Indeed… ou une plateforme que vous créez',
          suffixIcon: Icon(Icons.public),
        ),
        child: Text(
          _labelFor(selectedPlatformId),
          style: TextStyle(
            fontWeight: selectedPlatformId != null ? FontWeight.w600 : FontWeight.normal,
            color: selectedPlatformId != null ? null : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }
}

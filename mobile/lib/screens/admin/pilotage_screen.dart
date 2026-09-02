import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_hub_leading.dart';
import 'package:url_launcher/url_launcher.dart';

/// Miroir mobile du suivi pilotage.
/// Les décisions OK/KO se font sur le Pilotage **web HTTPS**.
class PilotageScreen extends StatelessWidget {
  const PilotageScreen({super.key});

  static const _apk = '1.0.33+33';
  static const _activeId = 'B2-D.6';
  static const _activeLabel = 'FAB Relance';
  static const _phase = 'B — Gate pré-prod mobile';

  /// Canonique HTTPS (proxy 5443) — pas localhost:5003.
  static final _pilotageWebUri = Uri.parse(
    'https://jobbingtrack.localhost:5443/backoffice/pilotage',
  );

  static const _queue = <(String, String, bool)>[
    ('B2-D.6', 'FAB Relance', true),
    ('B2-D.7', 'FAB Appel', false),
    ('B2-D.8', 'FAB Entretien', false),
    ('B2-D.9', 'FAB Contact', false),
    ('B2-E.10', 'Re-tap Candidatures', false),
    ('B2-E.11', 'FAB contact onglet', false),
    ('B2-F.12', 'Double retour Accueil', false),
  ];

  static const _recent = <String>[
    'B2-B.3 USER drawer sans Administration',
    'B2-B.4 Impersonnaliser → hub',
    'B2-C.5 Relances + fix ShellTabRegistry',
  ];

  Future<void> _openWebPilotage(BuildContext context) async {
    final ok = await launchUrl(_pilotageWebUri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      await Clipboard.setData(ClipboardData(text: _pilotageWebUri.toString()));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('URL Pilotage HTTPS copiée — ouvrir sur le PC'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pilotage'),
        centerTitle: true,
        leading: const AdminHubLeading(),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'VOUS ÊTES ICI',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onTertiaryContainer,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$_activeId — $_activeLabel',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(_phase, style: theme.textTheme.bodyMedium),
                  Text('APK $_apk', style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => _openWebPilotage(context),
              icon: const Icon(Icons.open_in_browser),
              label: const Text('Valider sur Pilotage web (HTTPS)'),
            ),
            const SizedBox(height: 8),
            Text(
              'Décisions OK / KO / PARTIEL / Plus tard : uniquement via\n'
              'https://jobbingtrack.localhost:5443/backoffice/pilotage\n'
              '(pas http://localhost:5003 — provoque ERR_SSL si forcé en https)',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            Text('File B2', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._queue.map((e) {
              final (id, label, active) = e;
              return ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  active ? Icons.play_arrow : Icons.schedule,
                  color: active ? theme.colorScheme.tertiary : theme.colorScheme.onSurfaceVariant,
                ),
                title: Text('$id — $label'),
                subtitle: Text(active ? 'en cours' : 'en attente'),
              );
            }),
            const SizedBox(height: 16),
            Text('Récemment terminé', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._recent.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('• $r', style: theme.textTheme.bodyMedium),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

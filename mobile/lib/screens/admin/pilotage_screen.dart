import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_hub_leading.dart';

/// Miroir mobile du suivi pilotage (source docs/pilotage/suivi-actif.json).
/// Mettre à jour les constantes quand le point actif change.
class PilotageScreen extends StatelessWidget {
  const PilotageScreen({super.key});

  static const _apk = '1.0.31+31';
  static const _activeId = 'B2-D.6';
  static const _activeLabel = 'FAB Relance';
  static const _phase = 'B — Gate pré-prod mobile';

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
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'VOUS ÊTES ICI',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Colors.amber.shade900,
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
                  color: active ? Colors.amber.shade800 : Colors.grey,
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
            const SizedBox(height: 20),
            Text(
              'Détail : TODOS.md → TODOS_A_TESTER.md → DONE. '
              'Validation porteur : TODOS_A_VALIDER.md. '
              'Web : /backoffice/pilotage',
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
            ),
          ],
        ),
      ),
    );
  }
}

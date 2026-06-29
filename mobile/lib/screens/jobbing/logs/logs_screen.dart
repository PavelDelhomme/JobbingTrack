import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Logs système : consultation complète sur le backoffice web.
class LogsScreen extends StatelessWidget {
  const LogsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Logs'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(Icons.article_outlined, size: 64, color: Colors.amber.shade700),
          const SizedBox(height: 16),
          Text(
            'Logs applicatifs',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Sur le backoffice web : menu Administration → Mobile — erreurs & retours '
            '(signalements manuels + erreurs auto-remontées). '
            'Les logs Docker des services restent sous Administration → Services & Logs.',
            style: TextStyle(color: Colors.grey.shade700, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('Sur mobile'),
              subtitle: Text(
                'Paramètres → Aide et retours → Signaler un bug (diagnostic + capture). '
                'Les crashs et erreurs API sont remontés automatiquement si la télémétrie est activée.',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

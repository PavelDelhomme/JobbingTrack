import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Générateur de données de test : action sensible réservée au backoffice web.
class TestDataScreen extends StatelessWidget {
  const TestDataScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Données de test'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(Icons.science_outlined, size: 64, color: Colors.deepPurple.shade300),
          const SizedBox(height: 16),
          Text(
            'Générateur de données',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'La génération et la purge de données de test (candidatures fictives, jeux de démo) '
            'sont disponibles sur le backoffice web (Administration → Données de test).',
            style: TextStyle(color: Colors.grey.shade700, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.warning_amber_outlined, color: Colors.orange),
              title: const Text('Action sensible'),
              subtitle: Text(
                'Ces opérations modifient la base de données. Elles ne sont pas exposées sur mobile '
                'pour éviter les suppressions accidentelles.',
                style: TextStyle(color: Colors.grey.shade600, height: 1.35),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

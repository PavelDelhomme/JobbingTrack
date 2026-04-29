import 'package:flutter/material.dart';

import 'package:jobbingtrack_mobile/widgets/back_to_home_scope.dart';

/// Écran Événements & Rappels (mobile).
/// À connecter à l'API event-service (GET /api/v1/events) avec token.
/// Fonctionnalités prévues : calendrier, liste des événements, rappels locaux ou push.
class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  static void _goToHome(BuildContext context) {
    Navigator.of(context).popUntil((Route<dynamic> route) =>
        route.settings.name == '/home' || route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return BackToHomeScope(
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => _goToHome(context),
          ),
          title: const Text('Événements & Rappels'),
          actions: [
            IconButton(
              icon: const Icon(Icons.calendar_today),
              onPressed: () {
                // TODO: Ouvrir vue calendrier
              },
            ),
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () {
                // TODO: Créer un événement (API POST /api/v1/events)
              },
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
              Icon(Icons.event_note, size: 64, color: Colors.blue[300]),
              const SizedBox(height: 16),
              Text(
                'Événements & Rappels',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Calendrier, entretiens, relances et rappels.\n'
                'À connecter à l\'API /api/v1/events (event-service).',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () {
                  // TODO: Charger les événements (GET /api/v1/events)
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Charger les événements'),
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_hub_leading.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  static const _tools = <(IconData, String, Color, String)>[
    (Icons.people_alt, 'Utilisateurs', Color(0xFF6366F1), '/users'),
    (Icons.explore, 'Pilotage', Color(0xFFD97706), '/admin/pilotage'),
    (Icons.analytics, 'Analytics', Color(0xFF14B8A6), '/analytics'),
    (Icons.speed, 'Performances', Color(0xFF64748B), '/performance'),
    (Icons.article, 'Logs', Color(0xFFF59E0B), '/logs'),
    (Icons.bar_chart, 'Statistiques', Color(0xFF8B5CF6), '/statistics'),
    (Icons.delete_outline, 'Corbeille', Color(0xFFEF4444), '/trash'),
    (Icons.science, 'Donnees test', Color(0xFF06B6D4), '/test-data'),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Administration'),
        centerTitle: true,
        leading: const AdminHubLeading(),
        actions: [MobileNotificationCenter()],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Outils d\'administration',
                style: context.sectionTitleStyle,
              ),
              const SizedBox(height: 4),
              Text(
                'Hub admin — même compte que le backoffice web',
                style: context.captionMuted,
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                children: [
                  for (final tool in _tools)
                    _AdminToolCard(
                      icon: tool.$1,
                      title: tool.$2,
                      accent: tool.$3,
                      route: tool.$4,
                      surface: cs.surfaceContainerHighest,
                      onSurface: cs.onSurface,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminToolCard extends StatelessWidget {
  const _AdminToolCard({
    required this.icon,
    required this.title,
    required this.accent,
    required this.route,
    required this.surface,
    required this.onSurface,
  });

  final IconData icon;
  final String title;
  final Color accent;
  final String route;
  final Color surface;
  final Color onSurface;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: surface,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).pushNamed(route),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: 0.35)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, size: 28, color: accent),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

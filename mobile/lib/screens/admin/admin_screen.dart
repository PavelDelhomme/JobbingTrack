import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_hub_leading.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.grey[800]),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                children: [
                  _buildCard(context, Icons.people_alt, 'Utilisateurs', Colors.indigo[600]!, '/users'),
                  _buildCard(context, Icons.explore, 'Pilotage', Colors.brown[600]!, '/admin/pilotage'),
                  _buildCard(context, Icons.analytics, 'Analytics', Colors.teal[600]!, '/analytics'),
                  _buildCard(context, Icons.speed, 'Performances', Colors.blueGrey[700]!, '/performance'),
                  _buildCard(context, Icons.article, 'Logs', Colors.amber[600]!, '/logs'),
                  _buildCard(context, Icons.bar_chart, 'Statistiques', Colors.deepPurple[600]!, '/statistics'),
                  _buildCard(context, Icons.delete_outline, 'Corbeille', Colors.red[600]!, '/trash'),
                  _buildCard(context, Icons.science, 'Donnees test', Colors.cyan[600]!, '/test-data'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard(BuildContext context, IconData icon, String title, Color color, String route) {
    return GestureDetector(
      onTap: () => Navigator.of(context).pushNamed(route),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: Colors.white),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

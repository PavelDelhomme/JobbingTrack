import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final appProvider = Provider.of<ApplicationProvider>(context, listen: false);
    await appProvider.loadApplications();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    switch (index) {
      case 0:
        // Déjà sur l'accueil
        break;
      case 1:
        Navigator.of(context).pushNamed('/applications');
        break;
      case 2:
        Navigator.of(context).pushNamed('/companies');
        break;
      case 3:
        Navigator.of(context).pushNamed('/contacts');
        break;
      case 4:
        Navigator.of(context).pushNamed('/interviews');
        break;
      case 5:
        Navigator.of(context).pushNamed('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final appProvider = Provider.of<ApplicationProvider>(context);
    final user = authProvider.user;
    final applications = appProvider.applications;

    return Scaffold(
      appBar: AppBar(
        title: Text('Bonjour ${user?.firstName ?? ''} 👋'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
          IconButton(
            onPressed: () async {
              await authProvider.logout();
              if (mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Salutation et description
                Text(
                  'Gérez vos candidatures en un coup d\'œil',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),

                const SizedBox(height: 24),

                // Statistiques
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        '${applications.length}',
                        'Candidatures',
                        Colors.blue,
                        Icons.assignment,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildStatCard(
                        '${applications.where((app) => app.status == 'INTERVIEW_SCHEDULED').length}',
                        'Entretiens',
                        Colors.green,
                        Icons.event_available,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Actions rapides
                Text(
                  'Actions rapides',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),

                const SizedBox(height: 16),

                // Grille d'actions
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  children: [
                    _buildActionCard(
                      '📝',
                      'Candidatures',
                      Colors.blue[600]!,
                      () => Navigator.of(context).pushNamed('/applications'),
                    ),
                    _buildActionCard(
                      '🏢',
                      'Entreprises',
                      Colors.purple[600]!,
                      () => Navigator.of(context).pushNamed('/companies'),
                    ),
                    _buildActionCard(
                      '👤',
                      'Contacts',
                      Colors.green[600]!,
                      () => Navigator.of(context).pushNamed('/contacts'),
                    ),
                    _buildActionCard(
                      '📅',
                      'Entretiens',
                      Colors.orange[600]!,
                      () => Navigator.of(context).pushNamed('/interviews'),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Menu administrateur pour les super admins
                if (user?.role == 'SUPER_ADMIN') ...[
                  Text(
                    'Administration',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[800],
                    ),
                  ),

                  const SizedBox(height: 16),

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    children: [
                      _buildActionCard(
                        '👥',
                        'Utilisateurs',
                        Colors.indigo[600]!,
                        () => Navigator.of(context).pushNamed('/users'),
                      ),
                      _buildActionCard(
                        '📊',
                        'Analytics',
                        Colors.teal[600]!,
                        () => Navigator.of(context).pushNamed('/analytics'),
                      ),
                      _buildActionCard(
                        '📋',
                        'Logs',
                        Colors.amber[600]!,
                        () => Navigator.of(context).pushNamed('/logs'),
                      ),
                      _buildActionCard(
                        '🔍',
                        'Recherche',
                        Colors.cyan[600]!,
                        () => Navigator.of(context).pushNamed('/search'),
                      ),
                      _buildActionCard(
                        '📈',
                        'Statistiques',
                        Colors.deepPurple[600]!,
                        () => Navigator.of(context).pushNamed('/statistics'),
                      ),
                      _buildActionCard(
                        '🗑️',
                        'Corbeille',
                        Colors.red[600]!,
                        () => Navigator.of(context).pushNamed('/trash'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),

      // Bottom Navigation
      bottomNavigationBar: BottomNavigationBar(
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.assignment),
            label: 'Candidatures',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.business),
            label: 'Entreprises',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people),
            label: 'Contacts',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.event),
            label: 'Entretiens',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Colors.blue[600],
        unselectedItemColor: Colors.grey[400],
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }

  Widget _buildStatCard(String value, String label, Color? color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 32,
            color: color,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(String emoji, String title, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: 32),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

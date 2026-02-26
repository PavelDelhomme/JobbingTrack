import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.blue[700]!,
                  Colors.blue[500]!,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?.firstName.substring(0, 1).toUpperCase() ?? 'U',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[700],
                ),
              ),
            ),
            accountName: Text(
              '${user?.firstName ?? ''} ${user?.lastName ?? ''}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            accountEmail: Text(
              user?.email ?? '',
              style: const TextStyle(
                fontSize: 14,
              ),
            ),
          ),

          // Navigation principale
          _buildDrawerSection(
            context,
            title: 'NAVIGATION',
            items: [
              _DrawerItem(
                icon: Icons.home,
                title: 'Accueil',
                route: '/home',
              ),
              _DrawerItem(
                icon: Icons.assignment,
                title: 'Candidatures',
                route: '/applications',
              ),
              _DrawerItem(
                icon: Icons.business,
                title: 'Entreprises',
                route: '/companies',
              ),
              _DrawerItem(
                icon: Icons.people,
                title: 'Contacts',
                route: '/contacts',
              ),
              _DrawerItem(
                icon: Icons.event,
                title: 'Entretiens',
                route: '/interviews',
              ),
              _DrawerItem(
                icon: Icons.phone,
                title: 'Appels',
                route: '/calls',
              ),
              _DrawerItem(
                icon: Icons.schedule_send,
                title: 'Relances',
                route: '/followups',
              ),
              _DrawerItem(
                icon: Icons.calendar_month,
                title: 'Événements & Rappels',
                route: '/events',
              ),
            ],
          ),

          const Divider(),

          // Analytics et statistiques
          if (user?.role == 'SUPER_ADMIN' || user?.role == 'ADMIN')
            _buildDrawerSection(
              context,
              title: 'ADMINISTRATION',
              items: [
                _DrawerItem(
                  icon: Icons.analytics,
                  title: 'Analytics',
                  route: '/analytics',
                ),
                _DrawerItem(
                  icon: Icons.bar_chart,
                  title: 'Statistiques',
                  route: '/statistics',
                ),
                _DrawerItem(
                  icon: Icons.people_alt,
                  title: 'Utilisateurs',
                  route: '/users',
                ),
                _DrawerItem(
                  icon: Icons.article,
                  title: 'Logs',
                  route: '/logs',
                ),
              _DrawerItem(
                icon: Icons.delete_outline,
                title: 'Corbeille',
                route: '/trash',
              ),
              ],
            ),

          const Divider(),

          // Paramètres et profil
          _buildDrawerSection(
            context,
            title: 'COMPTE',
            items: [
              _DrawerItem(
                icon: Icons.person,
                title: 'Profil',
                route: '/profile',
              ),
              _DrawerItem(
                icon: Icons.settings,
                title: 'Paramètres',
                route: '/settings',
              ),
            ],
          ),

          const Divider(),

          // Déconnexion
          ListTile(
            leading: Icon(Icons.logout, color: Colors.red[600]),
            title: Text(
              'Déconnexion',
              style: TextStyle(
                color: Colors.red[600],
                fontWeight: FontWeight.w600,
              ),
            ),
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Déconnexion'),
                  content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Annuler'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                      child: const Text('Déconnexion'),
                    ),
                  ],
                ),
              );

              if (confirm == true && context.mounted) {
                await authProvider.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/login');
                }
              }
            },
          ),

          // Version de l'app
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Version 1.0.0',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerSection(
    BuildContext context, {
    required String title,
    required List<_DrawerItem> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
        ),
        ...items.map((item) => _buildDrawerTile(context, item)),
      ],
    );
  }

  Widget _buildDrawerTile(BuildContext context, _DrawerItem item) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final isSelected = currentRoute == item.route;

    return ListTile(
      leading: Icon(
        item.icon,
        color: isSelected ? Colors.blue[700] : Colors.grey[700],
      ),
      title: Text(
        item.title,
        style: TextStyle(
          color: isSelected ? Colors.blue[700] : Colors.grey[800],
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      selectedTileColor: Colors.blue[50],
      onTap: () {
        Navigator.of(context).pop(); // Fermer le drawer
        if (!isSelected) {
          Navigator.of(context).pushNamed(item.route);
        }
      },
    );
  }
}

class _DrawerItem {
  final IconData icon;
  final String title;
  final String route;

  _DrawerItem({
    required this.icon,
    required this.title,
    required this.route,
  });
}


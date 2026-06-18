import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  bool _interimMode = false;

  @override
  void initState() {
    super.initState();
    _loadInterimMode();
  }

  Future<void> _loadInterimMode() async {
    final enabled = await ApiConfigStore.loadInterimModeEnabled();
    if (mounted) setState(() => _interimMode = enabled);
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final isAdmin = AdminAccess.canAccessAdmin(user);

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
              if (_interimMode)
                _DrawerItem(
                  icon: Icons.business_center,
                  title: 'Intérim',
                  route: '/interim',
                ),
              _DrawerItem(
                icon: Icons.search,
                title: 'Recherche globale',
                route: '/search',
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

          // Administration — visible uniquement pour comptes admin autorisés
          if (isAdmin)
            _buildDrawerSection(
              context,
              title: 'ADMINISTRATION',
              items: [
                _DrawerItem(
                  icon: Icons.admin_panel_settings,
                  title: 'Hub administration',
                  route: '/admin',
                ),
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
                Navigator.of(context).pop(); // Fermer le drawer d'abord
                if (context.mounted) {
                  await authProvider.logout();
                  if (context.mounted) {
                    Navigator.of(context).pushNamedAndRemoveUntil(
                      '/login',
                      (Route<dynamic> route) => false,
                    );
                  }
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
      onTap: () => ShellNavigation.navigateFromDrawer(context, item.route),
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


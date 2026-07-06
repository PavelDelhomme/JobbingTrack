import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/app_version_info.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';
import 'package:jobbingtrack_mobile/utils/auth_logout.dart';
import 'package:jobbingtrack_mobile/widgets/impersonation_banner.dart';

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  bool _interimMode = false;
  String? _appVersion;

  @override
  void initState() {
    super.initState();
    _loadInterimMode();
    _loadAppVersion();
  }

  Future<void> _loadAppVersion() async {
    final version = await AppVersionInfo.get();
    if (!mounted) return;
    setState(() => _appVersion = version);
  }

  Future<void> _loadInterimMode() async {
    final enabled = await ApiConfigStore.loadInterimModeEnabled();
    if (!mounted || enabled == _interimMode) return;
    setState(() => _interimMode = enabled);
  }

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInterimMode());
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final isAdmin = AdminAccess.canAccessAdmin(user);
    final isImpersonating = authProvider.isImpersonating;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          if (isImpersonating)
            Material(
              color: Colors.orange.shade50,
              child: ListTile(
                leading: Icon(Icons.switch_account, color: Colors.orange.shade900),
                title: Text(
                  'Désimpersonnaliser',
                  style: TextStyle(
                    color: Colors.orange.shade900,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text('Retour à la session administrateur'),
                onTap: () async {
                  Navigator.of(context).pop();
                  await ImpersonationBanner.exitAndRestoreAdminSession(context);
                },
              ),
            ),
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
                (user?.firstName.isNotEmpty == true
                        ? user!.firstName.substring(0, 1)
                        : 'U')
                    .toUpperCase(),
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[700],
                ),
              ),
            ),
            accountName: Text(
              '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim(),
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
            onDetailsPressed: () =>
                ShellNavigation.navigateFromDrawer(context, '/profile'),
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
                icon: Icons.settings,
                title: 'Paramètres',
                route: '/settings',
              ),
              _DrawerItem(
                icon: Icons.mark_email_read_outlined,
                title: 'Agent email',
                route: '/email-agent',
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
              await AuthLogout.confirmAndPerform(context);
              if (context.mounted) Navigator.of(context).pop();
            },
          ),

          // Version de l'app (pubspec + build natif)
          if (_appVersion != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                'Version $_appVersion',
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


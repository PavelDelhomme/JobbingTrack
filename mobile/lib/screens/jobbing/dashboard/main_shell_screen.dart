import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/applications_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calendar/events_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/home_dashboard_tab.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/profile_screen.dart';

/// Shell principal : 4 onglets (Accueil, Candidatures, Calendrier, Profil).
/// La recherche globale reste dans la barre du haut — pas dans la navigation basse.
class MainShellScreen extends StatefulWidget {
  final int initialTab;
  final int applicationsTabIndex;
  final String? applicationStatusFilter;
  final int? returnTabOnBack;

  const MainShellScreen({
    super.key,
    this.initialTab = 0,
    this.applicationsTabIndex = 0,
    this.applicationStatusFilter,
    this.returnTabOnBack,
  });

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  late int _selectedIndex;
  late int _applicationsTabIndex;
  String? _applicationStatusFilter;
  int? _previousTabIndex;
  int? _pendingReturnTab;
  int _applicationsResetEpoch = 0;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialTab.clamp(0, 3);
    _applicationsTabIndex = widget.applicationsTabIndex;
    _applicationStatusFilter = widget.applicationStatusFilter;
    _pendingReturnTab = widget.returnTabOnBack;
    _syncShellRegistry();
  }

  void _syncShellRegistry() {
    ShellTabRegistry.setCurrentTab(
      _selectedIndex,
      applicationsSubTab: _applicationsTabIndex,
    );
  }

  void _selectTab(int index, {int? previousIndex}) {
    if (index == _selectedIndex) return;
    ShellDrawerRegistry.closeAllDrawers();
    setState(() {
      _previousTabIndex = previousIndex ?? _selectedIndex;
      _selectedIndex = index;
      _pendingReturnTab = null;
      _syncShellRegistry();
    });
  }

  void _openApplications({required int tabIndex, String? statusFilter}) {
    ShellDrawerRegistry.closeAllDrawers();
    setState(() {
      _previousTabIndex = _selectedIndex;
      _selectedIndex = 1;
      _applicationsTabIndex = tabIndex;
      _applicationStatusFilter = statusFilter;
      _pendingReturnTab = null;
      _syncShellRegistry();
    });
  }

  void _handleSystemBack() {
    final target = _pendingReturnTab ?? _previousTabIndex;
    if (target != null && target != _selectedIndex) {
      setState(() {
        _selectedIndex = target.clamp(0, 3);
        _previousTabIndex = null;
        _pendingReturnTab = null;
        _syncShellRegistry();
      });
      return;
    }
    if (_selectedIndex != 0) {
      setState(() {
        _selectedIndex = 0;
        _syncShellRegistry();
      });
    }
  }

  void _reselectApplicationsTab() {
    ShellDrawerRegistry.closeAllDrawers();
    Navigator.of(context).popUntil((route) => route.isFirst);
    setState(() {
      _applicationsTabIndex = 0;
      _applicationStatusFilter = null;
      _applicationsResetEpoch++;
      _syncShellRegistry();
    });
  }

  void _onBottomNavTap(int index) {
    if (index == 1 && _selectedIndex == 1) {
      _reselectApplicationsTab();
      return;
    }
    _selectTab(index);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _selectedIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleSystemBack();
      },
      child: Scaffold(
        body: Column(
          children: [
            Consumer<AuthProvider>(
              builder: (context, auth, _) {
                if (!auth.isImpersonating) return const SizedBox.shrink();
                final email = auth.user?.email ?? '';
                return MaterialBanner(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  backgroundColor: Colors.orange.shade100,
                  content: Text('Mode diagnostic — connecté en tant que $email'),
                  actions: [
                    TextButton(
                      onPressed: () async {
                        await auth.exitImpersonation();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Retour session admin')),
                          );
                        }
                      },
                      child: const Text('Quitter'),
                    ),
                  ],
                );
              },
            ),
            Expanded(
              child: IndexedStack(
                index: _selectedIndex,
                children: [
            HomeDashboardTab(
              isShellVisible: _selectedIndex == 0,
              onOpenApplications: ({required applicationsTabIndex, statusFilter}) {
              _openApplications(tabIndex: applicationsTabIndex, statusFilter: statusFilter);
            }),
            ApplicationsScreen(
              key: ValueKey('apps-$_applicationsResetEpoch-$_applicationsTabIndex-${_applicationStatusFilter ?? ''}'),
              initialTabIndex: _applicationsTabIndex,
              statusFilter: _applicationStatusFilter,
              isShellVisible: _selectedIndex == 1,
            ),
            const EventsScreen(),
            const ProfileScreen(),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            currentIndex: _selectedIndex,
            selectedItemColor: Colors.blue[600],
            unselectedItemColor: Colors.grey[400],
            onTap: _onBottomNavTap,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Accueil'),
              BottomNavigationBarItem(icon: Icon(Icons.assignment), label: 'Candidatures'),
              BottomNavigationBarItem(icon: Icon(Icons.calendar_month), label: 'Calendrier'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profil'),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
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
    setState(() {
      _previousTabIndex = previousIndex ?? _selectedIndex;
      _selectedIndex = index;
      _pendingReturnTab = null;
      _syncShellRegistry();
    });
  }

  void _openApplications({required int tabIndex, String? statusFilter}) {
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

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _selectedIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleSystemBack();
      },
      child: Scaffold(
        body: IndexedStack(
          index: _selectedIndex,
          children: [
            HomeDashboardTab(
              isShellVisible: _selectedIndex == 0,
              onOpenApplications: ({required applicationsTabIndex, statusFilter}) {
              _openApplications(tabIndex: applicationsTabIndex, statusFilter: statusFilter);
            }),
            ApplicationsScreen(
              key: ValueKey('apps-$_applicationsTabIndex-${_applicationStatusFilter ?? ''}'),
              initialTabIndex: _applicationsTabIndex,
              statusFilter: _applicationStatusFilter,
              isShellVisible: _selectedIndex == 1,
            ),
            const EventsScreen(),
            const ProfileScreen(),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            currentIndex: _selectedIndex,
            selectedItemColor: Colors.blue[600],
            unselectedItemColor: Colors.grey[400],
            onTap: (index) => _selectTab(index),
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

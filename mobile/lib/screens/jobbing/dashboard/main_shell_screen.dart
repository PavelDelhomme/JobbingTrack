import 'package:flutter/material.dart';
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

  const MainShellScreen({
    super.key,
    this.initialTab = 0,
    this.applicationsTabIndex = 0,
    this.applicationStatusFilter,
  });

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  late int _selectedIndex;
  late int _applicationsTabIndex;
  String? _applicationStatusFilter;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialTab.clamp(0, 3);
    _applicationsTabIndex = widget.applicationsTabIndex;
    _applicationStatusFilter = widget.applicationStatusFilter;
  }

  void _openApplications({required int tabIndex, String? statusFilter}) {
    setState(() {
      _selectedIndex = 1;
      _applicationsTabIndex = tabIndex;
      _applicationStatusFilter = statusFilter;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _selectedIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _selectedIndex != 0) {
          setState(() => _selectedIndex = 0);
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _selectedIndex,
          children: [
            HomeDashboardTab(onOpenApplications: ({required applicationsTabIndex, statusFilter}) {
              _openApplications(tabIndex: applicationsTabIndex, statusFilter: statusFilter);
            }),
            ApplicationsScreen(
              key: ValueKey('apps-$_applicationsTabIndex-${_applicationStatusFilter ?? ''}'),
              initialTabIndex: _applicationsTabIndex,
              statusFilter: _applicationStatusFilter,
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
            onTap: (index) => setState(() => _selectedIndex = index),
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

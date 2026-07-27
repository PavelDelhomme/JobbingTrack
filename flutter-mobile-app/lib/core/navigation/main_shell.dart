import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/applications/applications_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/dashboard/home_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/interviews/interviews_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/users/profile_screen.dart';

/// Shell principal : IndexedStack pour réutiliser les onglets sans rebuild complet.
class MainShell extends StatefulWidget {
  const MainShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late int _index;

  static const _tabs = <_ShellTab>[
    _ShellTab(label: 'Accueil', icon: Icons.home, child: HomeScreen()),
    _ShellTab(
      label: 'Candidatures',
      icon: Icons.assignment,
      child: ApplicationsScreen(embedded: true),
    ),
    _ShellTab(
      label: 'Entretiens',
      icon: Icons.event,
      child: InterviewsScreen(embedded: true),
    ),
    _ShellTab(
      label: 'Profil',
      icon: Icons.person,
      child: ProfileScreen(embedded: true),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, _tabs.length - 1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [for (final t in _tabs) t.child],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        onTap: (i) => setState(() => _index = i),
        items: [
          for (final t in _tabs)
            BottomNavigationBarItem(icon: Icon(t.icon), label: t.label),
        ],
      ),
    );
  }
}

class _ShellTab {
  const _ShellTab({
    required this.label,
    required this.icon,
    required this.child,
  });

  final String label;
  final IconData icon;
  final Widget child;
}

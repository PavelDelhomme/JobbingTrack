import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_flutter/core/navigation/app_routes.dart';
import 'package:jobbingtrack_flutter/core/navigation/main_shell.dart';
import 'package:jobbingtrack_flutter/core/theme/app_theme.dart';
import 'package:jobbingtrack_flutter/providers/application_provider.dart';
import 'package:jobbingtrack_flutter/providers/auth_provider.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/applications/applications_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/auth/login_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/companies/companies_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/contacts/contacts_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/interviews/interviews_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/users/profile_screen.dart';

class JobbingTrackApp extends StatelessWidget {
  const JobbingTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ApplicationProvider()),
      ],
      child: MaterialApp(
        title: 'JobbingTrack',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        initialRoute: AppRoutes.login,
        routes: {
          AppRoutes.login: (_) => const LoginScreen(),
          AppRoutes.shell: (_) => const MainShell(),
          AppRoutes.applications: (_) => const ApplicationsScreen(),
          AppRoutes.companies: (_) => const CompaniesScreen(),
          AppRoutes.contacts: (_) => const ContactsScreen(),
          AppRoutes.interviews: (_) => const InterviewsScreen(),
          AppRoutes.profile: (_) => const ProfileScreen(),
        },
      ),
    );
  }
}

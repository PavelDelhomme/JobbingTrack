import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/screens/login_screen.dart';
import 'package:jobbingtrack_mobile/screens/register_screen.dart';
import 'package:jobbingtrack_mobile/screens/home_screen.dart';
import 'package:jobbingtrack_mobile/screens/applications_screen.dart';
import 'package:jobbingtrack_mobile/screens/companies_screen.dart';
import 'package:jobbingtrack_mobile/screens/contacts_screen.dart';
import 'package:jobbingtrack_mobile/screens/interviews_screen.dart';
import 'package:jobbingtrack_mobile/screens/profile_screen.dart';
import 'package:jobbingtrack_mobile/screens/settings_screen.dart';
import 'package:jobbingtrack_mobile/screens/analytics_screen.dart';
import 'package:jobbingtrack_mobile/screens/logs_screen.dart';
import 'package:jobbingtrack_mobile/screens/search_screen.dart';
import 'package:jobbingtrack_mobile/screens/statistics_screen.dart';
import 'package:jobbingtrack_mobile/screens/test_data_screen.dart';
import 'package:jobbingtrack_mobile/screens/trash_screen.dart';
import 'package:jobbingtrack_mobile/screens/users_screen.dart';
import 'package:jobbingtrack_mobile/screens/followups_screen.dart';
import 'package:jobbingtrack_mobile/screens/events_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const JobbingTrackMobileApp());
}

class JobbingTrackMobileApp extends StatelessWidget {
  const JobbingTrackMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ApplicationProvider()),
        ChangeNotifierProvider(create: (_) => CompanyProvider()),
        ChangeNotifierProvider(create: (_) => ContactProvider()),
        ChangeNotifierProvider(create: (_) => InterviewProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => FollowUpProvider()),
      ],
      child: MaterialApp(
        title: 'JobbingTrack Mobile',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          fontFamily: 'Inter',
        ),
        home: const LoginScreen(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/home': (context) => const HomeScreen(),
          '/applications': (context) => const ApplicationsScreen(),
          '/companies': (context) => const CompaniesScreen(),
          '/contacts': (context) => const ContactsScreen(),
          '/interviews': (context) => const InterviewsScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/analytics': (context) => const AnalyticsScreen(),
          '/logs': (context) => const LogsScreen(),
          '/search': (context) => const SearchScreen(),
          '/statistics': (context) => const StatisticsScreen(),
          '/test-data': (context) => const TestDataScreen(),
          '/trash': (context) => const TrashScreen(),
          '/users': (context) => const UsersScreen(),
          '/followups': (context) => const FollowUpsScreen(),
          '/events': (context) => const EventsScreen(),
        },
      ),
    );
  }
}

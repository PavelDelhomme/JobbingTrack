import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/login_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/register_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/home_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/applications_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/companies_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contacts_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interviews_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/profile_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/settings_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/analytics_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/logs/logs_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/search/search_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/statistics_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/test_data/test_data_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/trash/trash_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/users_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followups_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/calls_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calendar/events_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/forgot_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/reset_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/verify_email_screen.dart';
import 'package:jobbingtrack_mobile/screens/admin/admin_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  try {
    CrashReporter.initialize();
  } catch (e, st) {
    debugPrint('[APP] CrashReporter init error (ignored): $e\n$st');
  }
  debugPrint('[APP] Démarrage JobbingTrack Mobile');

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
        navigatorObservers: [MobileAnalyticsRouteObserver()],
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          // Pas de fontFamily : Inter n'est pas dans pubspec → crash au lancement sur Android si on le met
        ),
        home: const _SplashScreen(),
        onGenerateRoute: (settings) {
          // /reset-password/:token
          if (settings.name != null && settings.name!.startsWith('/reset-password/')) {
            final token = settings.name!.replaceFirst('/reset-password/', '');
            return MaterialPageRoute(
              builder: (context) => ResetPasswordScreen(token: token),
              settings: settings,
            );
          }
          // /verify-email, /verify-email/:token ou URL complète avec ?token= (lien email)
          if (settings.name != null && (settings.name!.startsWith('/verify-email') || settings.name!.contains('verify-email'))) {
            String? token;
            final path = settings.name!;
            if (path.startsWith('/verify-email/') && path.length > '/verify-email/'.length && !path.contains('?')) {
              token = path.substring('/verify-email/'.length).split('?').first;
            } else if (path.contains('token=')) {
              try {
                final uri = path.startsWith('http') ? Uri.tryParse(path) : Uri.tryParse('http://dummy$path');
                token = uri?.queryParameters['token'];
              } catch (_) {}
            }
            return MaterialPageRoute(
              builder: (context) => VerifyEmailScreen(token: token),
              settings: settings,
            );
          }
          return null;
        },
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
          '/home': (context) => const HomeScreen(),
          '/applications': (context) => const ApplicationsScreen(),
          '/application-form': (context) => const ApplicationFormScreen(),
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
          '/calls': (context) => const CallsScreen(),
          '/events': (context) => const EventsScreen(),
          '/admin': (context) => const AdminScreen(),
        },
      ),
    );
  }
}

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  String _status = 'Connexion...';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    debugPrint('[SPLASH] Vérification API...');
    try {
      await ApiService.autoDetectApi();
    } catch (e, st) {
      debugPrint('[SPLASH] autoDetectApi error (continuing): $e\n$st');
    }
    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final restored = await auth.restoreSession();
    await MobileAnalyticsService.instance.initialize(authToken: auth.token);
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(restored ? '/home' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset(
                  'assets/branding/jobbingtrack-logo.png',
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  semanticLabel: 'Logo JobbingTrack',
                ),
              ),
              const SizedBox(height: 16),
              Text('JobbingTrack', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue[800])),
              const SizedBox(height: 24),
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(_status, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
            ],
          ),
        ),
      ),
    );
  }
}

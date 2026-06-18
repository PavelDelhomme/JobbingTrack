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
import 'package:jobbingtrack_mobile/navigation/shell_navigation.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/settings_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/analytics_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/logs/logs_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/search/search_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/dashboard/statistics_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/test_data/test_data_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/trash/trash_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/users_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/calls_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/forgot_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/reset_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/verify_email_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/auth/biometric_unlock_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interim/interim_screen.dart';
import 'package:jobbingtrack_mobile/screens/admin/admin_screen.dart';
import 'package:jobbingtrack_mobile/widgets/admin_guard.dart';
import 'package:jobbingtrack_mobile/utils/locale_init.dart';
import 'package:jobbingtrack_mobile/services/biometric_auth_service.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

Route<dynamic>? resolveAppRoute(RouteSettings settings) {
  if (settings.name != null && settings.name!.startsWith('/reset-password/')) {
    final token = settings.name!.replaceFirst('/reset-password/', '');
    return MaterialPageRoute(
      builder: (context) => ResetPasswordScreen(token: token),
      settings: settings,
    );
  }
  if (settings.name != null &&
      (settings.name!.startsWith('/verify-email') || settings.name!.contains('verify-email'))) {
    String? token;
    final path = settings.name!;
    if (path.startsWith('/verify-email/') &&
        path.length > '/verify-email/'.length &&
        !path.contains('?')) {
      token = path.substring('/verify-email/'.length).split('?').first;
    } else {
      try {
        final uri = path.contains('://')
            ? Uri.tryParse(path)
            : Uri.tryParse(path.contains('?') ? 'jobbingtrack://verify-email$path' : 'jobbingtrack://verify-email/$path');
        token = uri?.queryParameters['token'];
        if ((token == null || token.isEmpty) && path.contains('/verify-email/')) {
          final parts = path.split('/verify-email/');
          if (parts.length > 1) token = parts.last.split('?').first;
        }
      } catch (_) {}
    }
    return MaterialPageRoute(
      builder: (context) => VerifyEmailScreen(token: token),
      settings: settings,
    );
  }
  return null;
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initAppLocale();
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
        initialRoute: '/',
        onGenerateInitialRoutes: (String initialRouteName) {
          if (initialRouteName != '/' && initialRouteName.isNotEmpty) {
            final generated = resolveAppRoute(RouteSettings(name: initialRouteName));
            if (generated != null) {
              return [generated];
            }
          }
          return [
            MaterialPageRoute(builder: (context) => const _SplashScreen()),
          ];
        },
        onGenerateRoute: resolveAppRoute,
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
          '/home': (context) => ShellNavigation.buildShell(context),
          '/applications': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/applications'),
              ),
          '/companies': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/companies'),
              ),
          '/contacts': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/contacts'),
              ),
          '/interviews': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/interviews'),
              ),
          '/followups': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/followups'),
              ),
          '/events': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/events'),
              ),
          '/profile': (context) => ShellNavigation.buildShell(
                context,
                fallback: ShellNavigation.argsForRoute('/profile'),
              ),
          '/application-form': (context) => const ApplicationFormScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/analytics': (context) => const AdminGuard(child: AnalyticsScreen()),
          '/logs': (context) => const AdminGuard(child: LogsScreen()),
          '/search': (context) => const SearchScreen(),
          '/statistics': (context) => const AdminGuard(child: StatisticsScreen()),
          '/test-data': (context) => const AdminGuard(child: TestDataScreen()),
          '/trash': (context) => const AdminGuard(child: TrashScreen()),
          '/users': (context) => const AdminGuard(child: UsersScreen()),
          '/calls': (context) => const CallsScreen(),
          '/interim': (context) => const InterimScreen(),
          '/biometric-unlock': (context) => const BiometricUnlockScreen(),
          '/admin': (context) => const AdminGuard(child: AdminScreen()),
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
    if (restored) {
      final bio = await ApiConfigStore.loadBiometricUnlockEnabled();
      final keep = await ApiConfigStore.loadKeepLoggedIn();
      if (bio && keep && await BiometricAuthService.isAvailable()) {
        Navigator.of(context).pushReplacementNamed('/biometric-unlock');
        return;
      }
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
    }
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
